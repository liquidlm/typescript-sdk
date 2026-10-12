import { Command } from "commander";
import { login, logout } from "../auth.js";

export function registerLoginCommands(program: Command): void {
  program
    .command("login")
    .description("Authenticate with LiquidLM (browser or manual token)")
    .action(async () => {
      try {
        await login();
      } catch (err) {
        console.error(
          "Login failed:",
          err instanceof Error ? err.message : err,
        );
        process.exit(1);
      }
    });

  program
    .command("logout")
    .description("Remove stored credentials")
    .action(() => {
      logout();
    });
}
