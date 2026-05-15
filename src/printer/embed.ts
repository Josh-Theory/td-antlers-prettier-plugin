import type { Printer } from "prettier";
import { doc } from "prettier";
import type { AbstractNode } from "td-antlers-parser";
import type { AntlersAst, AnyNode } from "../types.js";

const PLACEHOLDER_PREFIX = "__ANTLERS_PH_";
const PLACEHOLDER_SUFFIX = "__";

interface Placeholder {
  id: string;
  rendered: string;
}

interface BuildResult {
  html: string;
  placeholders: Placeholder[];
}

function makePlaceholder(index: number): string {
  return `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
}

/**
 * Build an HTML-safe source where each Antlers tag is replaced with a unique
 * ASCII placeholder. The parser uses *inclusive* end offsets for Antlers
 * nodes but the LiteralNode's `content` is the authoritative verbatim slice,
 * so we emit literals from `.content` and only use offsets when slicing
 * the original source for a placeholder span we don't otherwise have.
 */
function buildPlaceholderSource(
  nodes: AbstractNode[],
  source: string,
  render: (node: AbstractNode) => string,
): BuildResult | null {
  const out: string[] = [];
  const placeholders: Placeholder[] = [];

  function pushPlaceholder(node: AbstractNode): void {
    const id = makePlaceholder(placeholders.length);
    placeholders.push({ id, rendered: render(node) });
    out.push(id);
  }

  function walk(list: AbstractNode[]): boolean {
    for (const node of list) {
      const cls = node.constructor.name;
      if (cls === "LiteralNode") {
        out.push((node as any).content ?? "");
        continue;
      }
      if (cls === "AntlersNode" || cls === "PhpExecutionNode" || cls === "RecursiveNode") {
        const an = node as any;
        if (an.isClosedBy) {
          pushPlaceholder(node);
          const children: AbstractNode[] = an.children ?? [];
          const body = children.slice(0, -1);
          const closing = children[children.length - 1];
          if (!walk(body)) return false;
          if (closing) pushPlaceholder(closing);
          continue;
        }
        pushPlaceholder(node);
        continue;
      }
      if (cls === "EscapedContentNode") {
        // {{ noparse }} regions are opaque — emit the whole span verbatim
        // by wrapping it into a single placeholder.
        pushPlaceholderSpan(node, source, placeholders, out);
        continue;
      }
      if (cls === "ConditionNode") {
        // Conditionals can straddle HTML structure; the placeholder strategy
        // would routinely produce invalid HTML. Bail out — the printer's
        // verbatim path is safer.
        return false;
      }
      return false;
    }
    return true;
  }

  if (!walk(nodes)) return null;
  return { html: out.join(""), placeholders };
}

function pushPlaceholderSpan(
  node: AbstractNode,
  source: string,
  placeholders: Placeholder[],
  out: string[],
): void {
  const children: AbstractNode[] = (node as any).children ?? [];
  const closing = children[children.length - 1];
  const start = node.startPosition?.offset ?? 0;
  const end = ((closing?.endPosition?.offset ?? node.endPosition?.offset ?? start - 1) + 1);
  const verbatim = source.slice(start, end);
  const id = makePlaceholder(placeholders.length);
  placeholders.push({ id, rendered: verbatim });
  out.push(id);
}

function placeholderRegex(): RegExp {
  return new RegExp(`${PLACEHOLDER_PREFIX}\\d+${PLACEHOLDER_SUFFIX}`, "g");
}

export const embed: Printer<AnyNode>["embed"] = (path, _options) => {
  const node = path.node as AnyNode;
  if (!node || (node as AntlersAst).type !== "AntlersRoot") return null;

  return async (textToDoc, _print, _path, options) => {
    const ast = node as AntlersAst;
    const { renderAntlersToString } = await import("./renderToString.js");
    const built = buildPlaceholderSource(ast.nodes, ast.source, (n) =>
      renderAntlersToString(n, ast.source, options as any),
    );
    if (!built) return null;

    let htmlDoc;
    try {
      htmlDoc = await textToDoc(built.html, { parser: "html" });
    } catch {
      return null;
    }

    const printed = doc.printer.printDocToString(htmlDoc, {
      printWidth: (options as any).printWidth ?? 80,
      tabWidth: (options as any).tabWidth ?? 2,
      useTabs: (options as any).useTabs ?? false,
      endOfLine: (options as any).endOfLine ?? "lf",
    } as any).formatted;

    const lookup = new Map(built.placeholders.map((p) => [p.id, p.rendered]));
    const spliced = printed.replace(placeholderRegex(), (m) => lookup.get(m) ?? m);
    return spliced.replace(/\n*$/, "\n");
  };
};
