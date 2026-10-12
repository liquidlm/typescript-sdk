import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Run after build. Inspect the actual archives, not just npm's dry-run output.
const destination = resolve("artifacts");
mkdirSync(destination, { recursive: true });
const report = [];
assert.ok(process.env.npm_execpath, "Run through npm run package:check");
for (const workspace of ["@liquidlm/sdk", "@liquidlm/cli"]) {
  const [pack] = JSON.parse(
    execFileSync(
      process.execPath,
      [
        process.env.npm_execpath,
        "pack",
        `--workspace=${workspace}`,
        "--ignore-scripts",
        "--json",
        `--pack-destination=${destination}`,
      ],
      { encoding: "utf8" },
    ),
  );
  const archive = resolve(destination, pack.filename);
  const paths = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim()
    .split("\n");
  for (const path of paths) {
    assert.match(
      path,
      /^package\/(?:dist\/[^/]+\.(?:js|d\.ts)|contract\/(?:manifest|openapi)\.json|docs\/[A-Z_]+\.md|examples\/(?:synthetic\.ts|tsconfig\.json)|package\.json|README\.md|LICENSE)$/,
    );
    assert.doesNotMatch(path, /\.map$|\.test\.|\.env|\.git|\.\.\//);
    const content = execFileSync("tar", ["-xOzf", archive, path], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    assert.doesNotMatch(
      content,
      /@liquidlm\/(?:core|db|api|search|plans)\b|openapi\.internal\.json|\/Users\/|sourceMappingURL|arn\x3aaws:/,
    );
  }
  const metadata = JSON.parse(
    execFileSync("tar", ["-xOzf", archive, "package/package.json"], {
      encoding: "utf8",
    }),
  );
  for (const version of Object.values(metadata.dependencies ?? {}))
    assert.doesNotMatch(version, /^(?:file:|link:|workspace:)/);
  report.push({
    name: pack.name,
    version: pack.version,
    filename: pack.filename,
    integrity: pack.integrity,
    files: paths,
  });
}
writeFileSync(
  resolve(destination, "package-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `Inspected ${report.length} packed artifacts; archive allowlists and private-source checks passed`,
);
