import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { IncompatibleContractSpecError } from "@sdk";
import {
  ColibriError,
  type Contract,
  NetworkConfig,
  SorobanType,
  type TransactionConfig,
} from "@colibri/core";
import { Spec } from "@stellar/stellar-sdk/contract";
import { xdr } from "@stellar/stellar-sdk";
import {
  assertCompatibleSpec,
  createProtocolClients,
  Deployer,
  Marketplace,
  Nft,
  NftClient,
  NftErrors,
  NftSpec,
  Plate,
  Rbac,
  Treasury,
} from "@/contracts/index.ts";
import config from "@examples/testnet.json" with { type: "json" };
const network = NetworkConfig.TestNet();
Deno.test("contract ABI checks reject missing methods and changed signatures", () => {
  const spec = NftSpec;
  assertCompatibleSpec(spec, spec);
  const changed = spec.entries.filter((e) =>
    e.type !== "scSpecEntryFunctionV0" ||
    e.functionV0?.name.toString() !== "owner_of"
  );
  assertThrows(() => assertCompatibleSpec(spec, new Spec(changed)));
  assertThrows(() =>
    new NftClient({ networkConfig: network, contractId: "invalid" })
  );
});
Deno.test("clients encode real ABI values and enforce an explicit Colibri invocation boundary", async () => {
  const clients = createProtocolClients(network, config.contracts);
  assertEquals(Object.keys(clients).length, 5);
  const client = clients.nft;
  const args = client.contract.getSpec().funcArgsToScVals("owner_of", {
    token_id: 42n,
  });
  assertEquals(
    args[0].toXdr("base64"),
    SorobanType.U256.from(42n).toScVal().toXdr("base64"),
  );
  let initialized = 0, reads = 0, writes = 0;
  client.contract.loadSpecFromNetwork = () => {
    initialized++;
    return Promise.resolve();
  };
  const contract: Contract = client.contract;
  contract.read = ({ method, methodArgs }) => {
    reads++;
    assertEquals(method, "owner_of");
    assertEquals(methodArgs, { token_id: 42n });
    return Promise.resolve(config.contracts.deployer);
  };
  const tx: TransactionConfig = {
    source: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    fee: { max: "1000000" },
    timeout: 60,
    signers: [],
  };
  contract.invoke = ({ method, methodArgs, config: actual }) => {
    writes++;
    assertEquals(method, "transfer");
    assertEquals(actual, tx);
    assertEquals(methodArgs, {
      from: config.contracts.deployer,
      to: config.contracts.marketplace,
      token_id: 42n,
    });
    return Promise.reject(new Error("submission deliberately intercepted"));
  };
  assertEquals(
    await client.read("owner_of", { token_id: 42n }),
    config.contracts.deployer,
  );
  assertEquals(writes, 0);
  await assertRejects(
    () =>
      client.invoke("transfer", {
        from: config.contracts.deployer,
        to: config.contracts.marketplace,
        token_id: 42n,
      }, { config: tx }),
    Error,
    "deliberately intercepted",
  );
  assertEquals(initialized, 1);
  assertEquals(reads, 1);
  assertEquals(writes, 1);
  assert(clients.treasury.contract.getSpec().funcs().length > 30);
});

Deno.test("facades own all five generated clients and expose ABI errors and events", () => {
  const clients = createProtocolClients(network, config.contracts);
  assert(clients.nft.contract instanceof Nft);
  assert(clients.deployer.contract instanceof Deployer);
  assert(clients.marketplace.contract instanceof Marketplace);
  assert(clients.treasury.contract instanceof Treasury);
  assert(clients.rbac.contract instanceof Rbac);
  assert(
    Object.values(NftErrors).some((error) =>
      error.message.includes("SuffixMismatch")
    ),
  );
  assertEquals(
    clients.nft.contract.events.CharacterCountChanged.toEventFilter()
      .toRawEventFilter().contractIds,
    [config.contracts.nft],
  );
  const claim = Plate.from({
    controller: config.contracts.nft,
    salt: new Uint8Array(32),
    character_count: 3,
  });
  assertEquals(Plate.fromScVal(claim.toScVal()).value, claim.value);
});

