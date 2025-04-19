"use client";

import { Emotion } from "@/lib/data/emotion";

type DescriptorProps = {
  emotions: Emotion[];
  className?: string;
};

export function Descriptor({ emotions, className }: DescriptorProps) {
  className = className || "";
  
  if (emotions.length === 0) {
    return <div className={`${className} text-sm text-gray-500`}>No emotions detected</div>;
  }

  const sortedEmotions = [...emotions].sort((a, b) => b.score - a.score);
  const topEmotion = sortedEmotions[0];
  const secondEmotion = sortedEmotions[1];

  let description = "";
  if (topEmotion.score > 0.5) {
    description = `You appear to be feeling strong ${topEmotion.name.toLowerCase()}.`;
  } else if (topEmotion.score > 0.3) {
    description = `You seem to be experiencing ${topEmotion.name.toLowerCase()}, with hints of ${secondEmotion.name.toLowerCase()}.`;
  } else {
    description = `Your expression shows a mix of ${topEmotion.name.toLowerCase()} and ${secondEmotion.name.toLowerCase()}.`;
  }

  return (
    <div className={`${className}`}>
      <div className="mb-2 text-lg font-medium">Emotion Analysis</div>
      <div className="text-sm">{description}</div>
    </div>
  );
}
