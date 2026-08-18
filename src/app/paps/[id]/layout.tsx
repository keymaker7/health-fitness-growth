import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getPapsEvent } from "@/lib/catalog";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = getPapsEvent(id);
  if (!event) return { title: "PAPS 종목" };
  return {
    title: event.name,
    description: event.purpose,
    keywords: [event.name, event.fitnessFactor, "PAPS", "학생건강체력평가"],
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
