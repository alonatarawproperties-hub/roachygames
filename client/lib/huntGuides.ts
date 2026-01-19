import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  onboardingCompleted: "hunt_onboarding_completed",
  tipCounts: "hunt_tip_counts",
  lastTipTs: "hunt_last_tip_ts",
  seenQuestKeys: "hunt_seen_quest_keys",
};

const MAX_TIP_SHOWS = 3;
const TIP_COOLDOWN_MS = 20000;

export async function getBool(key: string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(key);
    return val === "true";
  } catch {
    return false;
  }
}

export async function setBool(key: string, val: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(key, val ? "true" : "false");
  } catch {}
}

export async function isOnboardingCompleted(): Promise<boolean> {
  return getBool(KEYS.onboardingCompleted);
}

export async function setOnboardingCompleted(val: boolean): Promise<void> {
  return setBool(KEYS.onboardingCompleted, val);
}

async function getTipCounts(): Promise<Record<string, number>> {
  try {
    const val = await AsyncStorage.getItem(KEYS.tipCounts);
    return val ? JSON.parse(val) : {};
  } catch {
    return {};
  }
}

async function setTipCounts(counts: Record<string, number>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.tipCounts, JSON.stringify(counts));
  } catch {}
}

export async function incrementTipCount(tipId: string): Promise<number> {
  const counts = await getTipCounts();
  const newCount = (counts[tipId] || 0) + 1;
  counts[tipId] = newCount;
  await setTipCounts(counts);
  return newCount;
}

export async function getTipCount(tipId: string): Promise<number> {
  const counts = await getTipCounts();
  return counts[tipId] || 0;
}

async function getLastTipTs(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(KEYS.lastTipTs);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

async function setLastTipTs(ts: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.lastTipTs, ts.toString());
  } catch {}
}

export async function canShowTip(tipId: string): Promise<boolean> {
  const count = await getTipCount(tipId);
  if (count >= MAX_TIP_SHOWS) return false;
  const lastTs = await getLastTipTs();
  if (Date.now() - lastTs < TIP_COOLDOWN_MS) return false;
  return true;
}

export async function markTipShown(tipId: string): Promise<void> {
  await incrementTipCount(tipId);
  await setLastTipTs(Date.now());
}

async function getSeenQuestKeys(): Promise<Set<string>> {
  try {
    const val = await AsyncStorage.getItem(KEYS.seenQuestKeys);
    return val ? new Set(JSON.parse(val)) : new Set();
  } catch {
    return new Set();
  }
}

async function setSeenQuestKeys(keys: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.seenQuestKeys, JSON.stringify([...keys]));
  } catch {}
}

export async function hasSeenQuestKey(key: string): Promise<boolean> {
  const keys = await getSeenQuestKeys();
  return keys.has(key);
}

export async function markQuestKeySeen(key: string): Promise<void> {
  const keys = await getSeenQuestKeys();
  keys.add(key);
  await setSeenQuestKeys(keys);
}

export function formatSeconds(sec: number): string {
  if (sec <= 0) return "0s";
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (min < 60) return s > 0 ? `${min}m ${s}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${hr}h ${m}m` : `${hr}h`;
}
