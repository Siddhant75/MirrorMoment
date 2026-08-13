import type { RuntimeInfo, RuntimeMode } from "@/lib/runtime/types";

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export function readRuntimeMode(env: RuntimeEnvironment = process.env): RuntimeMode {
  const value = env.MIRRORMOMENT_MODE?.trim().toLowerCase();
  if (!value || value === "replay") return "replay";
  if (value === "live") return "live";
  throw new Error("MIRRORMOMENT_MODE must be replay or live.");
}

export function getRuntimeInfo(env: RuntimeEnvironment = process.env): RuntimeInfo {
  const mode = readRuntimeMode(env);
  return mode === "replay"
    ? {
      mode,
      label: "Recorded Judge Replay",
      acceptsCustomPhotos: false,
    }
    : {
      mode,
      label: "Live YouCam",
      acceptsCustomPhotos: true,
    };
}
