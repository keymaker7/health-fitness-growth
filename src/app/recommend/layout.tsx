import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "추천 운동",
  description: "부족한 체력 요인을 바탕으로 지금 나에게 필요한 움직임을 추천합니다. 친구와 비교하지 않습니다.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
