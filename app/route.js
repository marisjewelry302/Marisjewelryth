import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const indexHtml = await readFile(path.join(process.cwd(), "index.html"), "utf8");

  return new NextResponse(indexHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}
