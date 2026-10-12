import type { Command } from "commander";
import { guessMimeType } from "../file-types.js";
import { apiClient } from "../client.js";
import {
  assertFetchMediaFlags,
  buildFetchNoteBody,
  sanitizeFetchedFileName,
} from "../fetch-note.js";
import { startSpinner } from "../progress.js";
import { resolveVaultId } from "../resolve-vault.js";
import { uploadOne } from "../upload-helper.js";
import {
  assertYtDlpAvailable,
  downloadMedia,
  probeMediaUrl,
  withTempDir,
  type YtDlpAuthOptions,
} from "../yt-dlp.js";

interface CreatedKnowledge {
  id: string;
  title?: string | null;
}

export function registerFetchCommands(program: Command): void {
  program
    .command("fetch <vault> <url>")
    .description(
      "Fetch a media URL on this machine (yt-dlp), create a note with captions, and optionally upload audio/video",
    )
    .option("--audio", "Download and upload audio")
    .option("--video", "Download and upload video (requires ffmpeg)")
    .option("--notes <text>", "Extra context to include in the note body")
    .option(
      "--cookies-from-browser <browser>",
      "Pass browser cookies to yt-dlp (chrome, firefox, safari, brave, edge)",
    )
    .option("--cookies <path>", "Path to a Netscape cookies.txt for yt-dlp")
    .option("--keep", "Keep the temporary download directory")
    .action(
      async (
        vaultArg: string,
        url: string,
        opts: {
          audio?: boolean;
          video?: boolean;
          notes?: string;
          cookiesFromBrowser?: string;
          cookies?: string;
          keep?: boolean;
        },
      ) => {
        let mediaKind: "audio" | "video" | null;
        try {
          mediaKind = assertFetchMediaFlags(opts);
        } catch (err) {
          console.error(err instanceof Error ? err.message : err);
          process.exit(1);
        }

        let parsedUrl: URL;
        try {
          parsedUrl = new URL(url);
        } catch {
          console.error(`Invalid URL: ${url}`);
          process.exit(1);
        }
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          console.error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
          process.exit(1);
        }

        try {
          await assertYtDlpAvailable();
        } catch (err) {
          console.error(err instanceof Error ? err.message : err);
          process.exit(1);
        }

        const auth: YtDlpAuthOptions = {
          cookiesFromBrowser: opts.cookiesFromBrowser,
          cookies: opts.cookies,
        };

        const vaultId = await resolveVaultId(vaultArg);

        let probe;
        try {
          probe = await probeMediaUrl(url, auth);
        } catch (err) {
          console.error(err instanceof Error ? err.message : err);
          if (!auth.cookiesFromBrowser && !auth.cookies) {
            console.error(
              "\nTip: YouTube often requires cookies. Retry with e.g.\n" +
                "  --cookies-from-browser chrome\n" +
                "or export cookies.txt and pass --cookies ./cookies.txt",
            );
          }
          process.exit(1);
        }

        const content = buildFetchNoteBody({
          url: probe.webpageUrl,
          notes: opts.notes,
          transcript: probe.transcript,
        });

        const noteSpinner = startSpinner("Creating note…");
        const noteRes = await apiClient.post<CreatedKnowledge>("/knowledge", {
          type: "note",
          vault_id: vaultId,
          title: probe.title,
          content,
          metadata: {
            fetched_via: "cli_fetch",
            source_url: probe.webpageUrl,
            media_provider: probe.provider,
            caption_language: probe.transcriptLanguage,
            captions_available: Boolean(probe.transcript),
          },
        });
        if (!noteRes.ok || !noteRes.data?.id) {
          noteSpinner.stop("Note creation failed");
          console.error("Failed to create note.");
          process.exit(1);
        }
        noteSpinner.stop("Created note");
        const noteId = noteRes.data.id;
        console.log(`Created note: ${noteId}`);
        console.log(`  Title: ${probe.title}`);
        if (probe.transcript) {
          console.log(
            `  Captions: ${probe.transcriptLanguage ?? "unknown"} (${probe.transcript.length} chars)`,
          );
        } else {
          console.log(
            "  Captions: none — re-run with --audio or --video to upload media for transcription.",
          );
        }

        if (!mediaKind) return;

        try {
          await withTempDir(Boolean(opts.keep), async (directory) => {
            const downloaded = await downloadMedia(
              url,
              mediaKind,
              directory,
              auth,
            );
            const fileName = sanitizeFetchedFileName(
              probe.title,
              downloaded.extension,
            );
            const key = `fetched/${fileName}`;
            const mime = guessMimeType(key);
            const uploadSpinner = startSpinner(`Uploading ${key}…`);
            const uploaded = await uploadOne(
              vaultId,
              key,
              downloaded.bytes,
              mime,
            );
            uploadSpinner.stop(`Uploaded ${key}`);
            console.log(`  knowledgeId: ${uploaded.knowledgeId}`);

            const relateSpinner = startSpinner("Linking media to note…");
            const relate = await apiClient.post(
              `/knowledge/${encodeURIComponent(noteId)}/relate`,
              {
                target_id: uploaded.knowledgeId,
                target_type: "item",
                label: "fetched media",
              },
            );
            if (!relate.ok) {
              relateSpinner.stop("Relate failed");
              console.error(
                "Uploaded media but failed to relate it to the note.",
              );
              process.exit(1);
            }
            relateSpinner.stop(`Related media to note ${noteId}`);
          });
        } catch (err) {
          console.error(err instanceof Error ? err.message : err);
          if (!auth.cookiesFromBrowser && !auth.cookies) {
            console.error(
              "\nTip: YouTube often requires cookies. Retry with e.g.\n" +
                "  --cookies-from-browser chrome\n" +
                "or export cookies.txt and pass --cookies ./cookies.txt",
            );
          }
          process.exit(1);
        }
      },
    );
}
