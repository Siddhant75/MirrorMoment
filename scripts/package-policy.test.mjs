import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, it } from "vitest";

import { assertReleaseSafe, inspectRelease } from "./package-policy.mjs";

const temporaryRoots = [];

async function createFixture(relativePath, contents = "fixture") {
  const root = await mkdtemp(path.join(os.tmpdir(), "mirrormoment-package-policy-"));
  temporaryRoots.push(root);
  const target = path.join(root, ...relativePath.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("judge release policy", () => {
  it("rejects private, credential, agent-context, and raw-vendor paths", async () => {
    for (const unsafe of [
      ".env.local",
      "private-demo-images/person.png",
      "secrets/client.pem",
      ".codex/context.md",
      "raw-vendor-response.json",
    ]) {
      const root = await createFixture(unsafe);
      await assert.rejects(() => assertReleaseSafe(root), /release policy/i);
    }
  });

  it("rejects credential assignments, private keys, and signed URLs in text", async () => {
    for (const [name, text] of [
      ["notes.txt", "YOUCAM_API_KEY=real-looking-secret-value"],
      ["key.txt", "-----BEGIN PRIVATE KEY-----\nnot-a-real-key"],
      ["url.txt", "https://vendor.example/x?X-Amz-Signature=abc"],
    ]) {
      const root = await createFixture(name, text);
      await assert.rejects(() => assertReleaseSafe(root), /release policy/i);
    }
  });

  it("allows the explicit judge-facing replay material", async () => {
    const root = await createFixture(".env.example", "YOUCAM_API_KEY=\nMIRRORMOMENT_MODE=replay\n");
    await mkdir(path.join(root, "app", "public", "replay"), { recursive: true });
    await writeFile(path.join(root, "app", "server.js"), "console.log('compiled replay app');\n");
    await writeFile(path.join(root, "app", "public", "replay", "look.jpg"), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    await writeFile(path.join(root, "RUN_JUDGE_DEMO.ps1"), "$env:MIRRORMOMENT_MODE = 'replay'\n");
    await writeFile(path.join(root, "README-JUDGES.md"), "Recorded replay with attribution.\n");

    const report = await assertReleaseSafe(root);

    assert.deepEqual(report.violations, []);
    assert.deepEqual(report.files, [
      ".env.example",
      "README-JUDGES.md",
      "RUN_JUDGE_DEMO.ps1",
      "app/public/replay/look.jpg",
      "app/server.js",
    ]);
    assert.equal(report.totalBytes > 0, true);
    assert.deepEqual(await inspectRelease(root), report);
  });
});
