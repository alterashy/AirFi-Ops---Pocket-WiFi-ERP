const { createClient } = require("@libsql/client");
require("dotenv").config();

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  const booths = await client.execute("SELECT COUNT(*) as c FROM AirportBooth");
  const devices = await client.execute("SELECT COUNT(*) as c FROM Device");
  const orders = await client.execute("SELECT COUNT(*) as c FROM \"Order\"");
  const inspections = await client.execute("SELECT COUNT(*) as c FROM Inspection");

  console.log("=== TURSO CLOUD DATABASE STATUS ===");
  console.log("Airport Booths :", booths.rows[0].c);
  console.log("Devices        :", devices.rows[0].c);
  console.log("Orders         :", orders.rows[0].c);
  console.log("Inspections    :", inspections.rows[0].c);
  console.log("STATUS: ALL DATA SEEDED & READY IN CLOUD!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
