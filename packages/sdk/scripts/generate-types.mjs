import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const raw = readFileSync(new URL("contract/openapi.json", root));
const pin = JSON.parse(
  readFileSync(new URL("contract/manifest.json", root), "utf8"),
);
const hash = createHash("sha256").update(raw).digest("hex");
if (hash !== pin.sha256)
  throw new Error(
    "Public OpenAPI checksum mismatch; review the contract before updating the pin",
  );
const spec = JSON.parse(raw);
const forbidden =
  /^api\.(ops|billing|feedback|account|orgs|admin|connectors)\./;
const methods = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "query",
]);
for (const [path, item] of Object.entries(spec.paths)) {
  if (/^\/(admin|ops|billing|stripe|internal)(\/|$)/.test(path))
    throw new Error(`Private path: ${path}`);
  for (const [method, op] of Object.entries(item)) {
    if (!methods.has(method)) continue;
    // The public contract explicitly includes the authenticated caller profile.
    const publicException = method === "get" && path === "/auth/me";
    if (
      !publicException &&
      (forbidden.test(op["x-liquidlm-action"] ?? "") ||
        op["x-liquidlm-bearer-class"] === "session-only")
    )
      throw new Error(`Private operation: ${method} ${path}`);
  }
}
function type(schema = {}) {
  if (schema === true) return "unknown";
  if (schema === false) return "never";
  if (schema.$ref) {
    const prefix = "#/components/schemas/";
    if (!schema.$ref.startsWith(prefix))
      throw new Error(`Non-local schema reference: ${schema.$ref}`);
    const name = schema.$ref
      .slice(prefix.length)
      .replaceAll("~1", "/")
      .replaceAll("~0", "~");
    if (!(name in spec.components.schemas))
      throw new Error(`Missing schema: ${name}`);
    return `Schemas[${JSON.stringify(name)}]`;
  }
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum)
    return schema.enum.map((v) => JSON.stringify(v)).join(" | ") || "never";
  if (schema.oneOf || schema.anyOf)
    return `(${(schema.oneOf ?? schema.anyOf).map(type).join(" | ")})`;
  if (schema.allOf) return `(${schema.allOf.map(type).join(" & ")})`;
  if (Array.isArray(schema.type))
    return schema.type.map((t) => type({ ...schema, type: t })).join(" | ");
  let value;
  switch (schema.type) {
    case "string":
      value = "string";
      break;
    case "integer":
    case "number":
      value = "number";
      break;
    case "boolean":
      value = "boolean";
      break;
    case "null":
      value = "null";
      break;
    case "array":
      value = `Array<${type(schema.items)}>`;
      break;
    case "object": {
      const required = new Set(schema.required ?? []);
      const props = Object.entries(schema.properties ?? {}).map(
        ([k, v]) =>
          `${JSON.stringify(k)}${required.has(k) ? "" : "?"}: ${type(v)};`,
      );
      // A broad index signature avoids contradicting named properties when
      // additionalProperties allows values with another shape.
      if (schema.additionalProperties !== false)
        props.push("[key: string]: unknown;");
      value = props.length ? `{ ${props.join(" ")} }` : "Record<string, never>";
      break;
    }
    default:
      value = schema.properties
        ? type({ ...schema, type: "object" })
        : "unknown";
  }
  return schema.nullable ? `(${value} | null)` : value;
}
const lines = [
  `// Generated from contract/openapi.json (${hash}); do not edit.`,
  "export interface Schemas {",
];
for (const [name, schema] of Object.entries(spec.components.schemas))
  lines.push(`  ${JSON.stringify(name)}: ${type(schema)};`);
lines.push("}", "export interface Operations {");
const seen = new Set();
for (const [path, item] of Object.entries(spec.paths))
  for (const [method, op] of Object.entries(item)) {
    if (!methods.has(method)) continue;
    const id = op.operationId;
    if (!id || seen.has(id))
      throw new Error(`Missing/duplicate operation ID: ${id}`);
    seen.add(id);
    const body = op.requestBody?.content?.["application/json"]?.schema;
    const success = Object.entries(op.responses ?? {})
      .filter(([status]) => /^2\d\d$/.test(status))
      .map(([, r]) => r.content?.["application/json"]?.schema)
      .filter(Boolean);
    const params = (op.parameters ?? []).filter(
      (p) => p.in === "path" || p.in === "query",
    );
    lines.push(
      `  ${JSON.stringify(id)}: { method: ${JSON.stringify(method.toUpperCase())}; path: ${JSON.stringify(path)}; body: ${body ? type(body) : "never"}; response: ${success.length ? success.map(type).join(" | ") : "unknown"}; parameters: { ${params.map((p) => `${JSON.stringify(p.name)}${p.required ? "" : "?"}: ${type(p.schema)};`).join(" ")} } };`,
    );
  }
lines.push("}", 'export type Vault = Schemas["Vault"];', "");
const operationMetadata = {};
for (const [path, item] of Object.entries(spec.paths))
  for (const [method, op] of Object.entries(item)) {
    if (methods.has(method))
      operationMetadata[op.operationId] = {
        method: method.toUpperCase(),
        path,
      };
  }
lines.push(
  `export const OPERATION_METADATA = ${JSON.stringify(operationMetadata, null, 2)} as const;`,
  "",
);
const result = lines.join("\n");
const out = new URL("src/generated.ts", root);
const reference = [
  "# Generated API reference",
  "",
  `Contract SHA-256: \`${hash}\`.`,
  "",
  "Generated from the reviewed public OpenAPI snapshot. Use the operation ID with",
  "`client.call(id, { parameters, body, options })`; exported `Operations` and",
  "`Schemas` provide the corresponding TypeScript types. A deployment may expose",
  "a subset of these operations; this inventory is not a self-host parity claim.",
  "",
  "| Operation ID | Method | API path | Parameters | JSON body |",
  "| --- | --- | --- | --- | --- |",
];
const cell = (value) =>
  String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
for (const [path, item] of Object.entries(spec.paths))
  for (const [method, op] of Object.entries(item)) {
    if (!methods.has(method)) continue;
    const params =
      (op.parameters ?? [])
        .filter((p) => p.in === "path" || p.in === "query")
        .map(
          (p) =>
            `\`${cell(p.name)}\` (${p.in}${p.required ? ", required" : ""})`,
        )
        .join(", ") || "—";
    const schema = op.requestBody?.content?.["application/json"]?.schema;
    const body = schema?.$ref
      ? `\`${cell(schema.$ref.split("/").at(-1))}\``
      : schema
        ? "Inline; see Operations type"
        : "—";
    reference.push(
      `| \`${cell(op.operationId)}\` | ${method.toUpperCase()} | \`${cell(path)}\` | ${params} | ${body} |`,
    );
  }
reference.push(
  "",
  "## Exported schemas",
  "",
  ...Object.keys(spec.components.schemas).map(
    (name) => `- \`Schemas[${JSON.stringify(name)}]\``,
  ),
  "",
);
const referenceText = reference.join("\n");
const referencePath = new URL("docs/API.md", root);
if (process.argv.includes("--check")) {
  if (readFileSync(out, "utf8") !== result)
    throw new Error(`Generated contract drift: ${fileURLToPath(out)}`);
  if (readFileSync(referencePath, "utf8") !== referenceText)
    throw new Error("Generated API reference drift");
  console.log(
    `Public contract verified: ${seen.size} operations, ${Object.keys(spec.components.schemas).length} schemas`,
  );
} else {
  writeFileSync(out, result);
  mkdirSync(new URL("docs/", root), { recursive: true });
  writeFileSync(referencePath, referenceText);
}
