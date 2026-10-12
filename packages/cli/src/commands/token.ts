import { Command } from "commander";
import { getToken, getCredentials, isLoggedIn } from "../auth.js";

export function registerTokenCommands(program: Command): void {
  const token = program.command("token").description("Work with API tokens");

  token
    .command("export")
    .description(
      "Print the current short-lived access token (mirrors your session)",
    )
    .option("--shell", "Emit `export LIQUIDLM_API_TOKEN=<token>` for `eval`")
    .option("--json", "Emit JSON { access_token, expires_at }")
    .action(async (opts: { shell?: boolean; json?: boolean }) => {
      if (!isLoggedIn()) {
        console.error("Not logged in. Run `liquidlm login` first.");
        process.exit(1);
      }

      let accessToken: string;
      try {
        // getToken refreshes if needed; its status logs go to stderr, so stdout
        // stays clean for piping / `eval`.
        accessToken = await getToken();
      } catch (err) {
        console.error(
          err instanceof Error ? err.message : "Failed to get token.",
        );
        process.exit(1);
      }

      const expiresAt = getCredentials()?.expires_at ?? null;

      if (opts.json) {
        process.stdout.write(
          JSON.stringify({ access_token: accessToken, expires_at: expiresAt }) +
            "\n",
        );
        return;
      }

      if (opts.shell) {
        process.stdout.write(`export LIQUIDLM_API_TOKEN=${accessToken}\n`);
        if (expiresAt) {
          process.stderr.write(
            `# Short-lived token; expires ${new Date(expiresAt).toISOString()}. Re-run to refresh.\n`,
          );
        }
        return;
      }

      process.stdout.write(accessToken + "\n");
    });
}
