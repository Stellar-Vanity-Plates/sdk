import { describe, it } from "@std/testing/bdd";
import {
  assertEquals,
  assertInstanceOf,
  assertStrictEquals,
} from "@std/assert";
import {
  Contract,
  CONTRACT_ERROR_MATCHER_PLUGIN_ID,
  type ContractErrorMap,
  createContractErrorMatcherPlugin,
  NetworkConfig,
  type TransactionConfig,
} from "@colibri/core";
import { Operation, xdr } from "@stellar/stellar-sdk";
import {
  Deployer,
  Marketplace,
  Nft,
  Rbac,
  Treasury,
} from "@/contracts/index.ts";
import { ProtocolClient } from "@/contracts/client.ts";
import { abiFixtures } from "@tests/fixtures/abi.ts";
import config from "@examples/testnet.json" with { type: "json" };

const networkConfig = NetworkConfig.TestNet();
const contractId = config.contracts.nft;
const transaction: TransactionConfig = {
  source: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  fee: "100",
  timeout: 60,
  signers: [],
};

describe("canonical generated clients", () => {
  for (const Client of [Nft, Deployer, Marketplace, Treasury, Rbac]) {
    describe(Client.name, () => {
      it("preserves custom pipelines and supports default, disabled and unbound error matching", () => {
        for (
          const errors of [undefined, false, {}, {
            999: { message: "custom" },
          }] as (ContractErrorMap | false | undefined)[]
        ) {
          for (const id of [contractId, undefined]) {
            const readPlugin = {
              ...createContractErrorMatcherPlugin({ 999: { message: "read" } }),
              id: "sdk-read-observer",
            };
            const invokePlugin = {
              ...createContractErrorMatcherPlugin({
                999: { message: "invoke" },
              }),
              id: "sdk-invoke-observer",
            };
            const client = new Client({
              networkConfig,
              errors,
              contractConfig: {
                ...(id ? { contractId: id } : { wasmHash: "00".repeat(32) }),
                plugins: { readPipe: [readPlugin], invokePipe: [invokePlugin] },
              },
            });
            assertInstanceOf(client, Contract);
            const enabled = errors === undefined ||
              errors !== false && Object.keys(errors).length > 0;
            for (
              const [pipeline, plugin] of [[client.readPipe, readPlugin], [
                client.invokePipe,
                invokePlugin,
              ]] as const
            ) {
              const plugins = pipeline.plugins as readonly { id: string }[];
              assertEquals(plugins.includes(plugin), true);
              assertEquals(
                plugins.filter((p) => p.id === CONTRACT_ERROR_MATCHER_PLUGIN_ID)
                  .length,
                enabled ? 1 : 0,
              );
            }
            assertEquals(client.getSpec().funcs().length > 0, true);
          }
        }
      });
      const client = new Client({
        networkConfig,
        contractConfig: { contractId },
      });
      const spec = client.getSpec();
      const fixtures = abiFixtures(spec);
      it("exposes its ABI event registry", () => {
        assertStrictEquals(client.events, client.events);
      });
      for (const fixture of fixtures) {
        it(`${fixture.name}: encodes arguments, decodes reads and preserves invocation receipts`, async () => {
          const fn = spec.getFunc(fixture.name);
          const returnValue = fn.outputs.length
            ? spec.nativeToScVal(fixture.result, fn.outputs[0])
            : xdr.ScVal.scvVoid();
          const expected = spec.funcResToNative(fixture.name, returnValue);
          let reads = 0, submissions = 0;
          Object.defineProperty(client, "readPipe", {
            configurable: true,
            value: {
              run(input: Parameters<Contract["readPipe"]["run"]>[0]) {
                reads++;
                assertEquals(
                  input.operations[0].toXDR("base64"),
                  Operation.invokeContractFunction({
                    contract: contractId,
                    function: fixture.name,
                    args: spec.funcArgsToScVals(fixture.name, fixture.args),
                    auth: [],
                  }).toXDR("base64"),
                );
                return Promise.resolve(returnValue);
              },
            },
          });
          const receipt = {
            hash: "receipt",
            ledger: 42,
            createdAt: 123,
            returnValue,
            response: {},
          };
          Object.defineProperty(client, "invokePipe", {
            configurable: true,
            value: {
              run(input: Parameters<Contract["invokePipe"]["run"]>[0]) {
                submissions++;
                assertEquals(
                  input.operations[0].toXDR("base64"),
                  Operation.invokeContractFunction({
                    contract: contractId,
                    function: fixture.name,
                    args: spec.funcArgsToScVals(fixture.name, fixture.args),
                    auth: [],
                  }).toXDR("base64"),
                );
                assertStrictEquals(input.config, transaction);
                return Promise.resolve(receipt);
              },
            },
          });
          const name = fixture.name === "deploy"
            ? "deployMethod"
            : fixture.name.replace(/_([a-z])/g, (_, c: string) =>
              c.toUpperCase());
          const helper = (client as unknown as Record<string, {
            read(args?: object): Promise<unknown>;
            invoke(args: object): Promise<Record<string, unknown>>;
          }>)[name];
          assertEquals(
            await helper.read(
              Object.keys(fixture.args).length ? fixture.args : undefined,
            ),
            expected,
          );
          const result = await helper.invoke({
            methodArgs: fixture.args,
            config: transaction,
            auth: [],
          });
          assertEquals(result, { ...receipt, value: expected });
          assertEquals([reads, submissions], [1, 1]);
        });
      }
    });
  }
  it("supports the generic facade constructor without a generated factory", () => {
    const entries = new Nft({ networkConfig, contractConfig: { contractId } })
      .getSpec().entries.map((entry) => entry.toXdr("base64"));
    const client = new ProtocolClient({ networkConfig, contractId }, entries);
    assertInstanceOf(client.contract, Contract);
    assertEquals(client.contract.getContractId(), contractId);
  });
});
