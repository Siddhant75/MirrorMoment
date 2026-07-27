import { NextResponse } from "next/server";

import { getYouCamClient } from "@/lib/server/youcam";

const maximumBytes = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const purpose = formData.get("purpose");
    const file = formData.get("file");

    if ((purpose !== "skin" && purpose !== "clothes") || !(file instanceof File)) {
      return NextResponse.json({ error: "Upload a JPEG or PNG photo for the selected purpose." }, { status: 400 });
    }
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size >= maximumBytes) {
      return NextResponse.json({ error: "Use a JPEG or PNG photo smaller than 8 MB." }, { status: 400 });
    }

    const uploaded = await getYouCamClient().uploadFile(purpose, {
      name: file.name,
      contentType: file.type,
      bytes: await file.arrayBuffer(),
    });
    return NextResponse.json(uploaded);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image upload failed." }, { status: 502 });
  }
}
