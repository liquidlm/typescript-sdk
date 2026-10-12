import { describe, expect, it } from "vitest";
import { formatYtDlpError, stripVtt } from "./yt-dlp.js";

describe("stripVtt", () => {
  it("extracts cue text and drops timestamps", () => {
    const vtt = [
      "WEBVTT",
      "",
      "Kind: captions",
      "Language: en",
      "",
      "00:00:00.000 --> 00:00:01.000",
      "Hello",
      "",
      "00:00:01.000 --> 00:00:02.000",
      "Hello",
      "",
      "00:00:02.000 --> 00:00:03.000",
      "world",
    ].join("\n");
    expect(stripVtt(vtt)).toBe("Hello\nworld");
  });
});

describe("formatYtDlpError", () => {
  it("surfaces the last ERROR line from yt-dlp stderr", () => {
    const message = formatYtDlpError(
      {
        message: "Command failed: yt-dlp …",
        stderr:
          "WARNING: rate limited\nERROR: [youtube] Sign in to confirm you’re not a bot.\n",
      },
      "Failed to download audio with yt-dlp.",
    );
    expect(message).toContain("Failed to download audio with yt-dlp.");
    expect(message).toContain("Sign in to confirm you’re not a bot.");
  });
});
