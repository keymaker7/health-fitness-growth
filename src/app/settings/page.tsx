"use client";

import { useState } from "react";
import { Button, Card, PageTitle } from "@/components/ui";
import { DataTransfer } from "@/components/DataTransfer";
import { useApp } from "@/features/dashboard/AppProvider";
import { REFLECT_OFFICIAL } from "@/features/reflect/adapter";

export default function SettingsPage() {
  const { settings, updateSettings, user } = useApp();
  const [name, setName] = useState(settings.studentName || user?.displayName || "");
  const [before, setBefore] = useState(settings.beforeReflectUrl);
  const [after, setAfter] = useState(settings.afterReflectUrl);

  return (
    <div className="stack">
      <PageTitle
        kicker="설정"
        title="나와 데이터 관리"
        sub="학생 번호와 Reflect 링크를 저장하고, 기록을 내보내거나 다른 컴퓨터로 옮깁니다."
      />
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
