/**
 * Tiny terminal progress helpers for long yt-dlp waits.
 */

export function startSpinner(label: string): {
  stop: (finalLabel?: string) => void;
} {
  if (!process.stderr.isTTY) {
    console.error(label);
    return {
      stop: (finalLabel) => {
        if (finalLabel) console.error(finalLabel);
      },
    };
  }

  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const started = Date.now();
  process.stderr.write(`${frames[0]} ${label}`);
  const timer = setInterval(() => {
    i = (i + 1) % frames.length;
    const elapsed = ((Date.now() - started) / 1000).toFixed(0);
    process.stderr.write(`\r${frames[i]} ${label} (${elapsed}s)`);
  }, 80);

  return {
    stop: (finalLabel) => {
      clearInterval(timer);
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      process.stderr.write(
        `\r\x1b[2K${finalLabel ?? `${label} done`} (${elapsed}s)\n`,
      );
    },
  };
}
