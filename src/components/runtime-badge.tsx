import type { RuntimeInfo } from "@/lib/runtime/types";

export function RuntimeBadge({ runtime }: { runtime: RuntimeInfo }) {
  const replay = runtime.mode === "replay";
  return (
    <div
      aria-label={`Runtime mode: ${runtime.label}`}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
        replay
          ? "border-[#d7a574] bg-[#fff3e7] text-[#7a3f1f]"
          : "border-[#92b8a3] bg-[#edf8f1] text-[#285b3f]"
      }`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${replay ? "bg-[#c46c36]" : "bg-[#32855a]"}`} />
      {runtime.label}
    </div>
  );
}
