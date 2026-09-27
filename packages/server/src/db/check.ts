import 'dotenv/config';
import { pool } from './index.js';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT 1 as connected');
    client.release();
    return res.rows[0]?.connected === 1;
  } catch (err) {
    console.error('⚠️ Database healthcheck failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkDatabaseHealth()
    .then(async (ok) => {
      await pool.end();
      if (ok) {
        console.log('✅ PostgreSQL connection verified.');
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(async () => {
      await pool.end();
      process.exit(1);
    });
}
