import { NextResponse } from "next/server";
import { ensureNexusSchema, getSql } from "@/lib/neon";

export async function GET() {
  try {
    await ensureNexusSchema();
    const sql = getSql();
    const ping = await sql<{ ok: number }[]>`select 1 as ok`;
    const count = await sql<{ total: number }[]>`
      select count(*)::int as total
      from public.nexus_records
    `;

    return NextResponse.json({
      ok: true,
      dbReachable: ping[0]?.ok === 1,
      records: count[0]?.total ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown DB error",
      },
      { status: 500 },
    );
  }
}
