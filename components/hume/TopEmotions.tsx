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
      <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Top Emotions</div>
      <div className="space-y-0.5">
        {topEmotions.map((emotion, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="text-xs text-gray-700 dark:text-gray-300">{emotion.name}</div>
            <div className="text-xs font-medium ml-2 text-gray-900 dark:text-gray-100">{emotion.score.toFixed(2)}</div>
          </div>
        ))}
        {topEmotions.length === 0 && (
          <div className="text-xs text-gray-500">No emotions detected</div>
        )}
      </div>
    </div>
  );
}
