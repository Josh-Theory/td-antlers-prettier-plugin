import type { Printer } from "prettier";
import type { AnyNode } from "../types.js";
import { printAst } from "./print.js";
import { embed } from "./embed.js";

export const antlersPrinter: Printer<AnyNode> = {
  print: printAst,
  embed,
  // We recurse through the tree ourselves inside print(). Returning no
  // visitor keys keeps Prettier from walking the parser's back-references
  // (parent / prev / next / isOpenedBy / isClosedBy) which form cycles.
  getVisitorKeys: () => [],
};

export const printers = {
  "antlers-ast": antlersPrinter,
};
