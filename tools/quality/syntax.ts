/** Syntax inventory backed by the same Deno parser as the alias lint rule. */
export interface ModuleSyntax {
  imports: { specifier: string; line: number }[];
  problems: { rule: string; line: number; message: string }[];
  barrel: boolean;
  moduleDoc: boolean;
  registrations: number;
}

export function inspectModule(path: string, source: string): ModuleSyntax {
  const result: ModuleSyntax = {
    imports: [],
    problems: [],
    barrel: false,
    moduleDoc: false,
    registrations: 0,
  };
  const line = (node: Deno.lint.Node) =>
    source.slice(0, node.range[0]).split("\n").length;
  const problem = (node: Deno.lint.Node, rule: string, message: string) => {
    result.problems.push({ rule, line: line(node), message });
  };
  const dependency = (node: Deno.lint.Node, specifier: string) => {
    result.imports.push({ specifier, line: line(node) });
  };
  const member = (node: Deno.lint.Node): string => {
    if (node.type === "Identifier") return node.name;
    if (node.type !== "MemberExpression") return "";
    const property = node.computed
      ? node.property.type === "Literal" ? String(node.property.value) : ""
      : member(node.property);
    return `${member(node.object)}.${property}`;
  };
  try {
    Deno.lint.runPlugin(
      {
        name: "sdk-architecture",
        rules: {
          inventory: {
            create(context) {
              return {
                Program(node) {
                  result.barrel = node.body.every((statement) =>
                    statement.type === "ExportAllDeclaration" ||
                    (statement.type === "ExportNamedDeclaration" &&
                      statement.source !== null &&
                      statement.declaration === null)
                  );
                  result.moduleDoc = context.sourceCode.getAllComments().some(
                    (comment) => /@module\b/.test(comment.value),
                  );
                },
                ImportDeclaration(node) {
                  dependency(node, node.source.value);
                },
                ExportAllDeclaration(node) {
                  dependency(node, node.source.value);
                  if (node.exported?.name === "default") {
                    problem(
                      node,
                      "named-exports",
                      "Default exports are not allowed.",
                    );
                  }
                },
                ExportNamedDeclaration(node) {
                  if (node.source) dependency(node, node.source.value);
                  for (const specifier of node.specifiers) {
                    const name = specifier.exported.type === "Identifier"
                      ? specifier.exported.name
                      : specifier.exported.value;
                    if (name === "default") {
                      problem(
                        node,
                        "named-exports",
                        "Default re-exports are not allowed.",
                      );
                    }
                  }
                },
                ExportDefaultDeclaration(node) {
                  problem(
                    node,
                    "named-exports",
                    "Default exports are not allowed.",
                  );
                },
                ImportExpression(node) {
                  if (
                    node.source.type === "Literal" &&
                    typeof node.source.value === "string"
                  ) dependency(node, node.source.value);
                  else if (
                    node.source.type === "TemplateLiteral" &&
                    node.source.expressions.length === 0
                  ) dependency(node, node.source.quasis[0].cooked);
                  else {problem(
                      node,
                      "static-imports",
                      "Runtime imports must have statically reviewable targets.",
                    );}
                },
                TSImportType(node) {
                  if (
                    node.argument.type === "TSLiteralType" &&
                    node.argument.literal.type === "Literal" &&
                    typeof node.argument.literal.value === "string"
                  ) dependency(node, node.argument.literal.value);
                },
                TSExternalModuleReference(node) {
                  dependency(node, node.expression.value);
                  problem(
                    node,
                    "esm-imports",
                    "Use ESM imports instead of import-equals/require.",
                  );
                },
                CallExpression(node) {
                  const name = member(node.callee);
                  if (name === "require") {
                    problem(
                      node,
                      "esm-imports",
                      "Use ESM imports instead of require.",
                    );
                  }
                  if (
                    /^(Deno\.test|describe|it|test)\.(only|skip|ignore)$/.test(
                      name,
                    )
                  ) {
                    problem(
                      node,
                      "active-tests",
                      "Focused or skipped tests must not enter CI.",
                    );
                  }
                  if (!["Deno.test", "describe", "it", "test"].includes(name)) {
                    return;
                  }
                  result.registrations++;
                  for (const argument of node.arguments) {
                    if (argument.type !== "ObjectExpression") continue;
                    for (const property of argument.properties) {
                      if (property.type !== "Property") continue;
                      const key = property.key.type === "Identifier"
                        ? property.key.name
                        : property.key.type === "Literal"
                        ? property.key.value
                        : "";
                      if (
                        ["only", "ignore"].includes(String(key)) &&
                        !(property.value.type === "Literal" &&
                          property.value.value === false)
                      ) {
                        problem(
                          property,
                          "active-tests",
                          "Test only/ignore options must be literal false or omitted.",
                        );
                      }
                    }
                  }
                },
                NewExpression(node) {
                  if (
                    ["Error", "TypeError", "RangeError"].includes(
                      member(node.callee),
                    )
                  ) {
                    problem(
                      node,
                      "typed-errors",
                      "Construct VanityError for SDK-owned failures.",
                    );
                  }
                },
                ThrowStatement(node) {
                  if (
                    ["Literal", "TemplateLiteral"].includes(node.argument.type)
                  ) {
                    problem(
                      node,
                      "typed-errors",
                      "Do not throw untyped literals.",
                    );
                  }
                },
              };
            },
          },
        },
      },
      path,
      source,
    );
  } catch (error) {
    result.problems.push({
      rule: "parse",
      line: 1,
      message: `Cannot inspect module: ${String(error)}`,
    });
  }
  return result;
}
