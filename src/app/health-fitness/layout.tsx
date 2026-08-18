import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "건강체력",
  description: "심폐지구력, 근력·근지구력, 유연성, 체지방 등 매일의 삶을 지키는 건강체력을 알아봅니다.",
  keywords: ["건강체력", "심폐지구력", "근력", "유연성", "체지방", "초등 체육"],
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
