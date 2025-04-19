"use client";

import { createContext, useState, useContext, ReactNode } from 'react';

interface HumeContextType {
  isFaceTrackingEnabled: boolean;
  toggleFaceTracking: () => void;
  faceTrackingData: any | null;
  setFaceTrackingData: (data: any) => void;
  humeApiKey: string;
}

const HumeContext = createContext<HumeContextType | undefined>(undefined);

export function HumeProvider({ children }: { children: ReactNode }) {
  const [isFaceTrackingEnabled, setIsFaceTrackingEnabled] = useState(false);
  const [faceTrackingData, setFaceTrackingData] = useState<any | null>(null);
  
  // Store the API key in the context so it's accessible throughout the app
  const humeApiKey = "znC5lwg0niYf3NvHd0zWzNBkA3cNK8YYiAaAcxM80AL9A2G1";

  const toggleFaceTracking = () => {
    setIsFaceTrackingEnabled(prev => !prev);
  };

  return (
    <HumeContext.Provider value={{
      isFaceTrackingEnabled,
      toggleFaceTracking,
      faceTrackingData,
      setFaceTrackingData,
      humeApiKey
    }}>
      {children}
    </HumeContext.Provider>
  );
}

export const useHume = () => {
  const context = useContext(HumeContext);
  if (context === undefined) {
    throw new Error('useHume must be used within a HumeProvider');
  }
  return context;
};
