type Props = {
  level: number;
  className?: string;
};

export function LevelMascot({ level, className }: Props) {
  const n = Math.min(10, Math.max(1, Math.round(level)));
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <ellipse cx="32" cy="56" rx="16" ry="4.5" fill="#d7e5d8" />
      {n === 1 ? <Sprout /> : null}
      {n === 2 ? <Bean /> : null}
      {n >= 3 ? <Body level={n} /> : null}
    </svg>
  );
}

function Sprout() {
  return (
    <>
      <ellipse cx="32" cy="48" rx="14" ry="8" fill="#8d6e4c" />
      <path d="M32 46c0-10 0-16 0-22" stroke="#3f7a38" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M32 32c-8-2-12-8-12-8 4 1 9 2 12 8Z" fill="#5ea34a" />
      <path d="M32 30c8-1 12-7 12-7-4 1-9 2-12 7Z" fill="#6fb356" />
    </>
  );
}

function Bean() {
  return (
    <>
      <ellipse cx="32" cy="46" rx="11" ry="9" fill="#8fbf5c" />
      <circle cx="28" cy="44" r="1.6" fill="#24301c" />
      <circle cx="36" cy="44" r="1.6" fill="#24301c" />
      <path d="M32 28c0-8 0-14 0-18" stroke="#3f7a38" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M32 18c-9-3-14-10-14-10 5 2 11 4 14 10Z" fill="#5ea34a" />
      <path d="M32 16c9-2 14-9 14-9-5 2-11 4-14 9Z" fill="#6fb356" />
    </>
  );
}

function Body({ level }: { level: number }) {
  const suit = level >= 8 ? "#1f4e79" : level >= 5 ? "#0f6cbd" : "#5ea34a";
  const skin = "#f4d7b5";
  return (
    <>
      {level >= 10 ? <path d="M18 22c4-10 24-10 28 0-8-4-20-4-28 0Z" fill="#f3d07a" /> : null}
      {level >= 7 && level < 10 ? <path d="M20 18c6-8 18-8 24 0-8-3-16-3-24 0Z" fill="#cfe4fa" opacity="0.9" /> : null}
      {level >= 6 ? <path d="M44 28c10 6 10 18 2 24-2-10-6-18-12-22Z" fill="#c50f1f" /> : null}
      <circle cx="32" cy="22" r="9" fill={skin} />
      <circle cx="29" cy="21" r="1.5" fill="#242424" />
      <circle cx="35" cy="21" r="1.5" fill="#242424" />
      <path d="M29 25c2 2.2 4 2.2 6 0" fill="none" stroke="#242424" strokeWidth="1.4" strokeLinecap="round" />
      {level >= 4 ? (
        <rect x="22" y="14" width="20" height="5" rx="2" fill="#0f548c" />
      ) : (
        <>
          <path d="M32 14c-6-6-12-6-12-6 3 3 8 5 12 6Z" fill="#5ea34a" />
          <path d="M32 14c6-6 12-6 12-6-3 3-8 5-12 6Z" fill="#6fb356" />
        </>
      )}
      {level >= 10 ? <path d="M22 12h20l-3 6H25l-3-6Z" fill="#e8b923" /> : null}
      <path d="M24 32c2-2 16-2 16 0v16c-2 3-14 3-16 0V32Z" fill={suit} />
      <path d="M18 34c6 2 8 6 8 10" stroke={suit} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M46 34c-6 2-8 6-8 10" stroke={suit} strokeWidth="5" fill="none" strokeLinecap="round" />
      {level === 4 || level === 5 ? (
        <path d="M24 50c-4 4-8 6-10 6M40 50c4 4 8 6 10 6" stroke={suit} strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M26 48v8M38 48v8" stroke={suit} strokeWidth="5" fill="none" strokeLinecap="round" />
      )}
      {level >= 8 ? <circle cx="32" cy="38" r="4" fill="#e8b923" /> : null}
      {level >= 9 ? <path d="M46 20 54 36l-12-4 4-12Z" fill="#e8b923" /> : null}
    </>
  );
}
