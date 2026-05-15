import { doc } from "prettier";
import type { AstPath, Doc, ParserOptions } from "prettier";
import type { AbstractNode } from "td-antlers-parser";
import type { AntlersAst, AnyNode } from "../types.js";
import type { AntlersOptions } from "../options.js";
import { normalizeAntlersInner } from "./expression.js";

const { group, indent, softline, hardline } = doc.builders;

type Print = (path: AstPath<AnyNode>) => Doc;
type Options = ParserOptions<AnyNode> & AntlersOptions;

function brace(inner: string, spacing: boolean): string {
  const space = spacing ? " " : "";
  return `{{${space}${inner}${space}}}`;
}

/**
 * The parser exposes `endPosition.offset` as the index of the node's LAST
 * character (inclusive), not one past it. `source.slice(start, end + 1)`
 * is what JavaScript expects for a verbatim substring.
 */
function rawSource(node: AbstractNode, source: string): string {
  const start = node.startPosition?.offset ?? 0;
  const end = (node.endPosition?.offset ?? start - 1) + 1;
  return source.slice(start, end);
}

function printRoot(ast: AntlersAst, options: Options): Doc {
  const parts: Doc[] = [];
  const nodes = stripEdgeWhitespace(ast.nodes);
  for (const node of nodes) {
    parts.push(printNode(node, ast.source, options));
  }
  return [parts, hardline];
}

/**
 * Trim leading whitespace from the first child and trailing whitespace from
 * the last child when they are pure-text Literal nodes. Without this, a
 * second formatting pass would re-indent already-indented bodies.
 */
function stripEdgeWhitespace(nodes: AbstractNode[]): AbstractNode[] {
  if (nodes.length === 0) return nodes;
  const result = nodes.slice();
  const first = result[0] as any;
  if (first?.constructor?.name === "LiteralNode" && typeof first.content === "string") {
    const trimmed = first.content.replace(/^[ \t]*\n+[ \t]*/, "");
    if (trimmed !== first.content) {
      result[0] = wrapLiteralContent(first, trimmed);
    }
  }
  const last = result[result.length - 1] as any;
  if (last?.constructor?.name === "LiteralNode" && typeof last.content === "string") {
    const trimmed = last.content.replace(/[ \t]*\n+[ \t]*$/, "");
    if (trimmed !== last.content) {
      result[result.length - 1] = wrapLiteralContent(last, trimmed);
    }
  }
  return result;
}

function wrapLiteralContent(literal: any, newContent: string): any {
  // Shallow clone with overridden content so we don't mutate the parser AST.
  return new Proxy(literal, {
    get(target, prop) {
      if (prop === "content") return newContent;
      return (target as any)[prop];
    },
  });
}

function printNode(node: AbstractNode, source: string, options: Options): Doc {
  const cls = node.constructor.name;
  switch (cls) {
    case "LiteralNode":
      return printLiteral(node);
    case "ConditionNode":
      return printCondition(node as any, source, options);
    case "EscapedContentNode":
      return printEscapedContent(node as any, source, options);
    case "AntlersNode":
    case "PhpExecutionNode":
    case "RecursiveNode":
      return printAntlers(node as any, source, options);
    case "CommentParserFailNode":
    case "PhpParserFailNode":
    case "ParserFailNode":
    case "AntlersParserFailNode":
      return rawSource(node, source);
    default:
      return rawSource(node, source);
  }
}

function printLiteral(node: AbstractNode): Doc {
  return (node as any).content ?? "";
}

function printAntlers(node: any, source: string, options: Options): Doc {
  if (node.isComment) {
    return printComment(node, options);
  }

  const open = printAntlersOpen(node, options);

  if (!node.isClosedBy) {
    return open;
  }

  const children = node.children ?? [];
  const bodyChildren = stripEdgeWhitespace(children.slice(0, -1));
  const closingNode = children[children.length - 1];
  const close = printAntlersOpen(closingNode, options);

  if (bodyChildren.length === 0) {
    return [open, close];
  }

  const body = printChildren(bodyChildren, source, options);
  return group([open, indent([softline, body]), softline, close]);
}

function printAntlersOpen(node: any, options: Options): Doc {
  const inner = normalizeAntlersInner(node.content ?? "");
  return brace(inner, options.antlersBraceSpacing);
}

function printComment(node: any, options: Options): Doc {
  const inner = (node.content ?? "").trim();
  const space = options.antlersBraceSpacing ? " " : "";
  return `{{#${space}${inner}${space}#}}`;
}

function printCondition(node: any, source: string, options: Options): Doc {
  const branches = node.logicBranches ?? [];
  const parts: Doc[] = [];

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    const head = branch.head;
    const nodes: AbstractNode[] = branch.nodes ?? [];
    const body = stripEdgeWhitespace(nodes.slice(0, -1));
    const boundary = nodes[nodes.length - 1];

    parts.push(printAntlersOpen(head, options));
    if (body.length > 0) {
      parts.push(indent([softline, printChildren(body, source, options)]));
      parts.push(softline);
    }

    if (i === branches.length - 1 && boundary) {
      parts.push(printAntlersOpen(boundary, options));
    }
  }

  return group(parts);
}

function printEscapedContent(node: any, source: string, _options: Options): Doc {
  // Inside a {{ noparse }} block the parser substitutes a placeholder hash
  // for the literal content, so we can't rebuild from AST fields. Emit the
  // full original span verbatim instead.
  const children = node.children ?? [];
  const closing = children[children.length - 1];
  const start = node.startPosition?.offset ?? 0;
  const end = ((closing?.endPosition?.offset ?? node.endPosition?.offset ?? start - 1) + 1);
  return source.slice(start, end);
}

function printChildren(children: AbstractNode[], source: string, options: Options): Doc {
  const parts: Doc[] = [];
  for (const child of children) {
    parts.push(printNode(child, source, options));
  }
  return parts;
}

export function printAst(
  path: AstPath<AnyNode>,
  options: Options,
  _print: Print,
): Doc {
  const node = path.node;
  if (!node) return "";
  if ((node as AntlersAst).type === "AntlersRoot") {
    return printRoot(node as AntlersAst, options);
  }
  return printNode(node as AbstractNode, (options as any).originalText ?? "", options);
}
