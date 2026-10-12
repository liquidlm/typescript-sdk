# @liquidlm/cli

`liquidlm` is the command-line interface for [LiquidLM](https://liquidlm.com) —
log in, manage scoped access tokens, install the MCP server into your AI client,
and search or upload to your knowledge vaults from the terminal.

## Install

Homebrew (macOS / Linux):

```sh
brew install liquidlm/tap/liquidlm
```

curl (macOS / Linux / WSL):

```sh
curl -fsSL https://liquidlm.com/install.sh | sh
```

npm (any platform with Node 18+):

```sh
npm install -g @liquidlm/cli

# The site also publishes a CLI package with each web release:
npm install -g https://liquidlm.com/downloads/liquidlm-cli.tgz
```

## Quickstart

```sh
liquidlm login                          # authenticate in your browser
liquidlm whoami                         # confirm the active account
liquidlm mcp install --client claude-code # wire the MCP server into your client
liquidlm search "your query"            # query your vaults
liquidlm fetch my-vault https://youtu.be/…   # local yt-dlp → note (+ optional media)
```

Run `liquidlm --help` for the full command set (`org`, `config`, `token`,
`vaults`, `upload`, `fetch`, `skill`, and more).

### Fetch media URLs locally

`liquidlm fetch` runs [yt-dlp](https://github.com/yt-dlp/yt-dlp) on **your
machine**, creates a note with the source URL and captions (when available),
and can optionally upload audio or video into the vault. Because it drives
yt-dlp directly, it reaches every host yt-dlp
[supports](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md),
subject to each site’s access restrictions:

```sh
# Note + captions only
liquidlm fetch my-vault 'https://www.youtube.com/watch?v=…'

# Add context into the note body
liquidlm fetch my-vault 'https://youtu.be/…' --notes 'standup clip'

# Also download and upload audio or video (video needs ffmpeg)
liquidlm fetch my-vault 'https://youtu.be/…' --audio
liquidlm fetch my-vault 'https://youtu.be/…' --video --notes 'onboarding'
```

Prerequisites: `yt-dlp` on `PATH` (or `YT_DLP_PATH`), and `ffmpeg` for
`--video`.

YouTube often blocks anonymous downloads (`429` / bot challenge). Pass browser
cookies when that happens:

```sh
liquidlm fetch my-vault 'https://youtu.be/…' --audio --cookies-from-browser chrome
# or
liquidlm fetch my-vault 'https://youtu.be/…' --video --cookies ./cookies.txt
```

`fetch` streams yt-dlp progress to the terminal and shows stage spinners for
probe / upload.

## Source candidate and releases

This checkout prepares a future release from public source. Installation commands
above currently select the existing published CLI, not this candidate. To evaluate
this source, build the workspace, inspect its npm archive and install that archive
in a disposable project. Do not overwrite an existing registry version.

The public repository's release guide defines checks, versioning, provenance and
publisher setup. Run its `npm run release:prepare` command to validate and generate
the review packet; that command never publishes. First publication requires a
reviewed public tag, configured ownership and a private security-reporting channel.

## Headless / CI

Native client OAuth is always the first choice. If it is unsuitable, use
`liquidlm login` and let the client launch `liquidlm mcp serve`; an existing
OAuth session can refresh during headless operation. Use a vault-scoped PAT
only when both OAuth options are unsuitable. Client-specific examples for
Cursor editor/CLI, Codex, Claude Code, Claude Desktop, OpenCode and ChatGPT
are at <https://liquidlm.com/docs/assistants>; headless guidance is at
<https://liquidlm.com/docs/headless-auth>.

`liquidlm mcp serve` accepts `LIQUIDLM_API_TOKEN` (`LIQUIDLM_TOKEN` is an
alias) without an interactive login. The environment token takes precedence
over saved credentials. For OpenCode 1.x, `liquidlm mcp install --client opencode
--pat` writes an environment reference and disables OAuth for that connection.
The real token is never written to the client configuration.

Interactive login stores refresh tokens in the OS keychain or, when unavailable,
the private credentials file. If an older CLI lost that fallback token, upgrade
and run `liquidlm login` once; retrying an expired session cannot recover it.

If the desktop keychain hangs on a headless host, explicitly select private-file
storage (CLI 0.1.6 or newer):

```sh
LIQUIDLM_CREDENTIAL_STORE=file liquidlm login
LIQUIDLM_CREDENTIAL_STORE=file liquidlm whoami
```

This bypasses all keychain calls, including automatic migration back into the
keychain. Tokens are stored unencrypted in `~/.liquidlm/credentials.json` with
owner-only file permissions (`0600`) inside an owner-only directory (`0700`).
Keep the setting for later commands and in the MCP client's child-process `env`:
`{"LIQUIDLM_CREDENTIAL_STORE":"file"}`. Existing keychain entries are left alone.
This option changes local storage only, not account permissions or the login flow.

## License

MIT — see [LICENSE](./LICENSE).
