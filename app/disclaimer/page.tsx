"use client";

import React from "react";

export default function DisclaimerPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Sereni AI Disclaimer</h1>
      <p className="text-sm text-gray-500 mb-4">Last Updated: April 15, 2025</p>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Emergency Situations and Crisis Disclaimer</h2>
        <p className="mb-2 font-bold uppercase text-red-600">Please read this section carefully</p>
        <ul className="list-disc ml-6 mb-2">
          <li>IMMEDIATELY STOP USING SERENI.</li>
          <li>DIAL 988 (US) FOR THE SUICIDE AND CRISIS LIFELINE</li>
          <li>CALL YOUR LOCAL EMERGENCY SERVICES (911 IN US)</li>
          <li>GO TO THE NEAREST EMERGENCY ROOM</li>
          <li>CONTACT A QUALIFIED MENTAL HEALTH PROFESSIONAL</li>
        </ul>
        <p className="mb-2 text-red-600 font-semibold">SERENI IS NOT AN EMERGENCY SERVICE AND CANNOT HELP IN CRISIS SITUATIONS.</p>
      </section>
      <ol className="space-y-6 text-base text-gray-800">
        <li>
          <strong>Nature of Service:</strong> Sereni provides conversational support through artificial intelligence (AI) technology. Our AI is a computer program designed to engage in supportive conversations and provide emotional support.
        </li>
        <li>
          <strong>Not a Substitute for Professional Care:</strong> Sereni is not a substitute for professional mental health care, medical advice, diagnosis, or treatment. Sereni is not a licensed mental health professional and cannot provide clinical diagnoses or treatment plans. We strongly encourage users to seek help from qualified mental health professionals for specific mental health concerns.
        </li>
        <li>
          <strong>Limitations of AI:</strong> While our AI agent is designed to be supportive, it has limitations in understanding complex human emotions, contexts, and situations. The AI may not always provide appropriate or accurate responses to all situations. The effectiveness of AI may vary from person to person.
        </li>
        <li>
          <strong>Emergency Situations:</strong> Sereni is not equipped to handle emergency situations or mental health crises. If you are experiencing a mental health emergency, please contact your local emergency services immediately or use a crisis helpline. For U.S. users, you can contact the National Suicide Prevention Lifeline at 1-800-273-8255 or text HOME to 741741 to reach a crisis counselor.
        </li>
        <li>
          <strong>Privacy and Data Usage:</strong> Your conversations with the AI are encrypted and stored securely. We may use anonymized conversation data to improve our AI system and services. Please refer to our Privacy Policy for more detailed information on data handling and protection.
        </li>
        <li>
          <strong>User Responsibility:</strong> You are responsible for your own mental health decisions and actions taken based on interactions with our AI. We encourage you to critically evaluate the AI's responses and use your judgment when considering its advice.
        </li>
        <li>
          <strong>Potential Risks:</strong> There is a risk of misunderstanding or misinterpreting the AI's responses. Overreliance on AI may delay seeking necessary professional help. The AI may not be able to identify or respond appropriately to signs of serious mental health conditions.
        </li>
        <li>
          <strong>Continuous Development:</strong> Our AI system is continually evolving and improving. The capabilities and limitations of the AI may change over time, and we will update this disclaimer accordingly.
        </li>
        <li>
          <strong>Feedback and Reporting:</strong> We encourage users to provide feedback on their experience with the AI. If you encounter any concerning or inappropriate responses from the AI, please report them to our support team immediately.
        </li>
      </ol>
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Contact Information</h2>
        <p className="mb-1">For any questions or concerns about this AI disclaimer, please contact us at:</p>
        <address className="not-italic text-gray-700">
          Sereni<br />
          hello@sereni.day<br />
        </address>
      </section>
    </main>
  );
}
