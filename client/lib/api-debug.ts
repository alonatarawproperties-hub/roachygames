export type ApiDebugEntry = {
  id: string;
  ts: number;
  kind: "http" | "event";
  baseUrl?: string;
  url?: string;
  path?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  tokenExists?: boolean;
  headerSet?: boolean;
  error?: string | null;
  responsePreview?: string | null;
  extra?: string | null;
  requestId?: string | null;
};

let entries: ApiDebugEntry[] = [];
let listeners: Set<(e: ApiDebugEntry[]) => void> = new Set();

export function pushApiDebug(entry: ApiDebugEntry): void {
  entries = [entry, ...entries].slice(0, 10);
  listeners.forEach((cb) => cb(entries));
}

export function subscribeApiDebug(cb: (e: ApiDebugEntry[]) => void): () => void {
  listeners.add(cb);
  cb(entries);
  return () => listeners.delete(cb);
}

export function getApiDebug(): ApiDebugEntry[] {
  return entries;
}

export function clearApiDebug(): void {
  entries = [];
  listeners.forEach((cb) => cb(entries));
}

let idCounter = 0;
export function genDebugId(): string {
  return `dbg_${Date.now()}_${++idCounter}`;
}
