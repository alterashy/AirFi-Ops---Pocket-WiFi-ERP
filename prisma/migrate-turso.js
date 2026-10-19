const { createClient } = require("@libsql/client");
const { execSync } = require("child_process");
require("dotenv").config();

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment!");
    process.exit(1);
  }

  console.log("Generating Prisma DDL SQL...");
  const rawDdl = execSync("npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script").toString();
  
  // Remove any stdout noise like "Loaded Prisma config..."
  const ddlLines = rawDdl.split("\n").filter(line => !line.startsWith("Loaded Prisma config"));
  const cleanDdl = ddlLines.join("\n");

  console.log("Connecting to Turso at:", url);
  const client = createClient({ url, authToken });

  console.log("Executing DDL on Turso...");
  await client.executeMultiple(cleanDdl);
  console.log("Tables created successfully on Turso!");

  const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  console.log("Current Turso tables:", res.rows.map(r => r.name));
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
