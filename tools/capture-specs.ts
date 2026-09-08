// Explicit maintainer action: reads public Wasm specs, never submits transactions.
import { Contract, type ContractId, NetworkConfig } from "@colibri/core";
const path = Deno.args[0];
if (!path) throw new Error("Pass a public deployment manifest path.");
const manifest = JSON.parse(await Deno.readTextFile(path));
const networkConfig = NetworkConfig.CustomNet({
  networkPassphrase: manifest.networkPassphrase,
  rpcUrl: manifest.rpcUrl,
});
await Deno.mkdir("src/contracts/specs", { recursive: true });
for (const [name, id] of Object.entries(manifest.contracts)) {
  if (!/^[a-z]+$/.test(name)) throw new Error("Invalid contract name");
  const contract = new Contract({
    networkConfig,
    contractConfig: { contractId: id as ContractId },
  });
  await contract.loadSpecFromNetwork();
  const entries = contract.getSpec().entries;
  const json = JSON.parse(JSON.stringify(entries));
  const xdr = entries.map((entry) =>
    btoa(String.fromCharCode(...entry.toXdr()))
  );
  const wasmHash = contract.getWasmHash();
  await Deno.writeTextFile(
    `src/contracts/specs/${name}.json`,
    JSON.stringify(
      {
        contractId: id,
        networkPassphrase: manifest.networkPassphrase,
        wasmHash,
        entries: xdr,
        schema: json,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `${name}: ${contract.getSpec().funcs().length} functions captured`,
  );
}
