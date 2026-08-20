import type { Metadata } from "next";
import { Card, PageTitle, Tag } from "@/components/ui";

export const metadata: Metadata = { title: "시스템 구성도" };

/** 사이트가 어떤 조각들로 이루어져 있는지 한 장으로 설명하는 화면. */
export default function SystemCompositionPage() {
  return (
    <div className="stack">
      <PageTitle
        kicker="시스템 구성도"
        title="건강체력 성장일지가 돌아가는 방식"
        sub="학생 태블릿의 웹앱 하나에서 카메라 측정·일지·교사 활용 세 갈래가 갈라집니다."
      />
      <div className="card overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/system/composition.jpg" alt="건강체력 성장일지 시스템 구성도" className="block h-auto w-full" />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-[var(--space-50)]">
          <Tag tone="brand">세 갈래</Tag>
        </div>
        <ul className="mt-[var(--space-150)] list-disc space-y-[var(--space-100)] pl-5 text-[var(--font-size-300)]">
          <li>
            <b>카메라 측정</b> — 자세 인식 모델을 앱 안(public/)에 내장해 외부 요청이 0건입니다. 학교 방화벽이 무엇을
            막아도 측정 수업이 멈추지 않습니다.
          </li>
          <li>
            <b>일지 작성</b> — 학생 글은 앱 서버(/api/journal-feedback)를 거쳐 두 길로 갈라집니다. 답변은 Copilot
            Studio 「일지 도우미」가 만들고, 기록은 Power Automate 「일지 장부」가 SharePoint 리스트에 확정적으로
            남깁니다. 답변 경로와 기록 경로를 분리한 것이 핵심입니다.
          </li>
          <li>
            <b>교사 활용</b> — 교사는 Teams에서 「체육 수업 도우미」에게 물어보고, 도우미가 측정 안내·처방 해설
            에이전트로 라우팅합니다.
          </li>
        </ul>
      </Card>
      <Card>
        <p className="font-semibold">하네스 엔지니어링 원칙</p>
        <ol className="mt-[var(--space-100)] list-decimal space-y-[var(--space-50)] pl-5 text-[var(--font-size-300)]">
          <li>기록은 모델이 아니라 서버 코드가 확정적으로 남긴다.</li>
          <li>답변 경로와 기록 경로를 분리한다 — 답이 왔다고 기록이 된 것이 아니다.</li>
          <li>호출 주소는 서버 환경변수로만 관리한다.</li>
          <li>에이전트에게 판정·조회·추측을 시키지 않는다.</li>
          <li>지식은 공식 원문(교육부·평가원 문서)만 쓴다.</li>
        </ol>
      </Card>
    </div>
  );
}
