type Props = {
  level: number;
  className?: string;
};

/**
 * 레벨 캐릭터 — keymaker님이 만든 «레벨 시스템 1-10» 포스터에서 잘라낸 그림을 쓴다.
 * 그림은 public/lv/<레벨>.png. 예전 SVG 마스코트를 이 그림으로 바꿨다.
 */
export function LevelMascot({ level, className }: Props) {
  const n = Math.min(10, Math.max(1, Math.round(level)));
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/lv/${n}.png`} alt="" aria-hidden className={className} style={{ objectFit: "contain" }} loading="lazy" />
  );
}
