import { execFile, spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { startSpinner } from "./progress.js";

const execFileAsync = promisify(execFile);

const PROBE_TIMEOUT_MS = 90_000;
const DOWNLOAD_TIMEOUT_MS = 30 * 60_000;

interface YtDlpCaption {
  ext?: string;
  url?: string;
}

export interface YtDlpInfo {
  id?: string;
  title?: string;
  description?: string | null;
  duration?: number;
  webpage_url?: string;
  extractor_key?: string;
  extractor?: string;
  subtitles?: Record<string, YtDlpCaption[]>;
  automatic_captions?: Record<string, YtDlpCaption[]>;
}

export interface MediaProbe {
  title: string;
  description: string | null;
  provider: string | null;
  webpageUrl: string;
  transcript: string | null;
  transcriptLanguage: string | null;
}

export interface YtDlpAuthOptions {
  /** e.g. chrome, firefox, safari, brave, edge */
  cookiesFromBrowser?: string;
  /** Path to a Netscape cookies.txt */
  cookies?: string;
}

export function ytDlpBin(): string {
  return process.env.YT_DLP_PATH?.trim() || "yt-dlp";
}

function authArgs(auth?: YtDlpAuthOptions): string[] {
  const args: string[] = [];
  if (auth?.cookiesFromBrowser) {
    args.push("--cookies-from-browser", auth.cookiesFromBrowser);
  }
  if (auth?.cookies) {
    args.push("--cookies", auth.cookies);
  }
  return args;
}

export function formatYtDlpError(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const e = err as {
    message?: string;
    stderr?: string | Buffer;
    stdout?: string | Buffer;
  };
  const stderr = (e.stderr?.toString() ?? "").trim();
  const stdout = (e.stdout?.toString() ?? "").trim();
  const detail = stderr || stdout;
  if (!detail) return e.message?.trim() || fallback;

  // Prefer the last ERROR line — yt-dlp often prints useful warnings first.
  const errorLine = detail
    .split("\n")
    .map((line) => line.trim())
    .reverse()
    .find((line) => line.startsWith("ERROR:"));
  const hint = errorLine ?? detail.split("\n").slice(-8).join("\n");
  return `${fallback}\n\n${hint}`;
}

export async function assertYtDlpAvailable(): Promise<void> {
  try {
    await execFileAsync(ytDlpBin(), ["--version"], {
      timeout: 10_000,
      env: { PATH: process.env.PATH, LANG: "C.UTF-8" },
    });
  } catch {
    throw new Error(
      [
        `yt-dlp not found (${ytDlpBin()}).`,
        "Install it locally (https://github.com/yt-dlp/yt-dlp) or set YT_DLP_PATH.",
        "Video downloads also need ffmpeg on PATH.",
      ].join(" "),
    );
  }
}

function captionLanguages(info: YtDlpInfo): Array<{
  language: string;
  captions: YtDlpCaption[];
}> {
  const manual = Object.entries(info.subtitles ?? {}).map(
    ([language, captions]) => ({ language, captions }),
  );
  const automatic = Object.entries(info.automatic_captions ?? {}).map(
    ([language, captions]) => ({ language, captions }),
  );
  const score = (language: string) => {
    const lower = language.toLowerCase();
    if (lower === "en" || lower.startsWith("en-")) return 0;
    if (lower === "pt" || lower.startsWith("pt-")) return 1;
    return 2;
  };
  return [...manual, ...automatic]
    .filter(({ language }) => language !== "live_chat")
    .sort((a, b) => score(a.language) - score(b.language));
}

export function stripVtt(value: string): string {
  const lines = value.replaceAll("\r", "").split("\n");
  const text: string[] = [];
  let previous = "";
  for (const raw of lines) {
    const line = raw
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .trim();
    if (
      !line ||
      line === "WEBVTT" ||
      line.startsWith("Kind:") ||
      line.startsWith("Language:") ||
      /^\d+$/.test(line) ||
      /-->/.test(line)
    ) {
      continue;
    }
    if (line !== previous) text.push(line);
    previous = line;
  }
  return text.join("\n").trim();
}

async function loadCaption(
  info: YtDlpInfo,
): Promise<{ text: string; language: string } | null> {
  for (const candidate of captionLanguages(info)) {
    const format =
      candidate.captions.find((entry) => entry.ext === "vtt" && entry.url) ??
      candidate.captions.find((entry) => entry.url);
    if (!format?.url) continue;
    try {
      const response = await fetch(format.url);
      if (!response.ok) continue;
      const text = stripVtt(await response.text());
      if (text.length >= 10) return { text, language: candidate.language };
    } catch {
      // Try the next language / format.
    }
  }
  return null;
}

export async function probeMediaUrl(
  url: string,
  auth?: YtDlpAuthOptions,
): Promise<MediaProbe> {
  const spinner = startSpinner("Probing media with yt-dlp…");
  try {
    const { stdout } = await execFileAsync(
      ytDlpBin(),
      [
        "--dump-single-json",
        "--skip-download",
        "--no-playlist",
        ...authArgs(auth),
        "--",
        url,
      ],
      {
        timeout: PROBE_TIMEOUT_MS,
        maxBuffer: 12 * 1024 * 1024,
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          LANG: "C.UTF-8",
        },
      },
    );
    spinner.stop("Probed media");
    const info = JSON.parse(stdout) as YtDlpInfo;
    const captionSpinner = startSpinner("Fetching captions…");
    const caption = await loadCaption(info);
    captionSpinner.stop(
      caption
        ? `Captions loaded (${caption.language})`
        : "No captions available",
    );
    const webpageUrl = info.webpage_url?.trim() || url;
    return {
      title: info.title?.trim() || webpageUrl,
      description: info.description?.trim() || null,
      provider: info.extractor_key ?? info.extractor ?? null,
      webpageUrl,
      transcript: caption?.text ?? null,
      transcriptLanguage: caption?.language ?? null,
    };
  } catch (err) {
    spinner.stop("Probe failed");
    throw new Error(formatYtDlpError(err, "Failed to probe URL with yt-dlp."), {
      cause: err,
    });
  }
}

