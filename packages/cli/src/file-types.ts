/**
 * Extension-to-MIME mapping, MIME classification helpers, UI categorization
 * and Monaco language mapping.
 *
 * This module ships in two byte-identical copies (core and CLI); a drift
 * guard enforces the sync. Edit both copies together.
 */

// ---------------------------------------------------------------------------
// Extension → MIME mapping
// ---------------------------------------------------------------------------

const MIME_TYPES: Record<string, string> = {
  ".md": "text/markdown",
  ".mdx": "text/markdown",
  ".txt": "text/plain",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".csv": "text/csv",
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".scss": "text/x-scss",
  ".ts": "text/typescript",
  ".tsx": "text/typescript",
  ".js": "text/javascript",
  ".jsx": "text/javascript",
  ".py": "text/x-python",
  ".rb": "text/x-ruby",
  ".go": "text/x-go",
  ".rs": "text/x-rust",
  ".java": "text/x-java",
  ".c": "text/x-c",
  ".cpp": "text/x-c++",
  ".h": "text/x-c",
  ".hpp": "text/x-c++",
  ".yaml": "application/x-yaml",
  ".yml": "application/x-yaml",
  ".toml": "application/toml",
  ".xml": "application/xml",
  ".sql": "text/x-sql",
  ".sh": "text/x-shellscript",
  ".bash": "text/x-shellscript",
  ".zsh": "text/x-shellscript",
  ".env": "text/plain",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".doc": "application/msword",
  ".xls": "application/vnd.ms-excel",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".log": "text/plain",
};

const OFFICE_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-word",
  "application/x-msword",
  "application/vnd.ms-excel",
  "application/msexcel",
  "application/x-msexcel",
  "application/x-ms-excel",
  "application/vnd.oasis.opendocument.text",
] as const;

/**
 * Text formats accepted by the UTF-8 extractor. Keep this list here rather
 * than in individual ingestion adapters so uploads, connectors, and the
 * indexer agree on what "supported" means.
 */
const PLAIN_TEXT_EXTENSIONS = [
  "adoc",
  "asciidoc",
  "astro",
  "cc",
  "cfg",
  "cjs",
  "cljs",
  "clj",
  "conf",
  "cs",
  "dart",
  "editorconfig",
  "edn",
  "erl",
  "ex",
  "exs",
  "fish",
  "gql",
  "gradle",
  "graphql",
  "groovy",
  "hcl",
  "hh",
  "hs",
  "ini",
  "ipynb",
  "jl",
  "json5",
  "jsonc",
  "kt",
  "kts",
  "less",
  "lua",
  "m",
  "markdown",
  "mjs",
  "ml",
  "mli",
  "mm",
  "org",
  "pl",
  "pm",
  "php",
  "properties",
  "proto",
  "prisma",
  "ps1",
  "r",
  "rst",
  "sass",
  "scala",
  "sol",
  "svelte",
  "swift",
  "tex",
  "tf",
  "tfvars",
  "tsv",
  "vue",
  "zig",
] as const;

for (const extension of PLAIN_TEXT_EXTENSIONS) {
  MIME_TYPES[`.${extension}`] ??= "text/plain";
}

/** Extensionless/source-control files that are safely handled as UTF-8. */
export const SUPPORTED_TEXT_BASENAMES = new Set([
  "authors",
  "changelog",
  "codeowners",
  "contributing",
  "dockerfile",
  "gemfile",
  "justfile",
  "licence",
  "license",
  "makefile",
  "notice",
  "procfile",
  "rakefile",
  "readme",
  ".dockerignore",
  ".editorconfig",
  ".eslintrc",
  ".gitattributes",
  ".gitignore",
  ".nvmrc",
  ".prettierrc",
]);

export type SupportedFileCategory =
  | "text"
  | "document"
  | "image"
  | "audio"
  | "video";

export interface SupportedFileFormat {
  /** Stable public capability id. */
  id: string;
  extension: string;
  /** Primary upload MIME followed by accepted equivalent aliases. */
  mimeTypes: readonly string[];
  mimeType: string;
  category: SupportedFileCategory;
  extractor: "text" | "pdf" | "image" | "audio" | "video";
  /** Safe, cheap default for connector imports. */
  connectorDefault: boolean;
}

