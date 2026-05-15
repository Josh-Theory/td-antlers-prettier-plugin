import type { SupportLanguage } from "prettier";

export const languages: SupportLanguage[] = [
  {
    name: "Antlers",
    parsers: ["antlers"],
    extensions: [".antlers.html", ".antlers.php", ".antlers"],
    vscodeLanguageIds: ["antlers", "antlers-html", "antlers-php"],
  },
];
