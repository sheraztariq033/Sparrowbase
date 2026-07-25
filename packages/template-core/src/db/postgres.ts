// ── SparrowBase Edge-Native PostgreSQL Connector ──
// Uses Cloudflare Workers native fetch() to query PostgreSQL via Neon HTTP API or Hyperdrive.
// Requires ZERO external C++ dependencies or Node.js native sockets.

export interface PostgresQueryOptions {
  connectionString: string;
  query: string;
  params?: any[];
}

/**
 * Execute a SQL query against Neon / PostgreSQL over HTTP (Edge Native).
 */
export async function queryPostgres<T = any>(options: PostgresQueryOptions): Promise<{ rows: T[]; rowCount: number }> {
  const { connectionString, query, params = [] } = options;

  if (!connectionString) {
    throw new Error('[SparrowBase Postgres] connectionString is required.');
  }

  // Parse connection string for host and credentials
  const url = new URL(connectionString);
  const host = url.hostname;
  const password = url.password;

  // Neon HTTP Endpoint
  const neonHttpUrl = `https://${host}/sql`;

  const response = await fetch(neonHttpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${password}`,
      'Neon-Connection-String': connectionString,
    },
    body: JSON.stringify({ query, params }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[SparrowBase Postgres Error] ${response.status}: ${errText}`);
  }

  const result = (await response.json()) as any;
  return {
    rows: result.rows || [],
    rowCount: result.rowCount || 0,
  };
}

/**
 * Helper to get a Postgres client wrapper for edge workers.
 */
export function getPostgresClient(connectionString: string) {
  return {
    query: <T = any>(sql: string, params?: any[]) =>
      queryPostgres<T>({ connectionString, query: sql, params }),
  };
}
