import { NextResponse } from "next/server";

import { getMirrorMomentProvider } from "@/lib/server/provider";

const maximumBytes = 8 * 1024 * 1024;

function isUploadedFile(value: unknown): value is File {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<File>;
  return typeof candidate.name === "string"
    && typeof candidate.type === "string"
    && typeof candidate.size === "number"
    && Number.isFinite(candidate.size)
    && typeof candidate.arrayBuffer === "function";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const purpose = formData.get("purpose");
    const file = formData.get("file");

    if ((purpose !== "skin" && purpose !== "clothes") || !isUploadedFile(file)) {
      return NextResponse.json({ error: "Upload a JPEG or PNG photo for the selected purpose." }, { status: 400 });
    }
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size >= maximumBytes) {
      return NextResponse.json({ error: "Use a JPEG or PNG photo smaller than 8 MB." }, { status: 400 });
    }

    const uploaded = await getMirrorMomentProvider().uploadPhoto(purpose, {
      name: file.name,
      contentType: file.type,
      bytes: await file.arrayBuffer(),
    });
    return NextResponse.json(uploaded);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image upload failed." }, { status: 502 });
  }
}
