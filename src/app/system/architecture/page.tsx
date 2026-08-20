import type { Metadata } from "next";
import { Card, PageTitle, Tag } from "@/components/ui";

export const metadata: Metadata = { title: "시스템 구조도" };

/** AI 에이전트들이 어떻게 짜여 있는지 설명하는 화면. */
export default function SystemArchitecturePage() {
  return (
    <div className="stack">
      <PageTitle
        kicker="시스템 구조도"
        title="AI 에이전트가 짜인 방식"
        sub="Microsoft Copilot Studio 위에 에이전트 4개·흐름 2개·워크플로우 1개가 역할을 나눠 맡습니다."
      />
      <div className="card overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/system/architecture.jpg" alt="건강체력 성장일지 AI 에이전트 구조도" className="block h-auto w-full" />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-[var(--space-50)]">
          <Tag tone="brand">에이전트 4개</Tag>
          <Tag>흐름 2개</Tag>
          <Tag>워크플로우 1개</Tag>
        </div>
        <ul className="mt-[var(--space-150)] list-disc space-y-[var(--space-100)] pl-5 text-[var(--font-size-300)]">
          <li>
            <b>체육 수업 도우미(부모)</b> — 스스로 답하지 않고 라우팅만 합니다. 질문을 「측정 안내」(PAPS 운영
            매뉴얼·학교건강검사규칙)와 「처방 해설」(운동처방 규칙 문서)로 넘깁니다.
          </li>
          <li>
            <b>일지 도우미(독립 게시)</b> — 학생 앱에서 Direct Line으로 익명 호출됩니다. 이름 없이 학번만 전달하고,
            등급·비교 없이 일지에 대한 피드백 한 가지만 답합니다.
          </li>
          <li>
            <b>측정-결과-해석 워크플로우</b> — Start(종목·측정값·학년) → Classify(심폐지구력/순발력/그 외) → 분기별
            Agent → Respond to the agent 구조로, 측정값 해석을 만들어 돌려줍니다.
          </li>
          <li>
            <b>Power Automate 흐름 2개</b> — 「일지 저장」(에이전트가 호출)과 「일지 장부」(앱 서버가 HTTP로 호출).
            둘 다 SharePoint 사이트 pe-journal의 「체육 성장일지」 리스트에 제목(학번)·날짜·마음·운동·일지·피드백
            여섯 칸을 남깁니다.
          </li>
        </ul>
      </Card>
      <Card>
        <p className="font-semibold">왜 이렇게 나눴나</p>
        <p className="mt-[var(--space-100)] text-[var(--font-size-300)] leading-[var(--line-400)]">
          학생 화면은 로그인이 없어서(익명) 에이전트에 커넥터 도구를 붙일 수 없습니다. 그래서 기록은 «만든 사람의
          연결»로 도는 Power Automate 흐름에 맡기고, 에이전트는 답변만 맡습니다. 30명이 써도 한 줄도 빠지지 않아야
          하는 기록은 모델의 판단이 아니라 서버 코드가 확정적으로 남깁니다.
        </p>
      </Card>
    </div>
  );
}
