import { describe, expect, it } from "vitest";
import {
  assertFetchMediaFlags,
  buildFetchNoteBody,
  sanitizeFetchedFileName,
} from "./fetch-note.js";

describe("buildFetchNoteBody", () => {
  it("includes source URL and empty-transcript placeholder", () => {
    expect(buildFetchNoteBody({ url: "https://youtu.be/abc" })).toBe(
      [
        "Source: https://youtu.be/abc",
        "",
        "## Transcript",
        "",
        "(No captions available.)",
      ].join("\n"),
    );
  });

  it("includes notes and transcript when present", () => {
    expect(
      buildFetchNoteBody({
        url: "https://youtu.be/abc",
        notes: "  meeting follow-up  ",
        transcript: "Hello world",
      }),
    ).toBe(
      [
        "Source: https://youtu.be/abc",
        "",
        "meeting follow-up",
        "",
        "## Transcript",
        "",
        "Hello world",
      ].join("\n"),
    );
  });
});

describe("assertFetchMediaFlags", () => {
  it("returns null when neither flag is set", () => {
    expect(assertFetchMediaFlags({})).toBeNull();
  });

  it("returns audio or video when a single flag is set", () => {
    expect(assertFetchMediaFlags({ audio: true })).toBe("audio");
    expect(assertFetchMediaFlags({ video: true })).toBe("video");
  });

  it("rejects both flags together", () => {
    expect(() => assertFetchMediaFlags({ audio: true, video: true })).toThrow(
      /either --audio or --video/,
    );
  });
});

describe("sanitizeFetchedFileName", () => {
  it("keeps a safe basename and extension", () => {
    expect(sanitizeFetchedFileName("Hello World!!", "mp3")).toBe(
      "Hello-World.mp3",
    );
  });

  it("falls back when the title is empty after sanitizing", () => {
    expect(sanitizeFetchedFileName("!!!", ".mp4")).toBe("fetched-media.mp4");
  });
});
