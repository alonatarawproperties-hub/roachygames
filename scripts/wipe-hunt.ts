#!/usr/bin/env npx tsx

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function main() {
  if (!ADMIN_API_KEY) {
    console.error("ERROR: ADMIN_API_KEY environment variable is not set");
    process.exit(1);
  }

  console.log(`Calling POST ${BASE_URL}/api/admin/hunt/wipe ...`);

  try {
    const response = await fetch(`${BASE_URL}/api/admin/hunt/wipe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-api-key": ADMIN_API_KEY,
      },
      body: JSON.stringify({ confirm: "wipe" }),
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
