"use client";

import React from "react";

export default function TermsOfServicePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Sereni Terms of Service</h1>
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
          <strong>Introduction:</strong> Welcome to Sereni (sereni.day), an AI-powered mental health application. By accessing or using our app, you agree to these Terms of Service ("Terms"). If you disagree with any part of these Terms, please do not use our services.
        </li>
        <li>
          <strong>Age Restrictions and Eligibility:</strong>
          <ul className="list-disc ml-6 my-2">
            <li>You must be at least 13 years old to use Sereni.</li>
            <li>If you are between 13 and 18 years old, you must:
              <ul className="list-disc ml-6">
                <li>Have your parent or legal guardian's permission to use Sereni</li>
                <li>Have your parent or legal guardian review and accept these Terms on your behalf</li>
                <li>Use Sereni under adult supervision</li>
              </ul>
            </li>
          </ul>
          <strong>User Responsibility:</strong>
          <ul className="list-disc ml-6 my-2">
            <li>You are at least 13 years old</li>
            <li>If you are between 13 and 18 years old, you have obtained parental or legal guardian permission</li>
            <li>You have provided truthful and accurate information about your age</li>
            <li>You understand that Sereni reserves the right to terminate any account at any time if we believe you have misrepresented your age</li>
          </ul>
          <strong>Parent/Guardian Responsibility:</strong>
          <ul className="list-disc ml-6 my-2">
            <li>Must review these Terms and our Privacy Policy</li>
            <li>Accepts responsibility for:
              <ul className="list-disc ml-6">
                <li>The minor's compliance with these Terms</li>
                <li>All activities that occur under the minor's account</li>
                <li>Any payments or charges associated with the account</li>
                <li>Ensuring appropriate professional mental health care is sought when needed</li>
              </ul>
            </li>
          </ul>
        </li>
        <li>
          <strong>User Accounts:</strong> You must provide a valid email address to create an account. You may be required to provide additional personal information. You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activities under your account. You must immediately notify us of any unauthorized use of your account.
        </li>
        <li>
          <strong>Subscriptions and Payment:</strong> Sereni may offer free sessions and subscription-based services. Payments are processed through trusted third-party providers and are subject to their terms and privacy policies. Subscription fees are billed in advance. You authorize us to charge your payment method for all fees. Prices may change with 30 days notice. Refunds may be available as outlined in our policies.
        </li>
        <li>
          <strong>Mandatory Acknowledgments:</strong>
          <ul className="list-disc ml-6 my-2">
            <li>Sereni is NOT:
              <ul className="list-disc ml-6">
                <li>A substitute for professional mental health treatment</li>
                <li>A crisis intervention service</li>
                <li>A suicide prevention service</li>
                <li>Capable of preventing or treating mental health emergencies</li>
                <li>Staffed by human mental health professionals</li>
                <li>A medical device or medical service of any kind</li>
                <li>Capable of diagnosing or treating any medical or mental health condition</li>
              </ul>
            </li>
            <li>You understand that:
              <ul className="list-disc ml-6">
                <li>Sereni uses artificial intelligence technology that has inherent limitations</li>
                <li>The AI may provide incorrect, inappropriate, or harmful responses</li>
                <li>You use Sereni entirely at your own risk</li>
                <li>No specific outcomes or benefits are guaranteed</li>
                <li>You are solely responsible for all decisions and actions taken based on interactions with Sereni</li>
                <li>Sereni cannot and does not monitor for user safety or well-being</li>
                <li>No human reviews or monitors your conversations in real-time</li>
              </ul>
            </li>
          </ul>
        </li>
        <li>
          <strong>Liability Waiver and Release:</strong>
          <ul className="list-disc ml-6 my-2">
            <li>EXPRESSLY WAIVE AND RELEASE Sereni, its owners, employees, contractors, partners, and affiliates from any and all liability, claims, causes of action, damages, costs, or expenses arising from:
              <ul className="list-disc ml-6">
                <li>Your use of the service</li>
                <li>Any decisions or actions you take based on interactions with the AI</li>
                <li>Any harm, injury, or damages (including death) related to using or following advice from Sereni</li>
                <li>Failure to seek appropriate professional medical or mental health care</li>
                <li>Any emergency situations or crises where Sereni was used instead of appropriate emergency services</li>
              </ul>
            </li>
            <li>AGREE TO INDEMNIFY AND HOLD HARMLESS Sereni and its affiliates against any claims, damages, or expenses (including legal fees) arising from:
              <ul className="list-disc ml-6">
                <li>Your violation of these terms</li>
                <li>Your use of the service</li>
                <li>Any harm to yourself or others related to your use of Sereni</li>
              </ul>
            </li>
          </ul>
        </li>
        <li>
          <strong>Privacy and Data Protection:</strong>
          <ul className="list-disc ml-6 my-2">
            <li>All conversations are encrypted end-to-end using industry-standard encryption</li>
            <li>Data is stored securely in our database platform with built-in encryption and row-level security</li>
            <li>Database backups are encrypted and stored securely</li>
            <li>All data transmissions between our application and our database are encrypted</li>
            <li>Authentication tokens and sensitive credentials are never stored in client-side storage</li>
          </ul>
          <strong>Use of Conversation Data:</strong>
          <ul className="list-disc ml-6 my-2">
            <li>You grant Sereni permission to:
              <ul className="list-disc ml-6">
                <li>Store and process your conversation data</li>
                <li>Use anonymized data for service improvement</li>
                <li>Share anonymized data with research partners</li>
                <li>Analyze conversations for quality assurance</li>
                <li>Create and maintain database backups</li>
              </ul>
            </li>
          </ul>
          <strong>Data Access and Deletion:</strong>
          <ul className="list-disc ml-6 my-2">
            <li>You may request your data at any time</li>
            <li>Data deletion requests will be honored within 30 days</li>
            <li>Deletion requests will be executed across all systems and backups</li>
            <li>Some data may be retained if required by law</li>
            <li>We may deny deletion requests in cases of abuse or legal obligations</li>
            <li>For full details, please refer to our Privacy Policy</li>
          </ul>
        </li>
        <li>
          <strong>Communication:</strong> By signing up, you consent to receive emails from Sereni regarding service updates, feedback requests, and promotional content. You may opt out of promotional emails via instructions in the email. Service-related emails cannot be opted out of while you maintain an account.
        </li>
        <li>
          <strong>Intellectual Property:</strong> Sereni retains all rights to the app's content, features, and functionality. Users retain ownership of their original content input during interactions. Users grant Sereni a non-exclusive, worldwide license to use their content for service improvement, research and development, quality assurance, and marketing (with additional consent).
        </li>
        <li>
          <strong>Prohibited Uses:</strong>
          <ul className="list-disc ml-6 my-2">
            <li>Use the app for any illegal purpose</li>
            <li>Attempt to gain unauthorized access</li>
            <li>Use the app to harass, abuse, or harm others</li>
            <li>Impersonate any person or entity</li>
            <li>Interfere with or disrupt functionality</li>
            <li>Attempt to reverse engineer the service</li>
            <li>Create competing services using our data</li>
            <li>Automate or scrape content</li>
            <li>Share account credentials</li>
          </ul>
        </li>
        <li>
          <strong>Service Limitations and Modifications:</strong>
          <ul className="list-disc ml-6 my-2">
            <li>The AI may provide incorrect or inappropriate responses</li>
            <li>Service availability is not guaranteed</li>
            <li>Performance may vary based on technical factors</li>
            <li>Features may change without notice</li>
          </ul>
          <strong>Content Limitations:</strong>
          <ul className="list-disc ml-6 my-2">
            <li>The AI cannot provide medical advice</li>
            <li>Responses are generated by algorithms, not humans</li>
            <li>Content may be inappropriate or triggering</li>
            <li>No guarantee of accuracy or appropriateness</li>
          </ul>
        </li>
        <li>
          <strong>Termination:</strong> We may terminate or suspend your access without prior notice or liability, for any reason in our sole discretion, if we believe you violated these terms, to comply with law or protect our rights, or for account inactivity.
        </li>
        <li>
          <strong>Accessibility:</strong> We strive to make our services accessible to all users. Contact our support team for accessibility assistance. We welcome feedback on improving accessibility.
        </li>
        <li>
          <strong>Third-party Links:</strong> We may provide links to external resources. We are not responsible for third-party content. Third-party services have their own terms. Use third-party services at your own risk.
        </li>
        <li>
          <strong>Updates to Terms:</strong> We may modify these terms at any time. Changes are effective immediately upon posting. Continued use constitutes acceptance of changes. Material changes will be notified via email.
        </li>
      </ol>
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Contact Information</h2>
        <p className="mb-1">If you have any questions about these Terms, please contact us at:</p>
        <address className="not-italic text-gray-700">
          hello@sereni.day
        </address>
      </section>
      <p className="mt-8 text-gray-700">By using Sereni, you confirm that you have read, understood, and agree to these terms and conditions.</p>
    </main>
  );
}
