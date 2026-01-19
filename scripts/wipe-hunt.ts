#!/usr/bin/env npx tsx

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const dryRun = process.argv.includes("--dry-run") || process.argv.includes("-n");

async function main() {
  if (!ADMIN_API_KEY) {
    console.error("ERROR: ADMIN_API_KEY environment variable is not set");
    process.exit(1);
  }

  const url = dryRun
    ? `${BASE_URL}/api/admin/hunt/wipe?dryRun=1`
    : `${BASE_URL}/api/admin/hunt/wipe`;

  console.log(`Calling POST ${url} ...`);
  if (dryRun) console.log("(DRY RUN - no data will be deleted)");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-api-key": ADMIN_API_KEY,
      },
      body: JSON.stringify({
        confirm: "wipe",
        confirm2: "I_UNDERSTAND_THIS_DELETES_HUNT_DATA",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("ERROR:", response.status, data);
      process.exit(1);
    }

    console.log("\n=== HUNT DATA WIPE RESULT ===\n");
    console.log(JSON.stringify(data, null, 2));
    console.log("\n=============================\n");
  } catch (error) {
    console.error("ERROR: Failed to call wipe endpoint:", error);
    process.exit(1);
  }
}

main();
