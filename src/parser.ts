import type { Parser } from "prettier";
import { DocumentParser } from "td-antlers-parser";
import type { AntlersAst, AnyNode } from "./types.js";

function parse(text: string): AntlersAst {
  const documentParser = new DocumentParser();
  const nodes = documentParser.parse(text);
  return {
    type: "AntlersRoot",
    nodes,
    source: text,
    startPosition: { offset: 0 },
    endPosition: { offset: text.length },
  };
}

function locStart(node: AnyNode): number {
  return node?.startPosition?.offset ?? 0;
}

function locEnd(node: AnyNode): number {
  return node?.endPosition?.offset ?? 0;
}

export const antlersParser: Parser<AnyNode> = {
  parse,
  astFormat: "antlers-ast",
  locStart,
  locEnd,
};

export const parsers = {
  antlers: antlersParser,
};
