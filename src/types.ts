import type { AbstractNode } from "td-antlers-parser";

export type AntlersAst = {
  type: "AntlersRoot";
  nodes: AbstractNode[];
  source: string;
  startPosition: { offset: number };
  endPosition: { offset: number };
};

export type AnyNode = AbstractNode | AntlersAst;
