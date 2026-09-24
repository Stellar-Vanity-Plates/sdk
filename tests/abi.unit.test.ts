import { assertEquals } from "@std/assert";
import {
  DeployerSpec,
  MarketplaceSpec,
  NftSpec,
  RbacSpec,
  TreasurySpec,
} from "@/contracts/index.ts";
import { xdr } from "@stellar/stellar-sdk";
import config from "@examples/testnet.json" with { type: "json" };
type AbiType = string | {
  udt?: { name: string };
  bytes_n?: { n: number };
  option?: { value_type: AbiType };
  vec?: { element_type: AbiType };
  map?: { key_type: AbiType; value_type: AbiType };
  tuple?: { value_types: AbiType[] };
};
type Field = { name: string; type: AbiType };
type Entry = {
  function_v0?: { name: string; inputs: Field[] };
  udt_struct_v0?: { name: string; fields: Field[] };
  udt_union_v0?: {
    name: string;
    cases: {
      void_v0?: { name: string };
      tuple_v0?: { name: string; type: AbiType[] };
    }[];
  };
  udt_enum_v0?: { name: string; cases: { value: number }[] };
};
Deno.test("all 111 embedded callable methods encode representative values with the native ABI", () => {
  let count = 0;
  for (
    const spec of [
      NftSpec,
      DeployerSpec,
      MarketplaceSpec,
      TreasurySpec,
      RbacSpec,
    ]
  ) {
    const entries = JSON.parse(JSON.stringify(spec.entries)) as Entry[];
    const value = (type: AbiType): unknown => {
      if (typeof type === "string") {
        if (type === "address") return config.contracts.nft;
        if (type === "bool") return true;
        if (["u32", "i32"].includes(type)) return 1;
        if (/[ui](64|128|256)/.test(type)) return 1n;
        if (type === "bytes") return new Uint8Array([1, 2]);
        if (type === "val") return xdr.ScVal.scvVoid();
        if (type === "void") return undefined;
        if (type === "string" || type === "symbol") return "A";
        throw new Error(`Unhandled fixture type ${type}`);
      }
      if (type.bytes_n) return new Uint8Array(type.bytes_n.n);
      if (type.option) return value(type.option.value_type);
      if (type.vec) return [value(type.vec.element_type)];
      if (type.map) {
        return new Map([[
          value(type.map.key_type),
          value(type.map.value_type),
        ]]);
      }
      if (type.tuple) return type.tuple.value_types.map(value);
      if (type.udt) {
        const name = type.udt.name,
          entry = entries.find((e) =>
            (e.udt_struct_v0 ?? e.udt_union_v0 ?? e.udt_enum_v0)?.name === name
          )!;
        if (entry.udt_struct_v0) {
          return Object.fromEntries(
            entry.udt_struct_v0.fields.map((f) => [f.name, value(f.type)]),
          );
        }
        if (entry.udt_enum_v0) return entry.udt_enum_v0.cases[0].value;
        const variant = entry.udt_union_v0!.cases[0];
        return variant.void_v0 ? { tag: variant.void_v0.name } : {
          tag: variant.tuple_v0!.name,
          values: variant.tuple_v0!.type.map(value),
        };
      }
      throw new Error(`Unhandled ABI ${JSON.stringify(type)}`);
    };
    for (const entry of entries) {
      const fn = entry.function_v0;
      if (!fn || fn.name === "__constructor") continue;
      const args = Object.fromEntries(
        fn.inputs.map((field) => [field.name, value(field.type)]),
      );
      const encoded = spec.funcArgsToScVals(fn.name, args);
      assertEquals(encoded.length, fn.inputs.length, fn.name);
      for (const arg of encoded) {
        assertEquals(
          xdr.ScVal.fromXdr(arg.toXdr()).toXdr("base64"),
          arg.toXdr("base64"),
        );
      }
      count++;
    }
  }
  assertEquals(count, 111);
});
