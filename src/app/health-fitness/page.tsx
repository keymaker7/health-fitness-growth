"use client";

import { PageTitle } from "@/components/ui";
import { StandardNote } from "@/components/StandardNote";
import { HealthFitnessSection } from "@/features/fitness/FitnessSections";

export default function HealthFitnessPage() {
  return (
    <div className="stack-lg">
      <PageTitle
        kicker="건강체력"
        title="매일의 삶을 지키는 힘"
        sub="건강체력은 오래 움직이고, 힘을 내고, 몸을 부드럽게 쓰고, 몸의 구성을 돌보는 능력이에요. 각 요인을 고르면 맞는 운동 종목을 추천해요."
      />
      <StandardNote screen="health-fitness" />
      <HealthFitnessSection />
    </div>
  );
}
