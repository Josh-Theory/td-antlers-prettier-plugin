import type { SupportOptions } from "prettier";

export const options: SupportOptions = {
  antlersBraceSpacing: {
    category: "Antlers",
    type: "boolean",
    default: true,
    description: "Print one space inside Antlers braces (e.g. {{ foo }} vs {{foo}}).",
  },
};

export const defaultOptions = {
  antlersBraceSpacing: true,
};

export interface AntlersOptions {
  antlersBraceSpacing: boolean;
}
