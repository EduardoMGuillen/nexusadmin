import { NextResponse } from "next/server";
import { ensureNexusSchema, getSql } from "@/lib/neon";

const VALID = new Set([
  "clients",
  "services",
  "incomeEntries",
  "expenseEntries",
  "employeeCosts",
  "documents",
  "businessProfile",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ collection: string }> },
) {
  try {
    const { collection } = await context.params;
    if (!VALID.has(collection)) {
      return NextResponse.json({ error: "Invalid collection" }, { status: 400 });
    }

    const body = (await request.json()) as { id: string } & Record<string, unknown>;
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await ensureNexusSchema();
    const sql = getSql();
    await sql`
      insert into public.nexus_records (collection, id, payload)
      values (${collection}, ${body.id}, ${JSON.stringify(body)}::jsonb)
      on conflict (collection, id) do update
      set payload = excluded.payload, updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown DB error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ collection: string }> },
) {
  try {
    const { collection } = await context.params;
    if (!VALID.has(collection) || collection === "businessProfile") {
      return NextResponse.json({ error: "Invalid collection" }, { status: 400 });
    }
    const { id } = (await request.json()) as { id: string };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await ensureNexusSchema();
    const sql = getSql();
    await sql`delete from public.nexus_records where collection = ${collection} and id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown DB error" },
      { status: 500 },
    );
  }
}
