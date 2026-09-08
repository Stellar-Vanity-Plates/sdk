// Generate public TypeScript models and method maps from checked-in Soroban specs.
const names = ["nft", "deployer", "marketplace", "treasury", "rbac"];
type Type = string | { [key: string]: unknown };
function ts(type: Type): string {
  if (typeof type === "string") {
    const primitive: Record<string, string> = {
      address: "string",
      muxed_address: "string",
      string: "string",
      symbol: "string",
      bytes: "Uint8Array",
      bool: "boolean",
      u32: "number",
      i32: "number",
      u64: "bigint",
      i64: "bigint",
      u128: "bigint",
      i128: "bigint",
      u256: "bigint",
      i256: "bigint",
      void: "void",
      val: "unknown",
      error: "unknown",
      timepoint: "bigint",
      duration: "bigint",
    };
    if (!primitive[type]) throw new Error(`Unsupported type ${type}`);
    return primitive[type];
  }
  if ("udt" in type) return (type.udt as { name: string }).name;
  if ("bytes_n" in type) return "Uint8Array";
  if ("option" in type) {
    return `(${
      ts((type.option as { value_type: Type }).value_type)
    } | undefined)`;
  }
  if ("vec" in type) {
    return `Array<${ts((type.vec as { element_type: Type }).element_type)}>`;
  }
  if ("map" in type) {
    const value = type.map as { key_type: Type; value_type: Type };
    return `Map<${ts(value.key_type)}, ${ts(value.value_type)}>`;
  }
  if ("tuple" in type) {
    return `[${
      (type.tuple as { value_types: Type[] }).value_types.map(ts).join(", ")
    }]`;
  }
  throw new Error(`Unsupported spec type ${JSON.stringify(type)}`);
}
function comment(text: string): string {
  return (text.split(/\\n|\n/)[0] || "Contract field.").replaceAll("*/", "* /");
}
for (const name of names) {
  const { schema } = JSON.parse(
    await Deno.readTextFile(`src/contracts/specs/${name}.json`),
  );
  const title = name === "nft" ? "Nft" : name[0].toUpperCase() + name.slice(1);
  const lines = [
    "/** Generated from the public Soroban specification. Regenerate with tools/generate-clients.ts. @module */",
  ];
  for (const entry of schema) {
    const struct = entry.udt_struct_v0;
    if (struct) {
      lines.push(
        `/** ${
          comment(struct.doc || struct.name + " contract record.")
        } */\nexport interface ${struct.name} {`,
      );
      for (const field of struct.fields) {
        lines.push(
          `/** ${
            comment(field.doc || field.name.replaceAll("_", " ") + ".")
          } */\n${field.name}: ${ts(field.type)};`,
        );
      }
      lines.push("}");
    }
    const union = entry.udt_union_v0;
    if (union) {
      const cases = union.cases.map(
        (
          item: {
            void_v0?: { name: string };
            tuple_v0?: { name: string; type: Type[] };
          },
        ) => {
          if (item.void_v0) {
            return `{ tag: ${
              JSON.stringify(item.void_v0.name)
            }; values?: undefined }`;
          }
          if (item.tuple_v0) {
            return `{ tag: ${JSON.stringify(item.tuple_v0.name)}; values: [${
              item.tuple_v0.type.map(ts).join(", ")
            }] }`;
          }
          throw new Error("Unknown union case");
        },
      );
      lines.push(
        `/** ${
          comment(union.doc || union.name + " contract variants.")
        } */\nexport type ${union.name} = ${cases.join(" | ")};`,
      );
    }
    const enumeration = entry.udt_enum_v0;
    if (enumeration) {
      lines.push(
        `/** ${
          comment(enumeration.doc || enumeration.name)
        } */\nexport type ${enumeration.name} = ${
          enumeration.cases.map((item: { value: number }) => item.value).join(
            " | ",
          )
        };`,
      );
    }
  }
  lines.push(
    `/** Exact method arguments and decoded simulation results for the ${name} contract. */\nexport interface ${title}Methods {`,
  );
  for (const entry of schema) {
    const fn = entry.function_v0;
    if (!fn || fn.name === "__constructor") continue;
    const args = fn.inputs.map((input: { name: string; type: Type }) =>
      `${input.name}: ${ts(input.type)}`
    ).join("; ");
    const result = fn.outputs.length ? fn.outputs.map(ts).join(" | ") : "void";
    lines.push(
      `/** ${
        comment(fn.doc || fn.name.replaceAll("_", " ") + ".")
      } */\n${fn.name}: { args: ${
        args ? `{ ${args} }` : "Record<string, never>"
      }; result: ${result} };`,
    );
  }
  lines.push("}");
  await Deno.mkdir("src/contracts/generated", { recursive: true });
  await Deno.writeTextFile(
    `src/contracts/generated/${name}.ts`,
    lines.join("\n") + "\n",
  );
  console.log(`${name} types generated`);
}
