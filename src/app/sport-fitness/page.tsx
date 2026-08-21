"use client";

import { PageTitle } from "@/components/ui";
import { StandardNote } from "@/components/StandardNote";
import { SportFitnessSection } from "@/features/fitness/FitnessSections";

export default function SportFitnessPage() {
  return (
    <div className="stack-lg">
      <PageTitle
        kicker="운동체력"
        title="스포츠를 더 잘하게 하는 힘"
        sub="순발력·민첩성·평형성·협응성은 건강체력과 구분해요. 각 요인을 고르면 맞는 운동 종목을 추천해요."
      />
      <StandardNote screen="sport-fitness" />
      <SportFitnessSection />
    </div>
  );
}
