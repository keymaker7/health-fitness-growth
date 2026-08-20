"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Achievement,
  AppSettings,
  EmotionCheckIn,
  FitnessProfile,
  JournalEntry,
  PapsRecord,
  User,
  WorkoutSession,
} from "@/types/models";
import {
  DEMO_USER_ID,
  getProfile,
  getSettings,
  getUser,
  listAchievements,
  listEntries,
  listPaps,
  listSessions,
  putAchievement,
  putEmotion,
  putEntry,
  putSession,
  putSettings,
  putUser,
} from "@/lib/storage";
import { seedIfNeeded } from "@/lib/seed";
import { evaluateBadges, personalBest } from "@/features/badges/engine";
import { uid } from "@/lib/utils";

interface AppState {
  ready: boolean;
  user: User | null;
  profile: FitnessProfile | null;
  paps: PapsRecord[];
  sessions: WorkoutSession[];
  achievements: Achievement[];
  entries: JournalEntry[];
  settings: AppSettings;
  refresh: () => Promise<void>;
  saveSession: (session: Omit<WorkoutSession, "id" | "userId">) => Promise<{
    session: WorkoutSession;
    newBadges: Achievement[];
    isPersonalBest: boolean;
  }>;
  saveEmotion: (row: Omit<EmotionCheckIn, "id" | "userId" | "createdAt">) => Promise<void>;
  /** 하루치 일지를 쓰거나 고친다. 같은 날짜면 덮어쓴다 (하루에 한 장) */
  saveEntry: (date: string, patch: Partial<Pick<JournalEntry, "text" | "mood" | "feedback">>) => Promise<JournalEntry>;
  updateSettings: (s: AppSettings) => Promise<void>;
  rename: (name: string) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [paps, setPaps] = useState<PapsRecord[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    beforeReflectUrl: "",
    afterReflectUrl: "",
    studentName: "5-3-12",
  });

  const refresh = useCallback(async () => {
    await seedIfNeeded();
    const u = (await getUser(DEMO_USER_ID)) ?? null;
    const p = (await getProfile(DEMO_USER_ID)) ?? null;
    const recs = await listPaps(DEMO_USER_ID);
    const sess = await listSessions(DEMO_USER_ID);
    const ach = await listAchievements(DEMO_USER_ID);
    const ent = await listEntries(DEMO_USER_ID);
    const st = await getSettings();
    setUser(u);
    setProfile(p);
    setPaps(recs);
    setSessions(sess);
    setAchievements(ach);
    setEntries(ent);
    setSettings(st);
    setReady(true);
  }, []);

  useEffect(() => {
    // IndexedDB에서 학생 데이터를 한 번 불러옵니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- local database hydration
    void refresh();
  }, [refresh]);

  const saveSession = useCallback(
    async (input: Omit<WorkoutSession, "id" | "userId">) => {
      const session: WorkoutSession = {
        ...input,
        id: uid("sess"),
        userId: DEMO_USER_ID,
      };
      const prevBest = personalBest(sessions, session.exerciseId);
      const isPersonalBest = session.count > 0 && session.count > prevBest;
      const newBadges = evaluateBadges(DEMO_USER_ID, sessions, achievements, session);
      await putSession(session);
      for (const b of newBadges) await putAchievement(b);
      setSessions((s) => [session, ...s]);
      setAchievements((a) => [...a, ...newBadges]);
      return { session, newBadges, isPersonalBest };
    },
    [sessions, achievements],
  );

  const saveEmotion = useCallback(async (row: Omit<EmotionCheckIn, "id" | "userId" | "createdAt">) => {
    await putEmotion({
      ...row,
      id: uid("emo"),
      userId: DEMO_USER_ID,
      createdAt: new Date().toISOString(),
    });
  }, []);

  const saveEntry = useCallback(
    async (date: string, patch: Partial<Pick<JournalEntry, "text" | "mood" | "feedback">>) => {
      const id = `${DEMO_USER_ID}:${date}`;
      const now = new Date().toISOString();
      const prev = entries.find((e) => e.id === id);
      const next: JournalEntry = {
        id,
        userId: DEMO_USER_ID,
        date,
        text: patch.text ?? prev?.text ?? "",
        mood: patch.mood ?? prev?.mood,
        feedback: patch.feedback ?? prev?.feedback,
        // 도우미 답이 이번에 새로 온 경우에만 시각을 갱신한다
        feedbackAt: patch.feedback && patch.feedback !== prev?.feedback ? now : prev?.feedbackAt,
        createdAt: prev?.createdAt ?? now,
        updatedAt: now,
      };
      await putEntry(next);
      setEntries((list) => [next, ...list.filter((e) => e.id !== id)].sort((a, b) => (a.date < b.date ? 1 : -1)));
      return next;
    },
    [entries],
  );

  const updateSettings = useCallback(async (s: AppSettings) => {
    await putSettings(s);
    setSettings(s);
    if (user && s.studentName !== user.displayName) {
      const next = { ...user, displayName: s.studentName };
      await putUser(next);
      setUser(next);
    }
  }, [user]);

  const rename = useCallback(async (name: string) => {
    if (!user) return;
    const next = { ...user, displayName: name };
    await putUser(next);
    setUser(next);
    const st = { ...settings, studentName: name };
    await putSettings(st);
    setSettings(st);
  }, [user, settings]);

  const value = useMemo(
    () => ({
      ready,
      user,
      profile,
      paps,
      sessions,
      achievements,
      entries,
      settings,
      refresh,
      saveSession,
      saveEmotion,
      saveEntry,
      updateSettings,
      rename,
    }),
    [ready, user, profile, paps, sessions, achievements, entries, settings, refresh, saveSession, saveEmotion, saveEntry, updateSettings, rename],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}
