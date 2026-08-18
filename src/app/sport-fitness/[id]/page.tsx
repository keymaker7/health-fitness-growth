"use client";

import { useParams } from "next/navigation";
import { FitnessFactorView } from "@/components/FitnessFactorView";

export default function SportDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <FitnessFactorView kicker="운동체력" id={id} />;
}
