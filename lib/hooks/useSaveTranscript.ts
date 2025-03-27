import { useToast } from "@/components/ui/use-toast";

/**
 * Hook to provide functions for saving transcript data
 */
export function useSaveTranscript() {
  const { toast } = useToast();
  
  /**
   * Trigger the save transcript action
   * @param reason - Reason for saving (e.g., 'userEnded', 'manualSave')
   */
  const saveTranscript = (reason: string = "manualSave") => {
    // Dispatch saveChat event to trigger the save handler
    const saveEvent = new CustomEvent('saveChat', {
      detail: { reason }
    });
    window.dispatchEvent(saveEvent);
    
    // Show toast notification
    toast({
      title: "Saving conversation",
      description: "Your conversation transcript is being saved.",
    });
    
    return true;
  };
  
  return { saveTranscript };
} 