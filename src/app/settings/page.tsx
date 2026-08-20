"use client";

import { useEffect, useState } from "react";
import { Button, Card, PageTitle } from "@/components/ui";
import { DataTransfer } from "@/components/DataTransfer";
import { useApp } from "@/features/dashboard/AppProvider";
import { REFLECT_OFFICIAL } from "@/features/reflect/adapter";
import { parseRoster } from "@/lib/storage";

export default function SettingsPage() {
  const { ready, settings, updateSettings, user, roster, saveRoster, activeStudent } = useApp();
  const [name, setName] = useState("");
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [filled, setFilled] = useState(false);
  const [rosterText, setRosterText] = useState("");
  const [rosterSaved, setRosterSaved] = useState(false);

  // 저장된 값은 나중에 불러와지므로 화면이 처음 그려질 때는 아직 비어 있다.
  // 불러온 뒤 한 번만 칸을 채운다 — 그러지 않으면 번호가 안 보이고,
  // 그 상태로 저장을 누르면 번호가 지워진다.
  useEffect(() => {
    if (!ready || filled) return;
    setName(settings.studentName || user?.displayName || "");
    setBefore(settings.beforeReflectUrl);
    setAfter(settings.afterReflectUrl);
    setRosterText((settings.roster ?? []).join("\n"));
    setFilled(true);
  }, [ready, filled, settings, user]);

  const parsed = parseRoster(rosterText);

  return (
    <div className="stack">
      <PageTitle
        kicker="설정"
        title="나와 데이터 관리"
        sub="학생 번호와 Reflect 링크를 저장하고, 기록을 내보내거나 다른 컴퓨터로 옮깁니다."
      />
      <Card>
        <p className="text-[var(--font-size-400)] font-semibold">우리 반 명단</p>
        <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">
          번호를 한 줄에 하나씩 붙여넣으세요. <b>이름은 넣지 않습니다</b> — 번호만으로 기록이 갈립니다.
          명단을 넣으면 <b>태블릿 한 대로 반 전체</b>를 잴 수 있어요. 비워 두면 지금처럼 한 명만 씁니다.
        </p>
        <textarea
          value={rosterText}
          onChange={(e) => { setRosterText(e.target.value); setRosterSaved(false); }}
          rows={6}
          placeholder={"6-2-01\n6-2-02\n6-2-03"}
          className="mt-[var(--space-150)] w-full rounded-[var(--radius-medium)] border border-[var(--line)] bg-[var(--surface)] p-[var(--space-150)] font-mono text-[var(--font-size-300)] outline-none focus:border-[var(--brand)]"
        />
        <div className="btn-row mt-[var(--space-150)] items-center">
          <Button
            onClick={async () => { await saveRoster(parsed); setRosterSaved(true); }}
            disabled={!parsed.length}
          >
            명단 저장 ({parsed.length}명)
          </Button>
          {rosterSaved ? (
            <span className="text-[var(--font-size-300)] font-semibold text-[var(--brand)]">
              저장했어요 — 오른쪽 위 사람 아이콘에서 학생을 고르세요
            </span>
          ) : null}
        </div>
        {roster.length ? (
          <p className="mt-[var(--space-150)] text-[var(--font-size-300)] text-[var(--muted)]">
            지금 기록 중: <b className="tabular-nums text-[var(--text)]">{activeStudent}</b> · 전체 {roster.length}명
          </p>
        ) : null}
      </Card>

      <Card>
        <label className="text-[var(--font-size-300)] font-semibold">번호</label>
        <input
          className="field mt-[var(--space-100)]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="6-2-07"
        />
        <p className="mt-[var(--space-100)] text-[var(--font-size-200)] text-[var(--muted)]">
          <b>실명 대신 학년-반-번호</b>나 별명을 넣어 주세요. 이 값이 기록·CSV·업로드 파일에 그대로 들어가고,
          학급 자료에는 누구인지 알 수 있는 정보를 남기지 않습니다.
        </p>
      </Card>
      <Card>
        <p className="font-semibold">Microsoft Reflect</p>
        <p className="mt-[var(--space-100)] text-[var(--font-size-300)] text-[var(--muted)]">
          교사가{" "}
          <a className="font-semibold text-[var(--brand)] hover:underline" href={REFLECT_OFFICIAL.newCheckIn} target="_blank" rel="noreferrer">
            reflect.new
          </a>
          에서 체크인을 만든 뒤 공유 링크를 붙여 넣으면, 운동 전후 버튼이 그 링크로 열립니다. 링크가 비어 있으면
          Reflect 홈으로 이동합니다.
        </p>
        <label className="mt-[var(--space-200)] block text-[var(--font-size-300)] font-semibold">운동 전 체크인 URL</label>
        <input className="field mt-[var(--space-100)]" value={before} onChange={(e) => setBefore(e.target.value)} placeholder="https://reflect.microsoft.com/..." />
        <label className="mt-[var(--space-200)] block text-[var(--font-size-300)] font-semibold">운동 후 체크인 URL</label>
        <input className="field mt-[var(--space-100)]" value={after} onChange={(e) => setAfter(e.target.value)} placeholder="https://reflect.microsoft.com/..." />
        <Button
          className="mt-[var(--space-200)] w-full sm:w-auto"
          onClick={() => updateSettings({ studentName: name, beforeReflectUrl: before, afterReflectUrl: after })}
        >
          저장
        </Button>
      </Card>
      <DataTransfer />
      <Card>
        <p className="font-semibold">개인정보</p>
        <p className="mt-[var(--space-100)] text-[var(--font-size-300)] leading-[var(--line-400)] text-[var(--muted)]">
          운동 기록은 이 기기 브라우저(IndexedDB)에만 저장됩니다. 카메라 영상은 서버로 올리지 않고, 줄넘기·스쿼트
          횟수 같은 결과만 남깁니다.
        </p>
      </Card>
    </div>
  );
}
