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
  
  // Split emotions into two rows for mobile
  const firstRow = topEmotions.slice(0, 3);
  const secondRow = topEmotions.slice(3);

  return (
    <div className={`${className}`}>
      {/* Desktop view - stacked vertically */}
      <div className="hidden md:flex md:flex-col md:space-y-1.5">
        {topEmotions.map((emotion, index) => (
          <div key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-center">
            <div className="text-xs text-gray-700 dark:text-gray-300">{emotion.name}</div>
          </div>
        ))}
      </div>
      
      {/* Mobile view - two rows of emotions */}
      <div className="md:hidden space-y-1">
        {/* First row */}
        <div className="flex justify-center space-x-1">
          {firstRow.map((emotion, index) => (
            <div key={index} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-center flex-1">
              <div className="text-xs text-gray-700 dark:text-gray-300 truncate">{emotion.name}</div>
            </div>
          ))}
        </div>
        
        {/* Second row */}
        {secondRow.length > 0 && (
          <div className="flex justify-center space-x-1">
            {secondRow.map((emotion, index) => (
              <div key={index} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-center flex-1">
                <div className="text-xs text-gray-700 dark:text-gray-300 truncate">{emotion.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {topEmotions.length === 0 && (
        <div className="text-xs text-gray-500 text-center">No emotions detected</div>
      )}
    </div>
  );
}
