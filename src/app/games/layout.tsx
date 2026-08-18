import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "체력 게임",
  description: "줄넘기, 스쿼트, 민첩성 등 측정과 놀이를 한 화면에서 하는 초등 체력 게임입니다.",
  keywords: ["줄넘기", "스쿼트", "체력 게임", "AI 줄넘기", "초등 체육"],
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
