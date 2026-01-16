import type { Express, Request, Response } from "express";
import { db } from "./db";
import {
  huntNodes,
  huntNodePlayerState,
  huntLocationSamples,
  huntEventWindows,
  huntEconomyStats,
} from "@shared/schema";
import { eq, and, or, gte, lte, lt, inArray, sql, desc, isNull } from "drizzle-orm";
import { resolvedConfig, ACTIVE_SCENARIO, selectQuality, NodeType, NodeQuality } from "./huntSpawnConfig";
import {
  haversineMeters,
  makeRegionKey,
  makeCellKey,
  randomPointInRadius,
  randomPointInCone,
  headingFromLastSamples,
  detectTeleport,
  averageSpeed,
} from "./geo";

function log(context: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [NODE] [${context}] ${message}`, data ? JSON.stringify(data) : "");
}

async function expireNodes() {
  const now = new Date();
  try {
    const expiredNodes = await db
      .select({ id: huntNodes.id })
      .from(huntNodes)
      .where(lt(huntNodes.expiresAt, now));

    if (expiredNodes.length === 0) return;

    const expiredIds = expiredNodes.map((n) => n.id);

    await db
      .update(huntNodePlayerState)
      .set({ status: "EXPIRED", updatedAt: now })
      .where(
        and(
          inArray(huntNodePlayerState.nodeId, expiredIds),
          inArray(huntNodePlayerState.status, ["AVAILABLE", "RESERVED"])
        )
      );

    log("CRON", `Expired ${expiredNodes.length} nodes`);
  } catch (err: any) {
    log("CRON", `Expire error: ${err.message}`);
  }
}

async function cleanupOldData() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    await db
      .delete(huntLocationSamples)
      .where(lt(huntLocationSamples.createdAt, oneDayAgo));

    await db
      .delete(huntNodes)
      .where(lt(huntNodes.expiresAt, oneWeekAgo));

    log("CRON", "Cleaned up old location samples and expired nodes");
  } catch (err: any) {
    log("CRON", `Cleanup error: ${err.message}`);
  }
}

let cronStarted = false;
function startCronJobs() {
  if (cronStarted) return;
  cronStarted = true;

  setInterval(() => {
    expireNodes();
  }, 60 * 1000);

  setInterval(() => {
    cleanupOldData();
  }, 60 * 60 * 1000);

  log("CRON", "Cron jobs started: expire every 1min, cleanup every 1hr");
}

function selectDistanceBucket(): { minM: number; maxM: number } {
  const buckets = resolvedConfig.PERSONAL.DISTANCE_BUCKETS;
  const roll = Math.random();
  let cumulative = 0;
  for (const bucket of buckets) {
    cumulative += bucket.weight;
    if (roll <= cumulative) {
      return { minM: bucket.minM, maxM: bucket.maxM };
    }
  }
  return buckets[buckets.length - 1];
}

function getManilaHour(): number {
  const now = new Date();
  const manilaOffset = 8 * 60;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const manilaTime = new Date(utcTime + manilaOffset * 60000);
  return manilaTime.getHours();
}

function getActiveEventWindow(): { key: string; window: typeof resolvedConfig.EVENTS.WINDOWS[0] } | null {
  const hour = getManilaHour();
  for (const w of resolvedConfig.EVENTS.WINDOWS) {
    if (hour >= w.startHour && hour < w.endHour) {
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
      return { key: `${w.key}_${dateStr}`, window: w };
    }
  }
  return null;
}

async function getRecentSamples(walletAddress: string, limit = 5) {
  const samples = await db
    .select()
    .from(huntLocationSamples)
    .where(eq(huntLocationSamples.walletAddress, walletAddress))
    .orderBy(desc(huntLocationSamples.createdAt))
    .limit(limit);
  return samples;
}

async function ensurePersonalNodes(
  walletAddress: string,
  lat: number,
  lng: number,
  samples: any[]
) {
  const now = new Date();
  const config = resolvedConfig.PERSONAL;

  const activeStates = await db
    .select({
      nodeId: huntNodePlayerState.nodeId,
      status: huntNodePlayerState.status,
      node: huntNodes,
    })
    .from(huntNodePlayerState)
    .innerJoin(huntNodes, eq(huntNodePlayerState.nodeId, huntNodes.id))
    .where(
      and(
        eq(huntNodePlayerState.walletAddress, walletAddress),
        eq(huntNodes.type, "PERSONAL"),
        gte(huntNodes.expiresAt, now),
        inArray(huntNodePlayerState.status, ["AVAILABLE", "RESERVED", "ARRIVED"])
      )
    );

  const needed = config.ACTIVE_AT_ONCE - activeStates.length;
  if (needed <= 0) {
    log("PERSONAL", `User ${walletAddress.slice(-8)} has ${activeStates.length} active personal nodes, no spawn needed`);
    return;
  }

  log("PERSONAL", `Spawning ${needed} personal nodes for ${walletAddress.slice(-8)}`);

  const regionKey = makeRegionKey(lat, lng, resolvedConfig.GRID.REGION_SIZE_KM);
  const cellKey = makeCellKey(lat, lng, resolvedConfig.GRID.CELL_SIZE_KM);
  const expiresAt = new Date(now.getTime() + config.EXPIRE_MS);

  const avgSpeed = averageSpeed(samples);
  const isMoving = avgSpeed >= resolvedConfig.MOVEMENT.MOVING_SPEED_MPS;
  const heading = isMoving ? headingFromLastSamples(samples) : null;

  for (let i = 0; i < needed; i++) {
    let point: { lat: number; lng: number };

    if (isMoving && heading !== null && resolvedConfig.ROUTE_RUNNER.ENABLED) {
      point = randomPointInCone(
        lat,
        lng,
        heading,
        resolvedConfig.ROUTE_RUNNER.HEADING_CONE_DEGREES,
        resolvedConfig.ROUTE_RUNNER.SPAWN_AHEAD_MIN_M,
        resolvedConfig.ROUTE_RUNNER.SPAWN_AHEAD_MAX_M
      );
      log("ROUTE_RUNNER", `Spawning ahead at heading ${heading.toFixed(0)}deg`, { lat: point.lat.toFixed(5), lng: point.lng.toFixed(5) });
    } else {
      const bucket = selectDistanceBucket();
      point = randomPointInRadius(lat, lng, bucket.minM, bucket.maxM);
      log("PERSONAL", `Static spawn in bucket ${bucket.minM}-${bucket.maxM}m`, { lat: point.lat.toFixed(5), lng: point.lng.toFixed(5) });
    }

    const quality = selectQuality(resolvedConfig.QUALITY.WEIGHTS_PERSONAL);

    const [node] = await db
      .insert(huntNodes)
      .values({
        type: "PERSONAL",
        regionKey,
        cellKey,
        lat: point.lat,
        lng: point.lng,
        quality,
        startsAt: now,
        expiresAt,
      })
      .returning();

    await db.insert(huntNodePlayerState).values({
      nodeId: node.id,
      walletAddress,
      status: "AVAILABLE",
    });
  }
}

async function ensureHotspots(lat: number, lng: number) {
  const now = new Date();
  const config = resolvedConfig.HOTSPOT;
  const regionKey = makeRegionKey(lat, lng, resolvedConfig.GRID.REGION_SIZE_KM);

  const existingHotspots = await db
    .select()
    .from(huntNodes)
    .where(
      and(
        eq(huntNodes.type, "HOTSPOT"),
        eq(huntNodes.regionKey, regionKey),
        gte(huntNodes.expiresAt, now)
      )
    );

  if (existingHotspots.length >= config.HOTSPOTS_PER_CELL * config.NODES_PER_HOTSPOT) {
    log("HOTSPOT", `Region ${regionKey} has ${existingHotspots.length} active hotspot nodes`);
    return existingHotspots;
  }

  log("HOTSPOT", `Creating hotspots for region ${regionKey}`);

  const expiresAt = new Date(now.getTime() + config.EXPIRE_MS);
  const createdNodes: any[] = [];

  for (let h = 0; h < config.HOTSPOTS_PER_CELL; h++) {
    const groupId = `${regionKey}_HS${h}_${Date.now()}`;
    const anchor = randomPointInRadius(lat, lng, 200, 800);

    for (let n = 0; n < config.NODES_PER_HOTSPOT; n++) {
      const point = randomPointInRadius(anchor.lat, anchor.lng, 0, config.CLUSTER_RADIUS_M);
      const quality = selectQuality(resolvedConfig.QUALITY.WEIGHTS_HOTSPOT);
      const cellKey = makeCellKey(point.lat, point.lng, resolvedConfig.GRID.CELL_SIZE_KM);

      const [node] = await db
        .insert(huntNodes)
        .values({
          type: "HOTSPOT",
          regionKey,
          cellKey,
          lat: point.lat,
          lng: point.lng,
          quality,
          startsAt: now,
          expiresAt,
          groupId,
        })
        .returning();

      createdNodes.push(node);
    }
  }

  log("HOTSPOT", `Created ${createdNodes.length} hotspot nodes in ${config.HOTSPOTS_PER_CELL} groups`);
  return [...existingHotspots, ...createdNodes];
}

async function ensureEventNodes(walletAddress: string, lat: number, lng: number) {
  const event = getActiveEventWindow();
  if (!event) return [];

  const now = new Date();
  const config = event.window;
  const regionKey = makeRegionKey(lat, lng, resolvedConfig.GRID.REGION_SIZE_KM);
  const cellKey = makeCellKey(lat, lng, resolvedConfig.GRID.CELL_SIZE_KM);

  const existingEventNodes = await db
    .select({
      nodeId: huntNodePlayerState.nodeId,
      status: huntNodePlayerState.status,
      node: huntNodes,
    })
    .from(huntNodePlayerState)
    .innerJoin(huntNodes, eq(huntNodePlayerState.nodeId, huntNodes.id))
    .where(
      and(
        eq(huntNodePlayerState.walletAddress, walletAddress),
        eq(huntNodes.type, "EVENT"),
        eq(huntNodes.eventKey, event.key),
        gte(huntNodes.expiresAt, now)
      )
    );

  const needed = config.dropsPer - existingEventNodes.length;
  if (needed <= 0) {
    log("EVENT", `User ${walletAddress.slice(-8)} has ${existingEventNodes.length} event nodes for ${event.key}`);
    return existingEventNodes.map((e) => e.node);
  }

  log("EVENT", `Spawning ${needed} event nodes for ${walletAddress.slice(-8)} (${event.key})`);

  const expiresAt = new Date(now.getTime() + config.expireMs);
  const createdNodes: any[] = [];

  for (let i = 0; i < needed; i++) {
    const point = randomPointInRadius(lat, lng, config.minM, config.maxM);
    const quality = config.qualityBoost as NodeQuality;

    const [node] = await db
      .insert(huntNodes)
      .values({
        type: "EVENT",
        regionKey,
        cellKey,
        lat: point.lat,
        lng: point.lng,
        quality,
        startsAt: now,
        expiresAt,
        eventKey: event.key,
      })
      .returning();

    await db.insert(huntNodePlayerState).values({
      nodeId: node.id,
      walletAddress,
      status: "AVAILABLE",
    });

    createdNodes.push(node);
  }

  return [...existingEventNodes.map((e) => e.node), ...createdNodes];
}

async function getNodesForUser(walletAddress: string) {
  const now = new Date();

  const states = await db
    .select({
      stateId: huntNodePlayerState.id,
      nodeId: huntNodePlayerState.nodeId,
      status: huntNodePlayerState.status,
      reservedUntil: huntNodePlayerState.reservedUntil,
      node: huntNodes,
    })
    .from(huntNodePlayerState)
    .innerJoin(huntNodes, eq(huntNodePlayerState.nodeId, huntNodes.id))
    .where(
      and(
        eq(huntNodePlayerState.walletAddress, walletAddress),
        gte(huntNodes.expiresAt, now),
        inArray(huntNodePlayerState.status, ["AVAILABLE", "RESERVED", "ARRIVED"])
      )
    );

  return states;
}

async function getHotspotsForUserInRegion(walletAddress: string, regionKey: string) {
  const now = new Date();

  const hotspots = await db
    .select()
    .from(huntNodes)
    .where(
      and(
        eq(huntNodes.type, "HOTSPOT"),
        eq(huntNodes.regionKey, regionKey),
        gte(huntNodes.expiresAt, now)
      )
    );

  const hotspotIds = hotspots.map((h) => h.id);
  if (hotspotIds.length === 0) return [];

  const existingStates = await db
    .select()
    .from(huntNodePlayerState)
    .where(
      and(
        eq(huntNodePlayerState.walletAddress, walletAddress),
        inArray(huntNodePlayerState.nodeId, hotspotIds)
      )
    );

  const stateMap = new Map(existingStates.map((s) => [s.nodeId, s]));

  return hotspots.map((h) => {
    const state = stateMap.get(h.id);
    return {
      nodeId: h.id,
      type: h.type as NodeType,
      lat: h.lat,
      lng: h.lng,
      quality: h.quality as NodeQuality,
      expiresAt: h.expiresAt,
      groupId: h.groupId,
      status: state?.status || "AVAILABLE",
      reservedUntil: state?.reservedUntil || null,
    };
  });
}

export function registerNodeRoutes(app: Express) {
  startCronJobs();

  app.post("/api/location/update", async (req: Request, res: Response) => {
    try {
      const { lat, lng, accuracy, speedMps, headingDeg, clientTime } = req.body;
      const walletAddress = req.headers["x-wallet-address"] as string;

      if (!walletAddress) {
        return res.status(401).json({ error: "Wallet address required" });
      }
      if (lat == null || lng == null) {
        return res.status(400).json({ error: "lat/lng required" });
      }

      await db.insert(huntLocationSamples).values({
        walletAddress,
        lat,
        lng,
        accuracy: accuracy ?? null,
        speedMps: speedMps ?? null,
        headingDeg: headingDeg ?? null,
      });

      log("LOCATION", `Updated location for ${walletAddress.slice(-8)}`, { lat: lat.toFixed(5), lng: lng.toFixed(5) });

      res.json({ success: true });
    } catch (err: any) {
      log("LOCATION", `Error: ${err.message}`);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  app.get("/api/map/nodes", async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const walletAddress = req.headers["x-wallet-address"] as string;

      if (!walletAddress) {
        return res.status(401).json({ error: "Wallet address required" });
      }
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "lat/lng required" });
      }

      const samples = await getRecentSamples(walletAddress);
      if (samples.length > 0 && detectTeleport(samples)) {
        log("TELEPORT", `Detected teleport for ${walletAddress.slice(-8)}, skipping spawn`);
        return res.json({
          scenario: ACTIVE_SCENARIO,
          personalNodes: [],
          hotspots: [],
          events: [],
          warning: "Teleport detected, please wait",
        });
      }

      await ensurePersonalNodes(walletAddress, lat, lng, samples);
      await ensureHotspots(lat, lng);
      const eventNodes = await ensureEventNodes(walletAddress, lat, lng);

      const userNodes = await getNodesForUser(walletAddress);
      const regionKey = makeRegionKey(lat, lng, resolvedConfig.GRID.REGION_SIZE_KM);
      const hotspots = await getHotspotsForUserInRegion(walletAddress, regionKey);

      const personalNodes = userNodes
        .filter((n) => n.node.type === "PERSONAL")
        .map((n) => ({
          nodeId: n.nodeId,
          type: n.node.type as NodeType,
          lat: n.node.lat,
          lng: n.node.lng,
          quality: n.node.quality as NodeQuality,
          expiresAt: n.node.expiresAt,
          status: n.status,
          reservedUntil: n.reservedUntil,
        }));

      const events = userNodes
        .filter((n) => n.node.type === "EVENT")
        .map((n) => ({
          nodeId: n.nodeId,
          type: n.node.type as NodeType,
          lat: n.node.lat,
          lng: n.node.lng,
          quality: n.node.quality as NodeQuality,
          expiresAt: n.node.expiresAt,
          eventKey: n.node.eventKey,
          status: n.status,
          reservedUntil: n.reservedUntil,
        }));

      log("MAP", `Returning ${personalNodes.length} personal, ${hotspots.length} hotspots, ${events.length} events for ${walletAddress.slice(-8)}`);

      res.json({
        scenario: ACTIVE_SCENARIO,
        personalNodes,
        hotspots,
        events,
      });
    } catch (err: any) {
      log("MAP", `Error: ${err.message}`);
      res.status(500).json({ error: "Failed to get nodes" });
    }
  });

  app.post("/api/nodes/reserve", async (req: Request, res: Response) => {
    try {
      const { nodeId, lat, lng } = req.body;
      const walletAddress = req.headers["x-wallet-address"] as string;

      if (!walletAddress) {
        return res.status(401).json({ error: "Wallet address required" });
      }
      if (!nodeId) {
        return res.status(400).json({ error: "nodeId required" });
      }

      const now = new Date();

      const [node] = await db.select().from(huntNodes).where(eq(huntNodes.id, nodeId));
      if (!node) {
        return res.status(404).json({ error: "Node not found" });
      }
      if (new Date(node.expiresAt) < now) {
        return res.status(400).json({ error: "Node expired" });
      }

      const activeReservation = await db
        .select()
        .from(huntNodePlayerState)
        .where(
          and(
            eq(huntNodePlayerState.walletAddress, walletAddress),
            eq(huntNodePlayerState.status, "RESERVED")
          )
        )
        .limit(1);

      if (activeReservation.length > 0 && resolvedConfig.RESERVATION.MAX_ACTIVE === 1) {
        await db
          .update(huntNodePlayerState)
          .set({ status: "AVAILABLE", reservedUntil: null, updatedAt: now })
          .where(eq(huntNodePlayerState.id, activeReservation[0].id));
        log("RESERVE", `Cancelled previous reservation ${activeReservation[0].id}`);
      }

      let [state] = await db
        .select()
        .from(huntNodePlayerState)
        .where(
          and(
            eq(huntNodePlayerState.nodeId, nodeId),
            eq(huntNodePlayerState.walletAddress, walletAddress)
          )
        );

      const reservedUntil = new Date(now.getTime() + resolvedConfig.RESERVATION.DURATION_MS);

      if (state) {
        if (state.status === "COLLECTED" || state.status === "EXPIRED") {
          return res.status(400).json({ error: "Node already used" });
        }
        await db
          .update(huntNodePlayerState)
          .set({ status: "RESERVED", reservedUntil, updatedAt: now })
          .where(eq(huntNodePlayerState.id, state.id));
        state.status = "RESERVED";
        state.reservedUntil = reservedUntil;
      } else {
        [state] = await db
          .insert(huntNodePlayerState)
          .values({
            nodeId,
            walletAddress,
            status: "RESERVED",
            reservedUntil,
          })
          .returning();
      }

      log("RESERVE", `User ${walletAddress.slice(-8)} reserved node ${nodeId.slice(-8)} until ${reservedUntil.toISOString()}`);

      res.json({
        reservationId: state.id,
        nodeId,
        status: "RESERVED",
        reservedUntil,
      });
    } catch (err: any) {
      log("RESERVE", `Error: ${err.message}`);
      res.status(500).json({ error: "Failed to reserve node" });
    }
  });

  app.post("/api/nodes/arrive", async (req: Request, res: Response) => {
    try {
      const { reservationId, lat, lng } = req.body;
      const walletAddress = req.headers["x-wallet-address"] as string;

      if (!walletAddress) {
        return res.status(401).json({ error: "Wallet address required" });
      }
      if (!reservationId) {
        return res.status(400).json({ error: "reservationId required" });
      }

      const now = new Date();

      const [state] = await db
        .select({
          state: huntNodePlayerState,
          node: huntNodes,
        })
        .from(huntNodePlayerState)
        .innerJoin(huntNodes, eq(huntNodePlayerState.nodeId, huntNodes.id))
        .where(
          and(
            eq(huntNodePlayerState.id, reservationId),
            eq(huntNodePlayerState.walletAddress, walletAddress)
          )
        );

      if (!state) {
        return res.status(404).json({ error: "Reservation not found" });
      }

      if (state.state.status !== "RESERVED" && state.state.status !== "AVAILABLE") {
        return res.status(400).json({ error: `Invalid status: ${state.state.status}` });
      }

      if (lat != null && lng != null) {
        const distance = haversineMeters(lat, lng, state.node.lat, state.node.lng);
        if (distance > resolvedConfig.CATCH.ARRIVAL_DISTANCE_M) {
          return res.status(400).json({
            error: `Too far from node (${Math.round(distance)}m > ${resolvedConfig.CATCH.ARRIVAL_DISTANCE_M}m)`,
            distance: Math.round(distance),
          });
        }
      }

      await db
        .update(huntNodePlayerState)
        .set({ status: "ARRIVED", arrivedAt: now, updatedAt: now })
        .where(eq(huntNodePlayerState.id, reservationId));

      log("ARRIVE", `User ${walletAddress.slice(-8)} arrived at node ${state.node.id.slice(-8)}`);

      res.json({
        reservationId,
        nodeId: state.node.id,
        status: "ARRIVED",
        arrivedAt: now,
      });
    } catch (err: any) {
      log("ARRIVE", `Error: ${err.message}`);
      res.status(500).json({ error: "Failed to mark arrival" });
    }
  });

  app.post("/api/nodes/collect", async (req: Request, res: Response) => {
    try {
      const { reservationId, nodeId } = req.body;
      const walletAddress = req.headers["x-wallet-address"] as string;

      if (!walletAddress) {
        return res.status(401).json({ error: "Wallet address required" });
      }

      const targetId = reservationId || null;
      const now = new Date();

      let state: any;
      let node: any;

      if (targetId) {
        const result = await db
          .select({
            state: huntNodePlayerState,
            node: huntNodes,
          })
          .from(huntNodePlayerState)
          .innerJoin(huntNodes, eq(huntNodePlayerState.nodeId, huntNodes.id))
          .where(
            and(
              eq(huntNodePlayerState.id, targetId),
              eq(huntNodePlayerState.walletAddress, walletAddress)
            )
          );
        if (result.length > 0) {
          state = result[0].state;
          node = result[0].node;
        }
      } else if (nodeId) {
        const result = await db
          .select({
            state: huntNodePlayerState,
            node: huntNodes,
          })
          .from(huntNodePlayerState)
          .innerJoin(huntNodes, eq(huntNodePlayerState.nodeId, huntNodes.id))
          .where(
            and(
              eq(huntNodePlayerState.nodeId, nodeId),
              eq(huntNodePlayerState.walletAddress, walletAddress)
            )
          );
        if (result.length > 0) {
          state = result[0].state;
          node = result[0].node;
        }
      }

      if (!state || !node) {
        return res.status(404).json({ error: "Node state not found" });
      }

      if (state.status === "COLLECTED") {
        return res.status(400).json({ error: "Already collected" });
      }

      const graceTime = new Date(now.getTime() - resolvedConfig.CATCH.GRACE_ON_EXPIRE_MS);
      const nodeExpired = new Date(node.expiresAt) < now;
      const withinGrace = new Date(node.expiresAt) >= graceTime;

      if (state.status !== "ARRIVED") {
        if (nodeExpired && !withinGrace) {
          return res.status(400).json({ error: "Node expired" });
        }
      }

      await db
        .update(huntNodePlayerState)
        .set({ status: "COLLECTED", collectedAt: now, updatedAt: now })
        .where(eq(huntNodePlayerState.id, state.id));

      log("COLLECT", `User ${walletAddress.slice(-8)} collected node ${node.id.slice(-8)}`);

      res.json({
        success: true,
        nodeId: node.id,
        quality: node.quality,
        status: "COLLECTED",
        collectedAt: now,
      });
    } catch (err: any) {
      log("COLLECT", `Error: ${err.message}`);
      res.status(500).json({ error: "Failed to collect" });
    }
  });
}