function categoryForMime(mimeType: string): SupportedFileCategory {
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/x-yaml" ||
    mimeType === "application/toml" ||
    mimeType === "application/xml" ||
    mimeType === "image/svg+xml"
  ) {
    return "text";
  }
  if (
    mimeType === "application/pdf" ||
    (OFFICE_MIME_TYPES as readonly string[]).includes(mimeType)
  ) {
    return "document";
  }
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "video";
}

function extractorForCategory(
  category: SupportedFileCategory,
): SupportedFileFormat["extractor"] {
  if (category === "document") return "pdf";
  return category;
}

function mimeAliases(extension: string, mimeType: string): readonly string[] {
  if (extension === ".mp3") return [mimeType, "audio/mp3"];
  if (extension === ".wav") return [mimeType, "audio/x-wav"];
  if (extension === ".doc") {
    return [mimeType, "application/vnd.ms-word", "application/x-msword"];
  }
  if (extension === ".xls") {
    return [
      mimeType,
      "application/msexcel",
      "application/x-msexcel",
      "application/x-ms-excel",
    ];
  }
  // A .webm container holds either a video track or a bare audio track, and
  // the extension cannot tell them apart. Browser voice memos declare
  // audio/webm; accepting it here is what lets the router pick the audio
  // extractor instead of rejecting the upload as an unknown MIME.
  if (extension === ".webm") return [mimeType, "audio/webm"];
  return [mimeType];
}

/**
 * Categories a connector syncs without an explicit opt-in. Every
 * pipeline-supported category is on by default — the product's control model
 * is granular toggles the user turns OFF, not opt-in the user must turn on. A
 * repo's audio/video therefore transcribes (Whisper) by default; the per-source
 * lever to exclude it is an exclude glob, and the per-file size/cost caps bound
 * the spend. Pull a category back here if a default-off is ever wanted.
 */
const CONNECTOR_DEFAULT_CATEGORIES: ReadonlySet<SupportedFileCategory> =
  new Set(["text", "document", "image", "audio", "video"]);

/** Canonical capability registry consumed by connectors, routing, UI, and docs. */
export const SUPPORTED_FILE_FORMATS: readonly SupportedFileFormat[] =
  Object.entries(MIME_TYPES)
    .map(([extension, mimeType]) => {
      const category = categoryForMime(mimeType);
      return {
        id: `file.${extension.slice(1)}`,
        extension: extension.slice(1),
        mimeTypes: mimeAliases(extension, mimeType),
        mimeType,
        category,
        extractor: extractorForCategory(category),
        connectorDefault: CONNECTOR_DEFAULT_CATEGORIES.has(category),
      };
    })
    .sort((a, b) => a.extension.localeCompare(b.extension));

const SUPPORTED_EXTENSION_SET = new Set(
  SUPPORTED_FILE_FORMATS.map((format) => format.extension),
);
const SUPPORTED_MIME_SET = new Set(
  SUPPORTED_FILE_FORMATS.flatMap((format) => format.mimeTypes),
);
const DEFAULT_CONNECTOR_EXTENSION_SET = new Set(
  SUPPORTED_FILE_FORMATS.filter((format) => format.connectorDefault).map(
    (format) => format.extension,
  ),
);

function pathParts(path: string): { basename: string; extension: string } {
  const basename = (path.split("/").pop() ?? path).toLowerCase();
  const dot = basename.lastIndexOf(".");
  return {
    basename,
    extension: dot > 0 ? basename.slice(dot + 1) : "",
  };
}

export function isSupportedFilePath(path: string): boolean {
  const { basename, extension } = pathParts(path);
  return (
    SUPPORTED_TEXT_BASENAMES.has(basename) ||
    SUPPORTED_EXTENSION_SET.has(extension)
  );
}

export function isDefaultConnectorFilePath(path: string): boolean {
  const { basename, extension } = pathParts(path);
  return (
    SUPPORTED_TEXT_BASENAMES.has(basename) ||
    DEFAULT_CONNECTOR_EXTENSION_SET.has(extension)
  );
}

const EXTENSION_CATEGORIES = new Map(
  SUPPORTED_FILE_FORMATS.map((format) => [format.extension, format.category]),
);

