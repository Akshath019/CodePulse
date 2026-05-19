import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "codepulse",
  password: "codepulse123",
  database: "codepulsedb",
});

pool.on("connect", () => {
  console.log("[DB] Connected to Postgres");
});

pool.on("error", (err) => {
  console.error("[DB] Pool error:", err);
});

// Test connection on startup
export async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("[DB] Connection OK. Server time:", result.rows[0].now);
  } catch (err) {
    console.error("[DB] Connection failed:", err);
    throw err;
  }
}
