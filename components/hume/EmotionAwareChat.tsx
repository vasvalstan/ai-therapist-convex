"use client";

import { useEffect, useState, useRef } from 'react';
import { useEmotionContext } from './FaceWidgets';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { EmotionName } from '@/lib/data/emotion';

interface EmotionAwareChatProps {
  sessionId: string;
  isActive: boolean;
}

// Define the emotion names we want to respond to
type ResponseEmotions = 
  | 'Joy' 
  | 'Amusement' 
  | 'Sadness' 
  | 'Confusion' 
  | 'Anger' 
  | 'Surprise (positive)' 
  | 'Surprise (negative)' 
  | 'Interest' 
  | 'Concentration' 
  | 'Determination' 
  | 'Boredom';

// Emotion thresholds for triggering responses
const EMOTION_THRESHOLDS: Record<string, number> = {
  'Joy': 0.6,
  'Amusement': 0.6,
  'Sadness': 0.55,
  'Confusion': 0.5,
  'Anger': 0.5,
  'Surprise (positive)': 0.6,
  'Surprise (negative)': 0.6,
  'Interest': 0.7,
  'Concentration': 0.7,
  'Determination': 0.65,
  'Boredom': 0.55
};

// Cooldown periods (in ms) to prevent repeated emotion acknowledgments
const COOLDOWN_PERIODS = {
  global: 60000, // 1 minute global cooldown
  specific: {
    'Joy': 120000,      // 2 minutes
    'Amusement': 120000, // 2 minutes
    'Sadness': 180000,   // 3 minutes
    'Confusion': 90000,  // 1.5 minutes
    'Anger': 180000,     // 3 minutes
    'Surprise (positive)': 90000,   // 1.5 minutes
    'Surprise (negative)': 90000,   // 1.5 minutes
    'Interest': 120000,  // 2 minutes
    'Concentration': 150000, // 2.5 minutes
    'Determination': 150000, // 2.5 minutes
    'Boredom': 120000    // 2 minutes
  } as Record<string, number>
};

export function EmotionAwareChat({ sessionId, isActive }: EmotionAwareChatProps) {
  const { dominantEmotion, emotionChanged } = useEmotionContext();
  const lastAcknowledgedEmotion = useRef<string | null>(null);
  const lastAcknowledgedTime = useRef<number>(0);
  const emotionCooldowns = useRef<Record<string, number>>({});
  
  // Convex mutation to add a system message
  const addSystemMessage = useMutation(api.chat.addSystemMessage);
  
  useEffect(() => {
    if (!isActive || !dominantEmotion || !emotionChanged) return;
    
    const emotionName = dominantEmotion.name;
    const emotionScore = dominantEmotion.score;
    const currentTime = Date.now();
    
    // Check if we should acknowledge this emotion
    const threshold = EMOTION_THRESHOLDS[emotionName] || 0.7;
    
    // Skip if emotion score is below threshold
    if (emotionScore < threshold) return;
    
    // Skip if we're in global cooldown period
    if (currentTime - lastAcknowledgedTime.current < COOLDOWN_PERIODS.global) return;
    
    // Skip if this specific emotion is in cooldown
    const specificCooldown = COOLDOWN_PERIODS.specific[emotionName] || 120000;
    const lastEmotionTime = emotionCooldowns.current[emotionName] || 0;
    if (currentTime - lastEmotionTime < specificCooldown) return;
    
    // Skip if it's the same emotion as last time
    if (emotionName === lastAcknowledgedEmotion.current) return;
    
    // Generate appropriate message based on the emotion
    let message = '';
    switch(emotionName) {
      case 'Joy':
        message = "I notice you're smiling! It's great to see you expressing joy.";
        break;
      case 'Amusement':
        message = "I can see that you're amused right now. It's nice to share these lighter moments.";
        break;
      case 'Sadness':
        message = "I notice you seem a bit sad. Would you like to talk about what's on your mind?";
        break;
      case 'Confusion':
        message = "You appear to be a bit confused. Let me try to explain things more clearly.";
        break;
      case 'Anger':
        message = "I notice you seem frustrated. It's okay to express how you feel.";
        break;
      case 'Surprise (positive)':
        message = "You look pleasantly surprised! Did something unexpected come up in our conversation?";
        break;
      case 'Surprise (negative)':
        message = "You look surprised. Was that unexpected or concerning?";
        break;
      case 'Interest':
        message = "I can see you're really engaged with this topic. Would you like to explore it further?";
        break;
      case 'Concentration':
        message = "I notice you're concentrating deeply. This seems important to you.";
        break;
      case 'Determination':
        message = "I can see your determination. You seem really committed to working through this.";
        break;
      case 'Boredom':
        message = "You seem a bit disengaged. Would you prefer to talk about something else?";
        break;
      default:
        return; // Don't send a message for emotions we don't have specific responses for
    }
    
    // Send the message to the chat
    addSystemMessage({
      sessionId,
      content: message,
      emotionContext: {
        emotionName,
        emotionScore
      }
    }).then(() => {
      // Update tracking variables
      lastAcknowledgedEmotion.current = emotionName;
      lastAcknowledgedTime.current = currentTime;
      emotionCooldowns.current[emotionName] = currentTime;
      
      console.log(`Acknowledged emotion: ${emotionName} (${emotionScore.toFixed(2)})`);
    }).catch(error => {
      console.error("Failed to add emotion acknowledgment message:", error);
    });
    
  }, [dominantEmotion, emotionChanged, isActive, sessionId, addSystemMessage]);
  
  // This component doesn't render anything visible
  return null;
}
