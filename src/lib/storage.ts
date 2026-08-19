import type {
  Achievement,
  AppSettings,
  EmotionCheckIn,
  FitnessProfile,
  PapsRecord,
  User,
  WorkoutSession,
} from "@/types/models";
import { uid } from "@/lib/utils";

const DB_NAME = "health-fitness-growth";
const DB_VERSION = 1;

export const DEMO_USER_ID = "student-demo";

type StoreName =
  | "users"
  | "profiles"
  | "paps"
  | "sessions"
  | "emotions"
  | "achievements"
  | "settings";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("users")) db.createObjectStore("users", { keyPath: "id" });
      if (!db.objectStoreNames.contains("profiles")) db.createObjectStore("profiles", { keyPath: "userId" });
      if (!db.objectStoreNames.contains("paps")) db.createObjectStore("paps", { keyPath: "id" });
      if (!db.objectStoreNames.contains("sessions")) {
        const s = db.createObjectStore("sessions", { keyPath: "id" });
        s.createIndex("byUser", "userId");
      }
      if (!db.objectStoreNames.contains("emotions")) db.createObjectStore("emotions", { keyPath: "id" });
      if (!db.objectStoreNames.contains("achievements")) db.createObjectStore("achievements", { keyPath: "id" });
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

function txAll<T>(store: StoreName) {
  return tx(store, "readonly", (s) => s.getAll()) as Promise<T[]>;
}

export async function putUser(user: User) {
  await tx("users", "readwrite", (s) => s.put(user));
}
export async function getUser(id: string) {
  return tx<User | undefined>("users", "readonly", (s) => s.get(id));
}

export async function putProfile(profile: FitnessProfile) {
  await tx("profiles", "readwrite", (s) => s.put(profile));
}
export async function getProfile(userId: string) {
  return tx<FitnessProfile | undefined>("profiles", "readonly", (s) => s.get(userId));
}

export async function putPaps(record: PapsRecord) {
  await tx("paps", "readwrite", (s) => s.put(record));
}
export async function listPaps(userId: string) {
  const all = await txAll<PapsRecord>("paps");
  return all.filter((r) => r.userId === userId);
}

export async function putSession(session: WorkoutSession) {
  await tx("sessions", "readwrite", (s) => s.put(session));
}
export async function listSessions(userId: string) {
  const all = await txAll<WorkoutSession>("sessions");
  return all
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.startTime.localeCompare(a.startTime));
}

export async function putEmotion(row: EmotionCheckIn) {
  await tx("emotions", "readwrite", (s) => s.put(row));
}
export async function listEmotions(userId: string) {
  const all = await txAll<EmotionCheckIn>("emotions");
  return all.filter((e) => e.userId === userId);
}

export async function putAchievement(row: Achievement) {
  await tx("achievements", "readwrite", (s) => s.put(row));
}
export async function listAchievements(userId: string) {
  const all = await txAll<Achievement>("achievements");
  return all.filter((a) => a.userId === userId);
}

export async function getSettings(): Promise<AppSettings> {
  const row = await tx<{ id: string } & AppSettings | undefined>("settings", "readonly", (s) => s.get("app"));
  return (
    row ?? {
      beforeReflectUrl: "",
      afterReflectUrl: "",
      studentName: "5-3-12",
    }
  );
}

export async function putSettings(settings: AppSettings) {
  await tx("settings", "readwrite", (s) => s.put({ id: "app", ...settings }));
}

export async function countStore(store: StoreName) {
  return tx<number>(store, "readonly", (s) => s.count());
}

const ALL_STORES: StoreName[] = [
  "users",
  "profiles",
  "paps",
  "sessions",
  "emotions",
  "achievements",
  "settings",
];

export interface Snapshot {
  app: "health-fitness-growth";
  version: number;
  exportedAt: string;
  stores: Record<StoreName, unknown[]>;
}

export async function exportSnapshot(): Promise<Snapshot> {
  const stores = {} as Record<StoreName, unknown[]>;
  for (const name of ALL_STORES) stores[name] = await txAll(name);
  return {
    app: "health-fitness-growth",
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    stores,
  };
}

export function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<Snapshot>;
  return v.app === "health-fitness-growth" && typeof v.stores === "object" && v.stores !== null;
}

/** 백업 파일로 이 기기의 데이터를 대체합니다. 복원 전 기존 내용은 지웁니다. */
export async function importSnapshot(snapshot: Snapshot) {
  const db = await openDb();
  const present = ALL_STORES.filter((name) => name in snapshot.stores);
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(present, "readwrite");
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
    for (const name of present) {
      const store = t.objectStore(name);
      store.clear();
      for (const row of snapshot.stores[name] ?? []) store.put(row);
    }
  });
}

export { uid };
