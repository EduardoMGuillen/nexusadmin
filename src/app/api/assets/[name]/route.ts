import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export async function GET(_: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  if (!["NexusGPTHD.png", "nexustexto.png"].includes(name)) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  try {
    const filePath = join(process.cwd(), name);
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}
