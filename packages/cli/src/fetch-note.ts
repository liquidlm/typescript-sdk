/**
 * Pure helpers for assembling the note created by `liquidlm fetch`.
 */

export function buildFetchNoteBody(input: {
  url: string;
  notes?: string | null;
  transcript?: string | null;
}): string {
  const parts: string[] = [`Source: ${input.url}`];

  const notes = input.notes?.trim();
  if (notes) {
    parts.push("", notes);
  }

  const transcript = input.transcript?.trim();
  parts.push("", "## Transcript", "");
  parts.push(transcript || "(No captions available.)");

  return parts.join("\n");
}

export function sanitizeFetchedFileName(
  title: string,
  extension: string,
): string {
  const base = title
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const ext = extension.replace(/^\./, "").toLowerCase() || "bin";
  return `${base || "fetched-media"}.${ext}`;
}

export function assertFetchMediaFlags(opts: {
  audio?: boolean;
  video?: boolean;
}): "audio" | "video" | null {
  if (opts.audio && opts.video) {
    throw new Error("Use either --audio or --video, not both.");
  }
  if (opts.audio) return "audio";
  if (opts.video) return "video";
  return null;
}
