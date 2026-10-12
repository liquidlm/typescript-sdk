#!/usr/bin/env node

import { Command } from "commander";
import { CLI_NAME, CLI_VERSION } from "./branding.js";
import { enableDebug } from "./debug.js";
import { registerLoginCommands } from "./commands/login.js";
import { registerWhoamiCommand } from "./commands/whoami.js";
import { registerOrgCommands } from "./commands/org.js";
import { registerConfigCommands } from "./commands/config.js";
import { registerTokenCommands } from "./commands/token.js";
import { registerMcpCommands } from "./commands/mcp.js";
import { registerSkillCommand } from "./commands/skill.js";
import { registerVaultsCommands } from "./commands/vaults.js";
import { registerSearchCommands } from "./commands/search.js";
import { registerUploadCommands } from "./commands/upload.js";
import { registerFetchCommands } from "./commands/fetch.js";

if (process.env.LIQUIDLM_DEBUG === "1") {
  enableDebug();
}

const program = new Command();

program
  .name(CLI_NAME)
  .version(CLI_VERSION)
  .description("CLI for LiquidLM - your personal knowledge management system")
  .option("--verbose", "Enable debug logging")
  .hook("preAction", () => {
    if (program.opts().verbose) enableDebug();
  });

registerLoginCommands(program);
registerWhoamiCommand(program);
registerOrgCommands(program);
registerConfigCommands(program);
registerTokenCommands(program);
registerMcpCommands(program);
registerSkillCommand(program);
registerVaultsCommands(program);
registerSearchCommands(program);
registerUploadCommands(program);
registerFetchCommands(program);

program.parse();
