import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "마음·몸 회복",
  description: "잠시 쉬어가도 성장입니다. 호흡, 스트레칭과 Microsoft Reflect Brain Break 공식 링크를 안내합니다.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
