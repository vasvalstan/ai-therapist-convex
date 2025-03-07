import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CheckCircle2, Send } from 'lucide-react';

interface FeedbackFormProps {
  sessionId?: string;
  source?: string;
}

export function FeedbackForm({ sessionId, source = 'trial_end' }: FeedbackFormProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const submitFeedback = useMutation(api.feedback.submitFeedback);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await submitFeedback({
        message: feedback,
        sessionId,
        source,
      });
      
      setIsSubmitted(true);
      setFeedback('');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-2 text-center">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
        <h3 className="font-medium">Thank you for your feedback!</h3>
        <p className="text-sm text-muted-foreground">
          Your input helps us improve our service.
        </p>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-medium">Share your thoughts</h3>
        <p className="text-sm text-muted-foreground">
          We&apos;d love to hear what you think about your experience so far.
        </p>
      </div>
      
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="What did you like? What could be improved?"
        className="min-h-[100px] resize-none"
        disabled={isSubmitting}
      />
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      
      <Button 
        type="submit" 
        className="w-full"
        disabled={isSubmitting || !feedback.trim()}
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Submitting...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Submit Feedback
          </span>
        )}
      </Button>
    </form>
  );
} 