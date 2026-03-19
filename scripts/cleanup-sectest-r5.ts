/**
 * Cleanup script: delete all skills, repos, and agent users created by the
 * R5 security tester (names/usernames matching 'sectest-r5' or 'deploy-sectest').
 *
 * Usage:  npx tsx scripts/cleanup-sectest-r5.ts
 * Requires DATABASE_URL in .env
 */

import "dotenv/config";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const PATTERNS = ["sectest-r5%", "deploy-sectest%"];
const patternSQL = PATTERNS.map((_, i) => `lower(name) LIKE $${i + 1}`).join(" OR ");
const userPatternSQL = PATTERNS.map((_, i) => `lower(username) LIKE $${i + 1}`).join(" OR ");

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Find skill IDs to delete
    const skillIds = await client.query(
      `SELECT id, name FROM skills WHERE ${patternSQL}`,
      PATTERNS
    );
    const ids = skillIds.rows.map((r: { id: string }) => r.id);

    if (ids.length > 0) {
      const fbRes = await client.query(
        `DELETE FROM skill_feedback WHERE skill_id = ANY($1) RETURNING id`,
        [ids]
      );
      console.log(`Deleted ${fbRes.rowCount} skill_feedback rows`);

      const evRes = await client.query(
        `DELETE FROM skill_events WHERE skill_id = ANY($1) RETURNING id`,
        [ids]
      );
      console.log(`Deleted ${evRes.rowCount} skill_events rows`);
    }

    // 2. Delete skills
    const skillRes = await client.query(
      `DELETE FROM skills WHERE ${patternSQL} RETURNING id, name`,
      PATTERNS
    );
    console.log(`Deleted ${skillRes.rowCount} skills:`);
    for (const row of skillRes.rows) {
      console.log(`  - ${row.name} (${row.id})`);
    }

    // 3. Delete repos
    const repoRes = await client.query(
      `DELETE FROM repos WHERE ${patternSQL} RETURNING id, name`,
      PATTERNS
    );
    console.log(`Deleted ${repoRes.rowCount} repos:`);
    for (const row of repoRes.rows) {
      console.log(`  - ${row.name} (${row.id})`);
    }

    // 4. Find matching user IDs and delete their dependent rows
    const userIds = await client.query(
      `SELECT id FROM users WHERE (${userPatternSQL}) AND role = 'agent'`,
      PATTERNS
    );
    const uids = userIds.rows.map((r: { id: string }) => r.id);

    if (uids.length > 0) {
      const akRes = await client.query(
        `DELETE FROM api_keys WHERE user_id = ANY($1) RETURNING id`,
        [uids]
      );
      console.log(`Deleted ${akRes.rowCount} api_keys rows`);

      const stRes = await client.query(
        `DELETE FROM stars WHERE user_id = ANY($1) RETURNING id`,
        [uids]
      );
      console.log(`Deleted ${stRes.rowCount} stars rows`);

      const dnRes = await client.query(
        `DELETE FROM donations WHERE from_user_id = ANY($1) RETURNING id`,
        [uids]
      );
      console.log(`Deleted ${dnRes.rowCount} donations rows`);

      const seRes = await client.query(
        `DELETE FROM skill_events WHERE agent_id = ANY($1) RETURNING id`,
        [uids]
      );
      console.log(`Deleted ${seRes.rowCount} skill_events (agent) rows`);

      const sfRes = await client.query(
        `DELETE FROM skill_feedback WHERE agent_id = ANY($1) RETURNING id`,
        [uids]
      );
      console.log(`Deleted ${sfRes.rowCount} skill_feedback (agent) rows`);
    }

    // 5. Delete agent users
    const userRes = await client.query(
      `DELETE FROM users WHERE (${userPatternSQL}) AND role = 'agent' RETURNING id, username`,
      PATTERNS
    );
    console.log(`Deleted ${userRes.rowCount} agent users:`);
    for (const row of userRes.rows) {
      console.log(`  - ${row.username} (${row.id})`);
    }

    await client.query("COMMIT");
    console.log("\nCleanup complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Cleanup failed, rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
