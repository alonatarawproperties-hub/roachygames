import assert from "assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const WALLET = process.env.TEST_WALLET || `sec_test_${Date.now()}`;
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body, useAdminKey = false) {
  const headers = { "content-type": "application/json" };
  if (useAdminKey && ADMIN_KEY) {
    headers["x-admin-secret"] = ADMIN_KEY;
    headers["x-admin-key"] = ADMIN_KEY; // backward compat for /api/hunt/spawn
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { res, json, text };
}

async function testLocation() {
  console.log("\n[TEST A] /api/hunt/location anti-teleport + accuracy gating");

  const t0 = Date.now();

  // Baseline location (should accept)
  const r1 = await post("/api/hunt/location", {
    walletAddress: WALLET,
    latitude: 14.5995,
    longitude: 120.9842,
    accuracy: 10,
    timestamp: t0,
    displayName: "SecTest",
  });
  assert([200, 201].includes(r1.res.status), `Expected 200/201, got ${r1.res.status} body=${r1.text}`);
  console.log("  ✓ baseline accepted", r1.res.status);

  // Teleport in 1 second (should reject with 422 LOCATION_JUMP_REJECTED)
  const r2 = await post("/api/hunt/location", {
    walletAddress: WALLET,
    latitude: 14.6760,
    longitude: 121.0437,
    accuracy: 10,
    timestamp: t0 + 1000,
  });
  assert(r2.res.status === 422, `Expected 422 teleport reject, got ${r2.res.status} body=${r2.text}`);
  assert(r2.json?.error === "LOCATION_JUMP_REJECTED" || r2.text.includes("LOCATION_JUMP_REJECTED"),
    `Expected LOCATION_JUMP_REJECTED, got body=${r2.text}`);
  console.log("  ✓ teleport rejected (422 LOCATION_JUMP_REJECTED)");

  // Bad accuracy (should reject with 422 LOCATION_ACCURACY_TOO_LOW)
  const r3 = await post("/api/hunt/location", {
    walletAddress: WALLET,
    latitude: 14.5996,
    longitude: 120.9843,
    accuracy: 150,
    timestamp: t0 + 3000,
  });
  assert(r3.res.status === 422, `Expected 422 accuracy reject, got ${r3.res.status} body=${r3.text}`);
  assert(r3.json?.error === "LOCATION_ACCURACY_TOO_LOW" || r3.text.includes("LOCATION_ACCURACY_TOO_LOW"),
    `Expected LOCATION_ACCURACY_TOO_LOW, got body=${r3.text}`);
  console.log("  ✓ poor accuracy rejected (422 LOCATION_ACCURACY_TOO_LOW)");

  console.log("[TEST A] PASS");
}

async function testCatchAtomic() {
  console.log("\n[TEST B] /api/hunt/catch atomic claim (parallel)");

  // Create test spawn via admin test-spawn endpoint (forces creation)
  const spawnResp = await post("/api/hunt/test-spawn", {
    latitude: 14.5995,
    longitude: 120.9842,
  }, true);

  assert(spawnResp.res.status === 200, `Test spawn create failed. status=${spawnResp.res.status} body=${spawnResp.text}`);
  const spawnId = spawnResp.json?.spawn?.id;
  assert(spawnId, `No spawnId returned. body=${spawnResp.text}`);
  console.log("  ✓ created spawn", spawnId);

  const payload = {
    walletAddress: WALLET,
    spawnId,
    catchQuality: "GOOD",
    latitude: 14.5995,
    longitude: 120.9842,
  };

  const attempts = 5;
  const results = await Promise.all(
    Array.from({ length: attempts }).map(() => post("/api/hunt/catch", payload))
  );

  const success = results.filter(r => r.res.status === 200).length;
  const conflicts = results.filter(r =>
    r.res.status === 409 &&
    (r.json?.error === "SPAWN_ALREADY_CLAIMED_OR_EXPIRED" || r.text.includes("SPAWN_ALREADY_CLAIMED_OR_EXPIRED"))
  ).length;

  assert(success === 1, `Expected exactly 1 success, got ${success}. Results=${results.map(r=>({s:r.res.status,b:r.json||r.text})).slice(0,5)}`);
  assert(conflicts >= 1, `Expected some 409 conflicts, got ${conflicts}. Results=${results.map(r=>({s:r.res.status,b:r.json||r.text})).slice(0,5)}`);

  console.log(`  ✓ success=${success}, conflicts=${conflicts}`);
  console.log("[TEST B] PASS");
}

async function main() {
  console.log("Running security tests against:", BASE_URL);

  // If server is not on 3000, detect from env PORT if possible
  // (Leave as-is; user can set BASE_URL if needed)

  await testLocation();
  await testCatchAtomic();

  console.log("\nALL SECURITY TESTS PASS ✅");
}

main().catch((e) => {
  console.error("\nSECURITY TESTS FAIL ❌");
  console.error(e);
  process.exit(1);
});
