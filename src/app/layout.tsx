import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MirrorMoment | Occasion confidence, thoughtfully personalized",
  description: "A Skin AI and Apparel Virtual Try-On experience for moments that matter.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