/**
 * Which cost class a path falls into, or null when the pipeline cannot process
 * it. Import previews group by this so a user sees "40 images, 2 videos"
 * rather than a file count that hides which meters the run will draw on.
 */
export function supportedCategoryForPath(
  path: string,
): SupportedFileCategory | null {
  const { basename, extension } = pathParts(path);
  if (SUPPORTED_TEXT_BASENAMES.has(basename)) return "text";
  return EXTENSION_CATEGORIES.get(extension) ?? null;
}

/** Guess MIME type from a file path or key using extension lookup. */
export function guessMimeType(key: string): string {
  const basename = (key.split("/").pop() ?? key).toLowerCase();
  if (SUPPORTED_TEXT_BASENAMES.has(basename)) return "text/plain";
  const dot = key.lastIndexOf(".");
  if (dot === -1) return "application/octet-stream";
  const ext = key.slice(dot).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

// ---------------------------------------------------------------------------
// MIME classification helpers (used by search pipeline)
// ---------------------------------------------------------------------------

const TEXT_MIME_SET = new Set([
  "text/markdown",
  "text/plain",
  "text/typescript",
  "text/javascript",
  "text/csv",
  "text/html",
  "text/css",
  "text/x-scss",
  "text/x-python",
  "text/x-ruby",
  "text/x-go",
  "text/x-rust",
  "text/x-java",
  "text/x-c",
  "text/x-c++",
  "text/x-sql",
  "text/x-shellscript",
  "application/json",
  "application/x-yaml",
  "application/toml",
  "application/xml",
  "image/svg+xml",
]);

/** True only for MIME types with an implemented extraction route. */
export function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_SET.has(mimeType.split(";")[0]!.trim().toLowerCase());
}

const OFFICE_MIME_SET = new Set<string>(OFFICE_MIME_TYPES);

/** Returns true if the MIME type represents a text-based file the indexer can read as UTF-8. */
export function isTextMime(mimeType: string): boolean {
  return TEXT_MIME_SET.has(mimeType) || mimeType.startsWith("text/");
}

/** Returns true if the MIME type represents an Office document. */
export function isOfficeMime(mimeType: string): boolean {
  return OFFICE_MIME_SET.has(mimeType);
}

// ---------------------------------------------------------------------------
// UI file categorization (extension-based)
// ---------------------------------------------------------------------------

export type FileCategory =
  | "text"
  | "markdown"
  | "pdf"
  | "image"
  | "audio"
  | "video"
  | "binary";

const TEXT_EXTENSIONS = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "json",
  "yaml",
  "yml",
  "toml",
  "html",
  "css",
  "scss",
  "sql",
  "sh",
  "bash",
  "zsh",
  "xml",
  "txt",
  "env",
  "c",
  "cpp",
  "h",
  "hpp",
  "svg",
]);

const MARKDOWN_EXTENSIONS = new Set(["md", "mdx"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "flac", "aac", "m4a"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "avi", "mkv"]);

/** Categorize a file by extension for UI display and preview behaviour. */
export function categorizeFile(filename: string): FileCategory {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (MARKDOWN_EXTENSIONS.has(ext)) return "markdown";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  if (PDF_EXTENSIONS.has(ext)) return "pdf";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  return "binary";
}

/** Returns true for file categories that can be loaded as text (for editing). */
export function isTextCategory(category: FileCategory): boolean {
  return category === "text" || category === "markdown";
}

/** Returns true for file categories that need a presigned URL for preview. */
export function needsPresignedUrl(category: FileCategory): boolean {
  return (
    category === "pdf" ||
    category === "image" ||
    category === "audio" ||
    category === "video" ||
    category === "binary"
  );
}

// ---------------------------------------------------------------------------
// Monaco Editor language mapping
// ---------------------------------------------------------------------------

const MONACO_LANGUAGE_MAP: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  mdx: "markdown",
  html: "html",
  css: "css",
  scss: "scss",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  xml: "xml",
  svg: "xml",
  txt: "plaintext",
  env: "plaintext",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
};

/** Map file extension to Monaco Editor language ID. */
export function getLanguageFromExt(ext: string): string {
  return MONACO_LANGUAGE_MAP[ext] ?? "plaintext";
}
