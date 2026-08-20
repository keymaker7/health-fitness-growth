"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  ensureStudent,
  studentId,
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
  /** 학급 명단(번호만). 비어 있으면 «이 기기 = 학생 한 명» 으로 동작한다 */
  roster: string[];
  /** 지금 기록 중인 학생의 번호. 명단이 없으면 null */
  activeStudent: string | null;
  /** 기록할 학생을 바꾼다 — 그 학생의 기록으로 화면 전체가 갈린다 */
  switchStudent: (label: string) => Promise<void>;
  /** 학급 명단을 새로 넣는다 */
  saveRoster: (labels: string[]) => Promise<void>;
  refresh: () => Promise<void>;
  saveSession: (session: Omit<WorkoutSession, "id" | "userId">) => Promise<{
    session: WorkoutSession;
    newBadges: Achievement[];
    isPersonalBest: boolean;
  }>;
  saveEmotion: (row: Omit<EmotionCheckIn, "id" | "userId" | "createdAt">) => Promise<void>;
  /** 하루치 일지를 쓰거나 고친다. 같은 날짜면 덮어쓴다 (하루에 한 장) */
  saveEntry: (
    date: string,
    patch: Partial<Pick<JournalEntry, "text" | "mood" | "feedback" | "reflectConfirmed">>,
  ) => Promise<JournalEntry>;
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
  // 일지는 **연달아 두 번 저장**되는 경우가 있다 (글을 저장하고, 곧바로 도우미 답을 저장).
  // useState 값만 보면 두 번째 저장이 «저장 직전» 목록을 보게 되어 방금 쓴 글을 지운다.
  // 그래서 최신 목록을 ref 로 함께 들고 있는다.
  const entriesRef = useRef<JournalEntry[]>([]);
  const applyEntries = useCallback((list: JournalEntry[]) => {
    entriesRef.current = list;
    setEntries(list);
  }, []);
  const [settings, setSettings] = useState<AppSettings>({
    beforeReflectUrl: "",
    afterReflectUrl: "",
    studentName: "5-3-12",
  });
  // 지금 기록 중인 학생의 저장소 아이디. 명단이 없으면 예전 그대로 한 명분을 쓴다.
  // 화면 갱신은 refresh() 가 맡으므로 여기서는 ref 하나면 된다.
  const userIdRef = useRef(DEMO_USER_ID);
  const setActiveUser = useCallback((id: string) => { userIdRef.current = id; }, []);

  const refresh = useCallback(async () => {
    await seedIfNeeded();
    const st = await getSettings();

    // 명단이 있으면 «고른 학생»의 기록을, 없으면 예전처럼 한 명분을 읽는다
    const roster = st.roster ?? [];
    const picked = roster.includes(st.activeStudent ?? "") ? st.activeStudent! : roster[0];
    const id = picked ? studentId(picked) : DEMO_USER_ID;
    if (picked) await ensureStudent(id, picked);
    setActiveUser(id);

    const u = (await getUser(id)) ?? null;
    const p = (await getProfile(id)) ?? null;
    const recs = await listPaps(id);
    const sess = await listSessions(id);
    const ach = await listAchievements(id);
    const ent = await listEntries(id);
    setUser(u);
    setProfile(p);
    setPaps(recs);
    setSessions(sess);
    setAchievements(ach);
    applyEntries(ent);
    setSettings(st);
    setReady(true);
  }, [applyEntries, setActiveUser]);

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
        userId: userIdRef.current,
      };
      const prevBest = personalBest(sessions, session.exerciseId);
      const isPersonalBest = session.count > 0 && session.count > prevBest;
      const newBadges = evaluateBadges(userIdRef.current, sessions, achievements, session);
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
      userId: userIdRef.current,
      createdAt: new Date().toISOString(),
    });
  }, []);

  const saveEntry = useCallback(
    async (
      date: string,
      patch: Partial<Pick<JournalEntry, "text" | "mood" | "feedback" | "reflectConfirmed">>,
    ) => {
      const id = `${userIdRef.current}:${date}`;
      const now = new Date().toISOString();
      const prev = entriesRef.current.find((e) => e.id === id);
      const next: JournalEntry = {
        id,
        userId: userIdRef.current,
        date,
        text: patch.text ?? prev?.text ?? "",
        mood: patch.mood ?? prev?.mood,
        feedback: patch.feedback ?? prev?.feedback,
        // 도우미 답이 이번에 새로 온 경우에만 시각을 갱신한다
        feedbackAt: patch.feedback && patch.feedback !== prev?.feedback ? now : prev?.feedbackAt,
        reflectConfirmed: patch.reflectConfirmed ?? prev?.reflectConfirmed,
        createdAt: prev?.createdAt ?? now,
        updatedAt: now,
      };
      await putEntry(next);
      applyEntries(
        [next, ...entriesRef.current.filter((e) => e.id !== id)].sort((a, b) => (a.date < b.date ? 1 : -1)),
      );
      return next;
    },
    [applyEntries],
  );

  const switchStudent = useCallback(async (label: string) => {
    const st = await getSettings();
    await putSettings({ ...st, activeStudent: label });
    await refresh();
  }, [refresh]);

  const saveRoster = useCallback(async (labels: string[]) => {
    const st = await getSettings();
    // 명단을 바꾸면 «지금 학생» 도 명단 안에 있어야 한다
    const active = labels.includes(st.activeStudent ?? "") ? st.activeStudent : labels[0];
    await putSettings({ ...st, roster: labels, activeStudent: active });
    for (const label of labels) await ensureStudent(studentId(label), label);
    await refresh();
  }, [refresh]);

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
      roster: settings.roster ?? [],
      activeStudent: settings.roster?.length ? (settings.activeStudent ?? settings.roster[0]) : null,
      switchStudent,
      saveRoster,
      refresh,
      saveSession,
      saveEmotion,
      saveEntry,
      updateSettings,
      rename,
    }),
    [ready, user, profile, paps, sessions, achievements, entries, settings, switchStudent, saveRoster, refresh, saveSession, saveEmotion, saveEntry, updateSettings, rename],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}
