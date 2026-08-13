import { NextResponse } from "next/server";

import { getRuntimeInfo } from "@/lib/server/runtime";

export function GET() {
  try {
    return NextResponse.json(getRuntimeInfo());
  } catch {
    return NextResponse.json(
      { error: "MirrorMoment runtime is misconfigured." },
      { status: 500 },
    );
  }
}
