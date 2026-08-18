import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "측정 도구",
  description: "왕복오래달리기, 제자리멀리뛰기, 줄넘기 측정 도구를 탭에서 바로 열어요.",
  alternates: { canonical: "/measure" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
