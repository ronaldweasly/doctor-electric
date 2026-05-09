// =============================================================================
// Database Connection Pool
// =============================================================================
// Uses pg Pool for connection pooling.
// WHY pooling: Reuses database connections instead of creating a new one per
// request. Critical for performance — connecting to PostgreSQL takes ~50ms,
// reusing a pooled connection takes <1ms.
// =============================================================================

import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Pool sizing for 4GB VPS with 1-50 users
  max: 20,                    // Max connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5s
  // SSL: disabled for internal Docker network communication
  ssl: false,
});

// Log pool errors (don't crash the server)
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

/**
 * Test database connectivity. Called during server startup.
 */
export async function testConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() as current_time, current_database() as db');
    console.log(`🗄️  Connected to PostgreSQL: ${result.rows[0].db} at ${result.rows[0].current_time}`);
  } finally {
    client.release();
  }
}

/**
 * Helper: Execute a parameterized query
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  // Log slow queries (>500ms) for debugging
  if (duration > 500) {
    console.warn(`⚠️  Slow query (${duration}ms):`, text.substring(0, 100));
  }

  return result;
}