Deno.test("generated methods decode real ScVals and retain submission metadata without resubmitting on decode failure", async () => {
  const client = new NftClient({
    networkConfig: network,
    contractId: config.contracts.nft,
  });
  // Replace the owned pipelines at the offline test boundary. Convee's real
  // callable facade has immutable methods and is not monkey-patched.
  const readPipeline = {
    run: (): Promise<xdr.ScVal> =>
      Promise.resolve(SorobanType.U256.from(42n).toScVal()),
  };
  Object.defineProperty(client.contract, "readPipe", { value: readPipeline });
  assertEquals(
    await client.contract.balance.read({ owner: config.contracts.nft }),
    42n,
  );
  // Wrapped arguments use Colibri's validated encoding path.
  readPipeline.run = () => Promise.resolve(xdr.ScVal.scvString("Plate"));
  const { read } = client.contract.name;
  assertEquals(await read(), "Plate");
  readPipeline.run = () => Promise.resolve(SorobanType.U256.from(7n).toScVal());
  assertEquals(
    await client.contract.mint.read({
      salt: SorobanType.BytesN(32).from(new Uint8Array(32)),
    }),
    7n,
  );
  let submissions = 0;
  const receipt: Awaited<ReturnType<Contract["invoke"]>> = {
    hash: "synthetic-receipt",
    ledger: 1,
    createdAt: 0,
    returnValue: SorobanType.U256.from(7n).toScVal(),
    response: {} as Awaited<ReturnType<Contract["invoke"]>>["response"],
  };
  const tx: TransactionConfig = {
    source: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    fee: "100",
    timeout: 60,
    signers: [],
  };
  const invokePipeline = {
    run: (input: Parameters<Contract["invokePipe"]["run"]>[0]) => {
      submissions++;
      assertEquals(input.config, tx);
      return Promise.resolve(receipt);
    },
  };
  Object.defineProperty(client.contract, "invokePipe", {
    value: invokePipeline,
  });
  const result = await client.contract.mint.invoke({
    methodArgs: { salt: new Uint8Array(32) },
    config: tx,
  });
  assertEquals(result.value, 7n);
  assertEquals(result.hash, receipt.hash);
  receipt.returnValue = xdr.ScVal.scvString("invalid u256");
  const error = await assertRejects(() =>
    client.contract.mint.invoke({
      methodArgs: { salt: new Uint8Array(32) },
      config: tx,
    })
  );
  assert(ColibriError.is(error));
  assertEquals(error.code, "CONTR_021");
  assertEquals(submissions, 2);
});

Deno.test("SDK compatibility failures block calls and failed initialization can be retried", async () => {
  const client = new NftClient({
    networkConfig: network,
    contractId: config.contracts.nft,
  });
  const expected = client.contract.getSpec();
  const missing = new Spec(
    expected.entries.filter((entry) =>
      entry.type !== "scSpecEntryFunctionV0" ||
      entry.value.name.toString() !== "owner_of"
    ),
  );
  let loads = 0, calls = 0;
  client.contract.loadSpecFromNetwork = () => {
    loads++;
    return Promise.resolve();
  };
  client.contract.getSpec = () => loads === 1 ? missing : expected;
  const contract: Contract = client.contract;
  contract.read = () => {
    calls++;
    return Promise.resolve(config.contracts.nft);
  };
  await assertRejects(
    () => client.read("owner_of", { token_id: 42n }),
    IncompatibleContractSpecError,
  );
  assertEquals(calls, 0);
  assertEquals(
    await client.read("owner_of", { token_id: 42n }),
    config.contracts.nft,
  );
  assertEquals(loads, 2);
  assertEquals(calls, 1);
});
