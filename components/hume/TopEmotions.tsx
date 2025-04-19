"use client";

import { Emotion } from "@/lib/data/emotion";

type TopEmotionsProps = {
  emotions: Emotion[];
  className?: string;
};

export function TopEmotions({ emotions, className }: TopEmotionsProps) {
  className = className || "";
  const sortedEmotions = [...emotions].sort((a, b) => b.score - a.score);
  const topEmotions = sortedEmotions.slice(0, 5);

  return (
    <div className={`${className}`}>
      <div className="mb-2 text-lg font-medium">Top Emotions</div>
      <div className="space-y-2">
        {topEmotions.map((emotion, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="text-sm">{emotion.name}</div>
            <div className="text-sm font-medium">{emotion.score.toFixed(3)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
