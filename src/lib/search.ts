import { PAPS_EVENTS } from "@/lib/catalog";

const DESTINATIONS: { href: string; keys: string[] }[] = [
  { href: "/", keys: ["홈", "성장일지", "건강체력 성장"] },
  { href: "/paps", keys: ["paps", "학생건강체력평가", "체력평가", "종목"] },
  { href: "/health-fitness", keys: ["건강체력", "심폐", "근력", "유연성", "체지방"] },
  { href: "/sport-fitness", keys: ["운동체력", "순발력", "민첩", "평형", "협응"] },
  { href: "/prescription", keys: ["처방", "운동처방", "맞춤", "4주 계획", "추천", "운동 추천", "미션"] },
  { href: "/games/multi-jump", keys: ["줄넘기", "jump", "다인원"] },
  { href: "/games/squat-race", keys: ["스쿼트", "squat"] },
  { href: "/games/jump-rope", keys: ["마이크로비트", "microbit", "micro:bit"] },
  { href: "/games", keys: ["게임", "체력 게임"] },
  { href: "/measure", keys: ["측정", "측정 도구", "카운터", "왕복오래달리기 측정", "제자리멀리뛰기 측정"] },
  { href: "/journal", keys: ["기록", "일지", "배지"] },
  { href: "/portfolio", keys: ["포트폴리오", "성장 포트폴리오", "인쇄", "pdf"] },
  { href: "/growth", keys: ["성장", "그래프", "차트", "레벨", "새싹이", "챌린저", "레전드이"] },
  { href: "/brain-break", keys: ["호흡", "스트레칭", "brain break", "reflect"] },
];

export function resolveSearchPath(raw: string): string {
  const q = raw.trim();
  if (!q) return "/paps";
  const t = q.toLowerCase();
  const page = DESTINATIONS.find((d) => d.keys.some((k) => t.includes(k.toLowerCase()) || k.toLowerCase().includes(t)));
  if (page) return page.href;
  const event = PAPS_EVENTS.find(
    (e) => e.name.includes(q) || e.fitnessFactor.includes(q) || e.id.toLowerCase().includes(t),
  );
  if (event) return `/paps/${event.id}`;
  return `/paps?q=${encodeURIComponent(q)}`;
}
