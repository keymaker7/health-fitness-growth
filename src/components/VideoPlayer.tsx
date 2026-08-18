"use client";

import type { ExerciseVideo } from "@/types/models";
import { cn } from "@/lib/utils";

export function VideoPlayer({ video, title, flush }: { video?: ExerciseVideo; title?: string; flush?: boolean }) {
  if (video?.youtubeId) {
    return (
      <div className={cn("media", flush && "media-flush")}>
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex aspect-video flex-col items-center justify-center bg-[var(--bg-subtle)] p-[var(--space-200)] text-center",
        flush ? "media-flush" : "rounded-[var(--radius-medium)] border border-dashed border-[var(--line)]",
      )}
    >
      <p className="font-semibold">{title ?? video?.title ?? "운동 영상"}</p>
      <p className="mt-[var(--space-50)] text-[var(--font-size-300)] text-[var(--muted)]">
        아직 연결된 영상이 없어요. 학교에서 안내 영상을 연결하면 여기에 나타납니다.
      </p>
    </div>
  );
}
