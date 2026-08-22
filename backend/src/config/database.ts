import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";

import { env } from "./env.js";

const caCertificate = readFileSync(
  resolve(process.cwd(), env.databaseCaCertPath),
  "utf8",
);

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: {
    ca: caCertificate,
    rejectUnauthorized: true,
  },
});

export async function connectDatabase(): Promise<void> {
  await pool.query("SELECT 1");
}

export default pool;