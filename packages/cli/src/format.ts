/**
 * Formats an array of objects as an aligned text table.
 */
export function formatTable(rows: Record<string, string>[]): string {
  if (rows.length === 0) return "";

  const columns = Object.keys(rows[0]!);

  // Compute the max width for each column (including header)
  const widths: Record<string, number> = {};
  for (const col of columns) {
    widths[col] = col.length;
    for (const row of rows) {
      widths[col] = Math.max(widths[col]!, (row[col] ?? "").length);
    }
  }

  // Build the header
  const header = columns.map((col) => col.padEnd(widths[col]!)).join("  ");
  const separator = columns.map((col) => "-".repeat(widths[col]!)).join("  ");

  // Build each row
  const lines = rows.map((row) =>
    columns.map((col) => (row[col] ?? "").padEnd(widths[col]!)).join("  "),
  );

  return [header, separator, ...lines].join("\n");
}
