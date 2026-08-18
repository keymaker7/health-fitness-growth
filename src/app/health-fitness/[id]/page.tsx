"use client";

import { useParams } from "next/navigation";
import { FitnessFactorView } from "@/components/FitnessFactorView";

export default function HealthDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <FitnessFactorView kicker="건강체력" id={id} />;
}
