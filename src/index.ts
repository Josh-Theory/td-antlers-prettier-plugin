import type { Plugin } from "prettier";
import { languages } from "./languages.js";
import { parsers } from "./parser.js";
import { printers } from "./printer/index.js";
import { options, defaultOptions } from "./options.js";
import type { AnyNode } from "./types.js";

const plugin: Plugin<AnyNode> = {
  languages,
  parsers,
  printers,
  options,
  defaultOptions,
};

export default plugin;
export { languages, parsers, printers, options, defaultOptions };