function runYtDlpStreaming(args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ytDlpBin(), args, {
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        LANG: "C.UTF-8",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    const onChunk = (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    };
    child.stdout?.on("data", onChunk);
    child.stderr?.on("data", onChunk);

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(
        new Error(`yt-dlp timed out after ${Math.round(timeoutMs / 1000)}s`),
      );
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        Object.assign(new Error(`yt-dlp exited with code ${code ?? "?"}`), {
          stderr,
        }),
      );
    });
  });
}

export async function downloadMedia(
  url: string,
  kind: "audio" | "video",
  directory: string,
  auth?: YtDlpAuthOptions,
): Promise<{ path: string; bytes: Buffer; extension: string }> {
  const output = join(directory, "media.%(ext)s");
  const formatArgs =
    kind === "audio"
      ? ["-f", "ba/b", "-x", "--audio-format", "mp3", "--audio-quality", "5"]
      : ["-f", "bv*+ba/b", "--merge-output-format", "mp4"];

  console.error(`Downloading ${kind} with yt-dlp…`);
  // Prefer --no-playlist over --max-downloads: the latter exits non-zero
  // (code 101) after a successful single-file download/extract, which we
  // used to mis-report as failure even when media.mp3 was already written.
  try {
    await runYtDlpStreaming(
      [
        "--no-playlist",
        "--newline",
        "--progress",
        ...authArgs(auth),
        ...formatArgs,
        "-o",
        output,
        "--",
        url,
      ],
      DOWNLOAD_TIMEOUT_MS,
    );
  } catch (err) {
    const entriesAfterFailure = await readdir(directory).catch(() => []);
    const recovered = entriesAfterFailure.find(
      (name) =>
        name.startsWith("media.") &&
        !name.endsWith(".part") &&
        !name.endsWith(".ytdl"),
    );
    if (!recovered) {
      throw new Error(
        formatYtDlpError(err, `Failed to download ${kind} with yt-dlp.`),
        { cause: err },
      );
    }
    console.error(
      "yt-dlp exited with a warning after writing the media file; continuing.",
    );
  }

  const entries = await readdir(directory);
  const candidate = entries.find(
    (name) =>
      name.startsWith("media.") &&
      !name.endsWith(".part") &&
      !name.endsWith(".ytdl"),
  );
  if (!candidate) {
    throw new Error("yt-dlp returned no downloadable media file");
  }
  const path = join(directory, candidate);
  const extension = candidate.includes(".")
    ? candidate.slice(candidate.lastIndexOf(".") + 1)
    : kind === "audio"
      ? "mp3"
      : "mp4";
  return { path, bytes: await readFile(path), extension };
}

export async function withTempDir<T>(
  keep: boolean,
  fn: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "liquidlm-fetch-"));
  try {
    return await fn(directory);
  } finally {
    if (!keep) {
      await rm(directory, { recursive: true, force: true }).catch(
        () => undefined,
      );
    } else {
      console.error(`Kept temp dir: ${directory}`);
    }
  }
}
