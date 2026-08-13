import assert from "node:assert/strict";
import path from "node:path";

import { describe, it } from "vitest";

import {
  assertSupportedNode,
  getDemoServerLaunch,
  redactRuntime,
  validateMode,
} from "./start-demo.mjs";

describe("demo launcher helpers", () => {
  it("requires Node.js 20 or newer", () => {
    assert.equal(assertSupportedNode("20.0.0"), undefined);
    assert.equal(assertSupportedNode("22.4.1"), undefined);
    assert.throws(() => assertSupportedNode("18.20.0"), /Node\.js 20/);
    assert.throws(() => assertSupportedNode("unknown"), /Node\.js version/);
  });

  it("accepts only the two explicit runtime modes", () => {
    assert.equal(validateMode("replay"), "replay");
    assert.equal(validateMode(" LIVE "), "live");
    assert.throws(() => validateMode("preview"), /replay or live/);
  });

  it("reports key status without returning the credential", () => {
    const result = redactRuntime({ mode: "live", apiKey: "secret-value" });
    assert.deepEqual(result, { mode: "live", keyStatus: "configured" });
    assert.doesNotMatch(JSON.stringify(result), /secret-value/);
    assert.deepEqual(
      redactRuntime({ mode: "live", apiKey: "   " }),
      { mode: "live", keyStatus: "missing" },
    );
    assert.deepEqual(
      redactRuntime({ mode: "replay", apiKey: "secret-value" }),
      { mode: "replay", keyStatus: "not required" },
    );
  });

  it("launches the built standalone server instead of next start", () => {
    assert.deepEqual(getDemoServerLaunch(path.resolve("C:/example/MirrorMoment")), {
      cwd: path.resolve("C:/example/MirrorMoment/.next/standalone"),
      serverPath: path.resolve("C:/example/MirrorMoment/.next/standalone/server.js"),
    });
  });
});
