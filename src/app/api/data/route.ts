import { NextResponse } from "next/server";
import { ensureNexusSchema, getSql } from "@/lib/neon";

const COLLECTIONS = [
  "clients",
  "services",
  "incomeEntries",
  "expenseEntries",
  "employeeCosts",
  "documents",
] as const;

export async function GET() {
  try {
    await ensureNexusSchema();
    const sql = getSql();

    const rows = await sql<{
      collection: string;
      payload: Record<string, unknown>;
    }[]>`
      select collection, payload
      from public.nexus_records
      where collection = any(${sql.array([...COLLECTIONS, "businessProfile"])})
      order by updated_at desc
    `;

    const grouped: Record<string, Record<string, unknown>[]> = {
      clients: [],
      services: [],
      incomeEntries: [],
      expenseEntries: [],
      employeeCosts: [],
      documents: [],
      businessProfile: [],
    };

    rows.forEach((row) => {
      if (!grouped[row.collection]) grouped[row.collection] = [];
      grouped[row.collection].push(row.payload);
    });

    const businessProfile =
      grouped.businessProfile[0] ??
      ({
        id: "main",
        businessName: "Nexus Global",
        websiteUrl: "https://www.nexusglobalsuministros.com/",
        baseCurrency: "USD",
      } as const);

    if (!grouped.businessProfile.length) {
      const profilePayload = businessProfile as unknown as never;
      await sql`
        insert into public.nexus_records (collection, id, payload)
        values ('businessProfile', 'main', ${sql.json(profilePayload)})
        on conflict (collection, id) do update
        set payload = excluded.payload, updated_at = now()
      `;
    }

    return NextResponse.json({
      clients: grouped.clients,
      services: grouped.services,
      incomeEntries: grouped.incomeEntries,
      expenseEntries: grouped.expenseEntries,
      employeeCosts: grouped.employeeCosts,
      documents: grouped.documents,
      businessProfile,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown DB error" },
      { status: 500 },
    );
  }
}
