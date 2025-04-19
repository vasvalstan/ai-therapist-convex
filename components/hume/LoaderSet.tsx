"use client";

import { Emotion, EmotionName } from "@/lib/data/emotion";

type LoaderSetProps = {
  emotions: Emotion[];
  emotionNames: EmotionName[];
  numLevels: number;
  className?: string;
};

export function LoaderSet({ emotions, emotionNames, numLevels, className }: LoaderSetProps) {
  className = className || "";
  const emotionMap = new Map<string, number>();
  emotions.forEach((emotion) => {
    emotionMap.set(emotion.name, emotion.score);
  });

  return (
    <div className={`${className}`}>
      <div className="mb-2 text-lg font-medium">Emotion Levels</div>
      <div className="space-y-3">
        {emotionNames.map((name, index) => {
          const score = emotionMap.get(name) || 0;
          const numFilled = Math.round(score * numLevels);
          return (
            <div key={index} className="flex items-center">
              <div className="w-32 text-sm">{name}</div>
              <div className="flex">
                {Array.from({ length: numLevels }).map((_, i) => {
                  const isFilled = i < numFilled;
                  return (
                    <div
                      key={i}
                      className={`h-3 w-3 rounded-full mx-0.5 ${
                        isFilled ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    ></div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
