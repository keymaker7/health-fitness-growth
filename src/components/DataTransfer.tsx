"use client";

import { useRef, useState } from "react";
import { BtnRow, Button, Card, Tag } from "@/components/ui";
import { useApp } from "@/features/dashboard/AppProvider";
import { downloadFile, papsCsv, sessionsCsv, stampedName } from "@/lib/csv";
import { exportSnapshot, importSnapshot, isSnapshot } from "@/lib/storage";

type Status = { tone: "ok" | "bad"; text: string } | null;

export function DataTransfer() {
  const { ready, user, sessions, paps, refresh } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  // 카드가 통째로 사라지면 기능이 없는 것처럼 보입니다. 준비 중에도 자리를 지킵니다.
  const locked = !ready || !user || busy;

  function saveSessions() {
    if (!user) return;
    downloadFile(stampedName("운동기록", user.displayName, "csv"), sessionsCsv(user, sessions), "text/csv;charset=utf-8");
    setStatus({ tone: "ok", text: `운동 기록 ${sessions.length}줄을 내려받았어요.` });
  }

  function savePaps() {
    if (!user) return;
    downloadFile(stampedName("PAPS측정", user.displayName, "csv"), papsCsv(user, paps), "text/csv;charset=utf-8");
    setStatus({ tone: "ok", text: `PAPS 측정 ${paps.length}줄을 내려받았어요.` });
  }

  async function saveBackup() {
    if (!user) return;
    setBusy(true);
    try {
      const snapshot = await exportSnapshot();
      downloadFile(
        stampedName("백업", user.displayName, "json"),
        JSON.stringify(snapshot, null, 2),
        "application/json",
      );
      setStatus({ tone: "ok", text: "백업 파일을 내려받았어요. 새 컴퓨터에서 이 파일로 되살릴 수 있어요." });
    } catch {
      setStatus({ tone: "bad", text: "백업을 만들지 못했어요. 새로고침 후 다시 해보세요." });
    }
    setBusy(false);
  }

  async function restore(file: File) {
    setBusy(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isSnapshot(parsed)) {
        setStatus({ tone: "bad", text: "이 앱에서 만든 백업 파일이 아니에요." });
        setBusy(false);
        return;
      }
      const ok = window.confirm("지금 이 기기의 기록을 지우고 백업 파일 내용으로 바꿉니다. 계속할까요?");
      if (!ok) {
        setBusy(false);
        return;
      }
      await importSnapshot(parsed);
      await refresh();
      setStatus({ tone: "ok", text: "복원했어요. 기록과 레벨이 백업 시점으로 돌아왔습니다." });
    } catch {
      setStatus({ tone: "bad", text: "파일을 읽지 못했어요. 백업 JSON 파일이 맞는지 확인해 주세요." });
    }
    setBusy(false);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-[var(--space-50)]">
        <p className="font-semibold">데이터 옮기기</p>
        {ready ? (
          <>
            <Tag>기록 {sessions.length}개</Tag>
            <Tag>측정 {paps.length}개</Tag>
          </>
        ) : (
          <Tag>불러오는 중</Tag>
        )}
      </div>
      <p className="mt-[var(--space-100)] text-[var(--font-size-300)] leading-[var(--line-400)] text-[var(--muted)]">
        기록은 이 기기 브라우저에만 있습니다. 컴퓨터를 바꾸거나 브라우저를 지우면 사라지므로, 옮기기 전에 백업 파일을
        만들어 두세요. CSV는 Excel과 Power Automate에서 쓰는 용도입니다.
      </p>

      <p className="mt-[var(--space-200)] text-[var(--font-size-300)] font-semibold">Excel로 내보내기</p>
      <BtnRow className="mt-[var(--space-100)]">
        <Button variant="soft" onClick={saveSessions} disabled={locked || sessions.length === 0}>
          운동 기록 CSV
        </Button>
        <Button variant="soft" onClick={savePaps} disabled={locked || paps.length === 0}>
          PAPS 측정 CSV
        </Button>
      </BtnRow>

      <p className="mt-[var(--space-250)] text-[var(--font-size-300)] font-semibold">다른 컴퓨터로 옮기기</p>
      <BtnRow className="mt-[var(--space-100)]">
        <Button onClick={saveBackup} disabled={locked}>
          전체 백업 저장
        </Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={locked}>
          백업 파일로 복원
        </Button>
      </BtnRow>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void restore(file);
        }}
      />

      {status ? (
        <p
          className={`mt-[var(--space-200)] text-[var(--font-size-300)] font-semibold ${
            status.tone === "ok" ? "text-[var(--brand-ink)]" : "text-[var(--status-danger)]"
          }`}
        >
          {status.text}
        </p>
      ) : null}
    </Card>
  );
}
