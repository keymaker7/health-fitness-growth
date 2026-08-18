import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "나의 성장",
  description: "줄넘기 기록과 체력 변화를 그래프로 보며, 과거의 나와 오늘의 나를 비교합니다.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
