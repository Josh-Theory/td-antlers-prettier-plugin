/**
 * Normalize the inner content of an Antlers tag for printing.
 *
 * Trims leading/trailing whitespace, collapses runs of internal whitespace
 * to a single space, and is string-literal aware so we never mangle a value
 * like {{ foo replace:'a  b':'c' }}.
 */
export function normalizeAntlersInner(inner: string): string {
  let out = "";
  let i = 0;
  let inString: '"' | "'" | null = null;
  let lastWasSpace = false;

  while (i < inner.length) {
    const ch = inner[i];
    if (inString) {
      out += ch;
      if (ch === "\\" && i + 1 < inner.length) {
        out += inner[i + 1];
        i += 2;
        continue;
      }
      if (ch === inString) inString = null;
      lastWasSpace = false;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      out += ch;
      lastWasSpace = false;
      i++;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      if (!lastWasSpace && out.length > 0) {
        out += " ";
        lastWasSpace = true;
      }
      i++;
      continue;
    }
    out += ch;
    lastWasSpace = false;
    i++;
  }

  if (out.endsWith(" ")) out = out.slice(0, -1);
  return out;
}
