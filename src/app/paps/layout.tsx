import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "PAPS 학생건강체력평가",
  description: "PAPS 종목의 측정 목적, 방법, 자세, 관련 운동을 초등학생도 이해하기 쉽게 안내합니다.",
  keywords: ["PAPS", "학생건강체력평가", "왕복오래달리기", "앉아윗몸앞으로굽히기", "초등 체력측정"],
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
