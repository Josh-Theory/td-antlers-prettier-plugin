import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
// @ts-expect-error built output, not yet a package export
import plugin from "../dist/index.js";

const fixturesDir = fileURLToPath(new URL("./fixtures", import.meta.url));

const cases = readdirSync(fixturesDir).filter((entry) =>
  statSync(join(fixturesDir, entry)).isDirectory(),
);

async function format(source: string, opts: Record<string, unknown> = {}) {
  return prettier.format(source, {
    parser: "antlers",
    plugins: [plugin],
    ...opts,
  });
}

describe("fixture snapshots", () => {
  for (const name of cases) {
    it(name, async () => {
      const input = readFileSync(join(fixturesDir, name, "input.antlers.html"), "utf8");
      const expected = readFileSync(join(fixturesDir, name, "output.antlers.html"), "utf8");
      const actual = await format(input);
      expect(actual).toBe(expected);
    });
  }
});

describe("idempotency", () => {
  for (const name of cases) {
    it(`${name} (format(format(x)) === format(x))`, async () => {
      const input = readFileSync(join(fixturesDir, name, "input.antlers.html"), "utf8");
      const once = await format(input);
      const twice = await format(once);
      expect(twice).toBe(once);
    });
  }
});

describe("printWidth sweep", () => {
  for (const width of [40, 80, 120]) {
    for (const name of cases) {
      it(`${name} @ ${width} is idempotent`, async () => {
        const input = readFileSync(join(fixturesDir, name, "input.antlers.html"), "utf8");
        const once = await format(input, { printWidth: width });
        const twice = await format(once, { printWidth: width });
        expect(twice).toBe(once);
      });
    }
  }
});
