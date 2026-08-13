import { MirrorMomentApp } from "@/components/mirror-moment-app";
import { getRuntimeInfo } from "@/lib/server/runtime";

export const dynamic = "force-dynamic";

export default function Home() {
  return <MirrorMomentApp runtime={getRuntimeInfo()} />;
}
