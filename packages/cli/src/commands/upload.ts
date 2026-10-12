import { Command } from "commander";
import { readFileSync, statSync, readdirSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { guessMimeType } from "../file-types.js";
import { resolveVaultId } from "../resolve-vault.js";
import { uploadOne } from "../upload-helper.js";

/** Recursively collect all files under a path. */
function collectFiles(path: string, base?: string): string[] {
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  if (!stat.isDirectory()) return [];

  const root = base ?? path;
  const results: string[] = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue; // skip hidden files
    const full = join(path, entry.name);
    if (entry.isFile()) {
      results.push(full);
    } else if (entry.isDirectory()) {
      results.push(...collectFiles(full, root));
    }
  }
  return results;
}

export function registerUploadCommands(program: Command): void {
  program
    .command("upload <dir-id> <paths...>")
    .description("Upload files or folders to a vault")
    .action(async (idOrLabel: string, paths: string[]) => {
      const dirId = await resolveVaultId(idOrLabel);

      // Expand directories into individual files
      const filePaths: Array<{ path: string; key: string }> = [];
      for (const p of paths) {
        const stat = statSync(p, { throwIfNoEntry: false });
        if (!stat) {
          console.error(`Not found: ${p}`);
          continue;
        }
        if (stat.isFile()) {
          filePaths.push({ path: p, key: basename(p) });
        } else if (stat.isDirectory()) {
          for (const file of collectFiles(p)) {
            filePaths.push({ path: file, key: relative(p, file) });
          }
        }
      }

      let successCount = 0;
      let failCount = 0;

      for (const { path: filePath, key } of filePaths) {
        try {
          const fileData = readFileSync(filePath);
          await uploadOne(dirId, key, fileData, guessMimeType(key));
          console.log(`Uploaded: ${key}`);
          successCount++;
        } catch (err) {
          console.error(
            `Error uploading ${key}:`,
            err instanceof Error ? err.message : err,
          );
          failCount++;
        }
      }

      console.log(`\nDone: ${successCount} uploaded, ${failCount} failed.`);
      if (failCount > 0) {
        process.exit(1);
      }
    });
}
