"use client";

import { Emotion } from "@/lib/data/emotion";

type TopEmotionsProps = {
  emotions: Emotion[];
  className?: string;
};

export function TopEmotions({ emotions, className }: TopEmotionsProps) {
  className = className || "";
  const sortedEmotions = [...emotions].sort((a, b) => b.score - a.score);
  const topEmotions = sortedEmotions.slice(0, 6); // Show up to 6 emotions

  return (
    <div className={`${className}`}>
      {/* Horizontal layout for emotions with wrapping */}
      <div className="flex flex-wrap justify-center gap-2">
        {topEmotions.map((emotion, index) => (
          <div key={index} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-center">
            <div className="text-sm text-gray-700 dark:text-gray-300">{emotion.name}</div>
          </div>
        ))}
        {topEmotions.length === 0 && (
          <div className="text-xs text-gray-500 text-center">No emotions detected</div>
        )}
      </div>
    </div>
  );
}
