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
  // 연결된 영상이 없으면 자리 표시 없이 그냥 숨긴다 (keymaker님 요청, 2026-08-21)
  return null;
}
