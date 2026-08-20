"use client";

/**
 * 종목 안내 그림. keymaker님이 만든 측정 안내 포스터(8종)가 있는 종목은
 * 그 그림을 보여주고, 아직 그림이 없는 종목은 예전 막대 사람 애니메이션을 그대로 쓴다.
 * 그림은 public/paps/<eventId>.jpg — 글자가 많은 인포그래픽이라 잘라내지 않고 원래 비율로 보여준다.
 */

const EVENT_IMAGES: Record<string, string> = {
  pacer: "/paps/pacer.jpg",
  "sit-and-reach": "/paps/sit-and-reach.jpg",
  "push-up": "/paps/push-up.jpg",
  "curl-up": "/paps/curl-up.jpg",
  grip: "/paps/grip.jpg",
  "standing-long-jump": "/paps/standing-long-jump.jpg",
  bmi: "/paps/bmi.jpg",
  "body-fat": "/paps/body-fat.jpg",
};

export function PapsMotion({ eventId }: { eventId: string }) {
  const img = EVENT_IMAGES[eventId];
  if (img) {
    return (
      <div className="card overflow-hidden bg-[var(--colorNeutralBackground2)] p-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="측정 방법 안내 그림" className="block h-auto w-full" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="card flex h-40 items-end justify-center overflow-hidden bg-[var(--colorNeutralBackground2)]">
      <div className={`relative h-28 w-28 ${anim(eventId)}`}>
        <div className="absolute left-1/2 top-2 h-8 w-8 -translate-x-1/2 rounded-full bg-[var(--neutral-84)]" />
        <div className="absolute left-1/2 top-10 h-12 w-4 -translate-x-1/2 rounded-sm bg-[var(--brand)]" />
        <div className="absolute bottom-1 left-6 h-10 w-3 origin-top rounded-sm bg-[var(--neutral-76)]" />
        <div className="absolute bottom-1 right-6 h-10 w-3 origin-top rounded-sm bg-[var(--neutral-76)]" />
      </div>
      <style>{`
        @keyframes bounce-y { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
        @keyframes reach { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(18deg); } }
        @keyframes step { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-8px) rotate(-6deg); } }
        .a-bounce { animation: bounce-y 0.8s ease-in-out infinite; }
        .a-reach { animation: reach 1.6s ease-in-out infinite; }
        .a-step { animation: step 0.7s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function anim(id: string) {
  if (id === "pacer" || id === "run-walk" || id === "sprint-50") return "a-bounce";
  if (id === "sit-and-reach" || id === "composite-flexibility") return "a-reach";
  return "a-step";
}
