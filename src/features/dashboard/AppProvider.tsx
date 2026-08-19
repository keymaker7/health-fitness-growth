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
  listPaps,
  listSessions,
  putAchievement,
  putEmotion,
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
  settings: AppSettings;
  refresh: () => Promise<void>;
  saveSession: (session: Omit<WorkoutSession, "id" | "userId">) => Promise<{
    session: WorkoutSession;
    newBadges: Achievement[];
    isPersonalBest: boolean;
  }>;
  saveEmotion: (row: Omit<EmotionCheckIn, "id" | "userId" | "createdAt">) => Promise<void>;
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
    const st = await getSettings();
    setUser(u);
    setProfile(p);
    setPaps(recs);
    setSessions(sess);
    setAchievements(ach);
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
      settings,
      refresh,
      saveSession,
      saveEmotion,
      updateSettings,
      rename,
    }),
    [ready, user, profile, paps, sessions, achievements, settings, refresh, saveSession, saveEmotion, updateSettings, rename],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}
