import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, it } from "vitest";

import * as judgePackage from "./package-judge.mjs";

const temporaryRoots = [];

async function createJudgeMaterialFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "mirrormoment-judge-materials-"));
  temporaryRoots.push(root);

  await mkdir(path.join(root, "packaging", "judge"), { recursive: true });
  await mkdir(path.join(root, "docs"), { recursive: true });
  await writeFile(path.join(root, "LICENSE"), "MIT License\n\nfixture license\n", "utf8");
  await writeFile(path.join(root, ".env.example"), "YOUCAM_API_KEY=\n", "utf8");
  await writeFile(path.join(root, "packaging", "judge", "README-JUDGES.md"), "Judge guide\n", "utf8");
  await writeFile(path.join(root, "docs", "ASSET_ATTRIBUTION.md"), "Asset attribution\n", "utf8");
  await writeFile(path.join(root, "docs", "API_NOTES.md"), "API notes\n", "utf8");

  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("judge package materials", () => {
  it("copies the repository license into the package root", async () => {
    assert.equal(typeof judgePackage.copyJudgeMaterials, "function");
    const sourceRoot = await createJudgeMaterialFixture();
    const stagingRoot = path.join(sourceRoot, "staged");

    await judgePackage.copyJudgeMaterials(sourceRoot, stagingRoot);

    assert.equal(
      await readFile(path.join(stagingRoot, "LICENSE"), "utf8"),
      "MIT License\n\nfixture license\n",
    );
  });
});
