import { rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");

// Public SDK source is bundled into the CLI, so prerelease source builds do
// not depend on an unpublished workspace at runtime. Native and third-party
// dependencies stay external. No private core/UI files participate in the build.
const external = Object.keys(pkg.dependencies ?? {}).filter(
  (dep) => dep !== "@liquidlm/sdk",
);

await rm("dist", { recursive: true, force: true });

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  external,
  // Resolve the SDK to its TypeScript source so a fresh checkout can bundle
  // the CLI before the SDK's own dist/ exists (alphabetical workspace builds
  // run cli before sdk).
  alias: {
    "@liquidlm/sdk": new URL("../sdk/src/index.ts", import.meta.url).pathname,
  },
  logLevel: "info",
});
