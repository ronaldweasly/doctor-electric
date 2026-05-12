/**
 * Database Transaction Utilities
 * Provides helpers for safe transaction management with BEGIN/COMMIT/ROLLBACK
 */

import { pool } from './pool.js';

export interface TransactionFn {
  (query: (sql: string, values?: any[]) => Promise<any>): Promise<any>;
}

/**
 * Execute a function within a database transaction
 * Automatically commits on success, rolls back on error
 *
 * Usage:
 * await withTransaction(async (query) => {
 *   await query('DELETE FROM table1 WHERE id = $1', [id]);
 *   await query('DELETE FROM table2 WHERE id = $1', [id]);
 * });
 */
export async function withTransaction(fn: TransactionFn): Promise<any> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Provide transaction-scoped query function
    const queryInTransaction = (sql: string, values?: any[]) => {
      return client.query(sql, values);
    };
    
    const result = await fn(queryInTransaction);
    
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err; // Re-throw the error so caller can handle it
  } finally {
    client.release();
  }
}
