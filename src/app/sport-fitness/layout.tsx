import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "운동체력",
  description: "순발력, 민첩성, 평형성, 협응성 등 스포츠를 더 잘하게 하는 운동체력을 알아봅니다.",
  keywords: ["운동체력", "순발력", "민첩성", "평형성", "협응성", "초등 체육"],
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
