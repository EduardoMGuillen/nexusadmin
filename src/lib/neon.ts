import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __nexusSql__: ReturnType<typeof postgres> | undefined;
}

export function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for Neon connection.");
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
