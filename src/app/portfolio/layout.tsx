import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "성장 포트폴리오",
  description: "운동 기록, PAPS, 배지와 마음 변화를 한 장의 성장 포트폴리오로 모읍니다. 친구와 비교하지 않습니다.",
  keywords: ["성장 포트폴리오", "건강체력 일지", "초등 체육 포트폴리오", "PAPS 성장"],
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
