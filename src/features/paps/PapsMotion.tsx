"use client";

export function PapsMotion({ eventId }: { eventId: string }) {
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
