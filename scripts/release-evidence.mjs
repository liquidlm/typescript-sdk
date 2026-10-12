import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";

assert.ok(process.env.npm_execpath, "Run through npm run release:prepare");
const npm = (args) =>
  execFileSync(process.execPath, [process.env.npm_execpath, ...args], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });

const root = process.cwd(),
  output = resolve("artifacts");
mkdirSync(output, { recursive: true });
const lockBytes = readFileSync("package-lock.json");
const lock = JSON.parse(lockBytes);
const dependencies = [];
const notices = [];
for (const [path, pkg] of Object.entries(lock.packages)) {
  if (!path || pkg.link) continue;
  if (!pkg.license)
    throw new Error(`Review missing license identifier: ${path}`);
  dependencies.push({
    path,
    version: pkg.version,
    license: pkg.license,
    development: pkg.dev ?? false,
    optional: pkg.optional ?? false,
  });
  const location = join(root, path);
  if (!existsSync(location)) continue; // Other-platform optional package; metadata stays in inventory.
  for (const file of readdirSync(location).filter((name) =>
    /^(?:licen[cs]e|copying|notice)(?:\..*)?$/i.test(name),
  )) {
    const content = readFileSync(join(location, file), "utf8");
    notices.push({ package: path, version: pkg.version, file, text: content });
  }
}
writeFileSync(
  join(output, "dependency-licenses.json"),
  JSON.stringify(dependencies, null, 2) + "\n",
);
writeFileSync(
  join(output, "installed-license-texts.json"),
  JSON.stringify(notices, null, 2) + "\n",
);
const sbom = npm(["sbom", "--sbom-format", "cyclonedx", "--package-lock-only"]);
writeFileSync(join(output, "dependencies.cdx.json"), sbom);
const packages = JSON.parse(
  readFileSync(join(output, "package-report.json"), "utf8"),
);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = {
  format: 1,
  node: process.version,
  npm: npm(["--version"]).trim(),
  zlib: process.versions.zlib,
  platform: process.platform,
  arch: process.arch,
  lockSha256: hash(lockBytes),
  contractSha256: hash(readFileSync("packages/sdk/contract/openapi.json")),
  packages: packages.map((pkg) => ({
    name: pkg.name,
    version: pkg.version,
    filename: pkg.filename,
    integrity: pkg.integrity,
    sha256: hash(readFileSync(join(output, pkg.filename))),
    tarSha256: hash(gunzipSync(readFileSync(join(output, pkg.filename)))),
  })),
  notice:
    "Local build evidence; not a signed provenance attestation or publication approval.",
};
writeFileSync(
  join(output, "release-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Prepared evidence for ${packages.length} archives and ${dependencies.length} dependency entries; nothing published`,
);
