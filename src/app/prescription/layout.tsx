import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "맞춤 운동처방",
  description: "지난 4주 운동 기록에서 만든 4주 운동 계획. 종목, 주당 횟수, 목표, 강도를 함께 안내합니다.",
  alternates: { canonical: "/prescription" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
