import { openDB, type IDBPDatabase } from "idb";
import type { StudentEventRecord, BufferedEvent } from "@/types/events";

const DB_NAME = "bengkelkode_events";
const DB_VERSION = 1;
const STORE_NAME = "events";
const BATCH_INTERVAL_MS = 5_000;
const BATCH_MAX_SIZE = 50;

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: "bufferId",
          autoIncrement: true,
        });
        store.createIndex("by_sent", "sent");
        store.createIndex("by_attempt_seq", ["attemptId", "seq"], {
          unique: true,
        });
      }
    },
  });
  return db;
}

export async function bufferEvent(
  event: StudentEventRecord
): Promise<void> {
  try {
    const database = await getDB();
    const record: Omit<BufferedEvent, "bufferId"> = {
      ...event,
      sent: 0,
    };
    await database.add(STORE_NAME, record);
  } catch {
    // IndexedDB unavailable or duplicate (attemptId, seq) — silently drop
  }
}

export async function flushBuffer(): Promise<void> {
  try {
    const database = await getDB();
    const tx = database.transaction(STORE_NAME, "readonly");
    const index = tx.store.index("by_sent");
    const unsent = await index.getAll(IDBKeyRange.only(0), BATCH_MAX_SIZE);
    await tx.done;

    if (unsent.length === 0) return;

    const events: StudentEventRecord[] = unsent.map(
      ({ bufferId: _, sent: _s, ...rest }) => rest as StudentEventRecord
    );

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    });

    if (res.ok) {
      const deleteTx = database.transaction(STORE_NAME, "readwrite");
      for (const record of unsent) {
        await deleteTx.store.delete(record.bufferId);
      }
      await deleteTx.done;
    }
  } catch {
    // Network error — events stay in buffer for next flush
  }
}

let flushTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoFlush(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flushBuffer, BATCH_INTERVAL_MS);

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      flushBuffer();
    });
  }
}

export function stopAutoFlush(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export async function getPendingCount(): Promise<number> {
  try {
    const database = await getDB();
    const tx = database.transaction(STORE_NAME, "readonly");
    const index = tx.store.index("by_sent");
    const count = await index.count(IDBKeyRange.only(0));
    await tx.done;
    return count;
  } catch {
    return 0;
  }
}
