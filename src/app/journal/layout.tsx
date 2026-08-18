import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "나의 기록",
  description: "운동 횟수, 주간 목표, 배지와 마음 변화를 한곳에서 보는 건강체력 성장 일지입니다.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
