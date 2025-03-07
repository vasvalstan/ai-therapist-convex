"use client";

import { useVoice } from "@humeai/voice-react";
import { useEffect, useRef } from "react";

export function VoiceController() {
  const voice = useVoice();
  const prevStatusRef = useRef<string | undefined>(undefined);
  
  useEffect(() => {
    const handleTimeExpired = () => {
      console.log("VoiceController: Time expired event received, forcing disconnect");
      
      // Show a notification that the chat is being saved
      const saveMessage = document.createElement('div');
      saveMessage.className = 'fixed top-4 right-4 bg-green-100 text-green-800 p-3 rounded shadow-md z-50';
      saveMessage.textContent = 'Saving your chat before disconnecting...';
      document.body.appendChild(saveMessage);
      
      // Dispatch a custom event to trigger message saving
      const saveEvent = new CustomEvent('saveChat', {
        detail: { reason: "timeExpired" }
      });
      window.dispatchEvent(saveEvent);
      
      // Give a small delay to allow any pending messages to be saved
      setTimeout(() => {
        if (voice && voice.disconnect) {
          voice.disconnect();
        }
        
        // Update the message
        saveMessage.textContent = 'Your chat has been saved!';
        setTimeout(() => {
          saveMessage.remove();
        }, 3000);
      }, 1000);
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log("VoiceController: Page hidden, saving chat");
        
        // Dispatch a custom event to trigger message saving
        const saveEvent = new CustomEvent('saveChat', {
          detail: { reason: "visibilityChange" }
        });
        window.dispatchEvent(saveEvent);
      }
    };
    
    // Listen for the timeExpired event
    window.addEventListener('timeExpired', handleTimeExpired);
    
    // Listen for visibility change to save chat when user leaves the page
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Track status changes
    if (voice && voice.status) {
      const currentStatus = voice.status.value;
      
      // Log status changes
      if (prevStatusRef.current !== currentStatus) {
        console.log(`VoiceController: Status changed from ${prevStatusRef.current} to ${currentStatus}`);
        prevStatusRef.current = currentStatus;
      }
    }
    
    return () => {
      window.removeEventListener('timeExpired', handleTimeExpired);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [voice]);
  
  // This is a utility component that doesn't render anything
  return null;
} 