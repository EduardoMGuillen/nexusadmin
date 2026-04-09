import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __nexusSql__: ReturnType<typeof postgres> | undefined;
}

export function getSql() {
  const connectionString =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Database URL missing. Set one of: DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, NEON_DATABASE_URL",
    );
  }

  if (!global.__nexusSql__) {
    global.__nexusSql__ = postgres(connectionString, {
      ssl: "require",
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return global.__nexusSql__;
}

export async function ensureNexusSchema() {
  const sql = getSql();
  await sql`
    create table if not exists nexus_records (
      collection text not null,
      id text not null,
      payload jsonb not null,
      updated_at timestamptz default now(),
      primary key (collection, id)
    )
  `;
  await sql`
    create index if not exists idx_nexus_records_collection
    on nexus_records (collection)
  `;
  await sql`
    create index if not exists idx_nexus_records_updated_at
    on nexus_records (updated_at desc)
  `;
}
