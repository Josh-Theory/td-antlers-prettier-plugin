import { doc } from "prettier";
import type { AbstractNode } from "td-antlers-parser";
import type { AntlersOptions } from "../options.js";
import { normalizeAntlersInner } from "./expression.js";

const { printDocToString } = doc.printer;

type Options = { printWidth?: number; tabWidth?: number; useTabs?: boolean } & AntlersOptions;

function brace(inner: string, spacing: boolean): string {
  const space = spacing ? " " : "";
  return `{{${space}${inner}${space}}}`;
}

/**
 * Render a single Antlers node to a plain string. Used by the embed step
 * to splice formatted Antlers back into the HTML-formatted output.
 *
 * This is intentionally simple: no breaking, no group()s. Multi-line
 * Antlers inside attribute values would create invalid HTML anyway.
 */
export function renderAntlersToString(
  node: AbstractNode,
  source: string,
  options: Options,
): string {
  const cls = node.constructor.name;
  const spacing = options.antlersBraceSpacing ?? true;
  const inner = (node as any).content ?? "";

  if ((node as any).isComment) {
    const space = spacing ? " " : "";
    return `{{#${space}${inner.trim()}${space}#}}`;
  }

  if (cls === "EscapedContentNode") {
    const start = node.startPosition?.offset ?? 0;
    const children: AbstractNode[] = (node as any).children ?? [];
    const closing = children[children.length - 1];
    const end = ((closing?.endPosition?.offset ?? node.endPosition?.offset ?? start - 1) + 1);
    return source.slice(start, end);
  }

  return brace(normalizeAntlersInner(inner), spacing);
}

// Re-export so callers don't need a separate import.
export { printDocToString };
