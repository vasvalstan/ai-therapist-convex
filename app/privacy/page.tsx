"use client";

import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Sereni Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-4">Last Updated: April 15, 2025</p>
      <ol className="space-y-6 text-base text-gray-800">
        <li>
          <strong>Emergency Situations and Crisis Disclaimer:</strong> <br />
          <span className="font-bold uppercase text-red-600">Please read this section carefully</span>
          <ul className="list-disc ml-6 my-2">
            <li>IMMEDIATELY STOP USING SERENI.</li>
            <li>DIAL 988 (US) FOR THE SUICIDE AND CRISIS LIFELINE</li>
            <li>CALL YOUR LOCAL EMERGENCY SERVICES (911 IN US)</li>
            <li>GO TO THE NEAREST EMERGENCY ROOM</li>
            <li>CONTACT A QUALIFIED MENTAL HEALTH PROFESSIONAL</li>
          </ul>
          <span className="text-red-600 font-semibold">SERENI IS NOT AN EMERGENCY SERVICE AND CANNOT HELP IN CRISIS SITUATIONS.</span>
        </li>
        <li>
          <strong>Introduction:</strong> Welcome to Sereni (sereni.day), an AI-powered mental health application. By accessing or using our app, you agree to this Privacy Policy. If you disagree with any part of this policy, please do not use our services.
        </li>
        <li>
          <strong>Eligibility and Age Restrictions:</strong> You must be at least 18 years old to use Sereni. If you are between 13 and 18 years old, you may only use Sereni with the consent and supervision of a parent or legal guardian. We do not knowingly collect or solicit personal information from individuals under 13.
        </li>
        <li>
          <strong>User Accounts:</strong> To create an account, you must provide a valid email address and may be required to provide additional personal information. You are responsible for maintaining the confidentiality of your account credentials and all activities under your account.
        </li>
        <li>
          <strong>Subscriptions and Payment:</strong> Sereni may offer free sessions and subscription-based services. Payments are processed through trusted third-party providers and are subject to their terms and privacy policies.
        </li>
        <li>
          <strong>AI and Liability Disclaimer:</strong> Sereni provides general mental health support through AI technology. However:
          <ul className="list-disc ml-6 my-2">
            <li>Sereni is not a licensed therapist or mental health provider.</li>
            <li>The AI is not a substitute for professional medical advice, diagnosis, or treatment.</li>
            <li>Sereni does not guarantee the accuracy, completeness, or appropriateness of the AI's advice.</li>
            <li>You acknowledge that Sereni is not responsible for any consequences, harm, or losses resulting from using the AI's advice.</li>
            <li>Sereni is not suitable for emergency situations or crisis intervention.</li>
          </ul>
        </li>
        <li>
          <strong>Privacy and Data Protection:</strong> We prioritize the protection of your sensitive information:
          <ul className="list-disc ml-6 my-2">
            <li>All conversations are encrypted end-to-end.</li>
            <li>We do not share your personal data or conversation logs with third parties, except as required by law.</li>
            <li>Data is stored securely and in compliance with applicable data protection regulations.</li>
            <li>We may use anonymized and aggregated data to improve our services and AI models.</li>
          </ul>
        </li>
        <li>
          <strong>Communication:</strong> By signing up, you consent to receive emails from Sereni regarding service updates, feedback requests, and promotional content. You may opt out of promotional emails by following the instructions in the email.
        </li>
        <li>
          <strong>Data Deletion:</strong> You may request the deletion of your account and associated data at any time by contacting our support team at hello@sereni.day. We will comply with your request within 30 days, subject to legal retention requirements.
        </li>
        <li>
          <strong>Intellectual Property:</strong> Sereni retains all rights to the app's content, features, and functionality. Users retain ownership of any original content they input during interactions, granting Sereni a non-exclusive license to use this content for service improvement.
        </li>
        <li>
          <strong>Prohibited Uses:</strong> You agree not to:
          <ul className="list-disc ml-6 my-2">
            <li>Use the app for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to any part of the app</li>
            <li>Use the app to harass, abuse, or harm others</li>
            <li>Impersonate any person or entity</li>
            <li>Interfere with or disrupt the app's functionality</li>
          </ul>
        </li>
        <li>
          <strong>Termination:</strong> Sereni reserves the right to suspend or terminate your account for violations of this policy or for any other reason at our discretion.
        </li>
        <li>
          <strong>Modifications to Policy:</strong> We may modify this Privacy Policy at any time. Continued use of the app after changes constitutes acceptance of the new policy. We will notify users of significant changes via email.
        </li>
        <li>
          <strong>Accessibility:</strong> Sereni strives to make its services accessible to all users. If you have specific accessibility needs, please contact our support team.
        </li>
        <li>
          <strong>Third-party Links:</strong> Sereni may provide links to external resources. We are not responsible for the content or practices of these third-party sites.
        </li>
        <li>
          <strong>Limitations of AI:</strong> While our AI strives to provide helpful advice, it has limitations in understanding complex human emotions and situations. It should not be considered a replacement for human judgment or professional mental health care.
        </li>
      </ol>
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Contact Information</h2>
        <p className="mb-1">If you have any questions about this Privacy Policy, please contact us at:</p>
        <address className="not-italic text-gray-700">
          hello@sereni.day
        </address>
      </section>
    </main>
  );
}
