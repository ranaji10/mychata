/**
 * One cell of a semicolon-separated CSV that Excel and LibreOffice open safely (T-026).
 *
 * - Quoted when it holds the separator, a quote or a line break, so "Novák; Jan" stays one cell.
 * - Text typed into the public request form can start with = + - @ (or a tab / carriage return).
 *   Spreadsheets treat that as a formula, which can run commands or leak data
 *   ("CSV injection"); such cells get a leading apostrophe so they open as plain text.
 */
export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[;"\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(";");
}
