"use client"
import { HelpCircle } from "lucide-react"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { motion } from "motion/react"

const faqs = [
    {
        question: "what is included in the plus plan?",
        answer: "the plus plan offers unlimited well-being sessions, access to temporary chats, priority customer support, and early access to new features. it&apos;s perfect for those who want continuous support."
    },
    {
        question: "can I cancel my subscription?",
        answer: "yes, you can cancel your subscription at any time. there are no long-term commitments, and you&apos;ll continue to have access to Sereni until the end of your current billing period."
    },
    {
        question: "is Sereni a replacement for traditional therapy?",
        answer: "no, Sereni is designed to be a supportive companion to your mental health journey, not a replacement for professional therapy. while our AI can provide emotional support and coping strategies, we recommend consulting licensed mental health professionals for clinical needs."
    },
    {
        question: "what payment methods do you accept?",
        answer: "we accept all major credit cards (Visa, Mastercard, American Express) and popular digital payment methods. all payments are processed securely through our trusted payment partners."
    },
    {
        question: "is my data secure and confidential?",
        answer: "absolutely. we take your privacy seriously. all conversations with Sereni are encrypted end-to-end, and your personal information is protected with industry-standard security measures. we never share your data with third parties."
    },
    {
        question: "does Sereni support multiple languages?",
        answer: "currently, Sereni primarily operates in English, but we&apos;re actively working on adding support for more languages to make our service accessible to a broader global community."
    }
]

export function AccordionComponent() {
    return (
        <section className="py-24 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    {/* Pill badge */}
                    <div className="mx-auto w-fit rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/30 px-4 py-1 mb-6">
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-200">
                            <HelpCircle className="h-4 w-4" />
                            <span>FAQ</span>
                        </div>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 dark:from-white dark:via-blue-300 dark:to-white pb-2">
                        frequently asked questions
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-4 max-w-2xl mx-auto">
                        have questions about Sereni? we&apos;re here to help. if you can&apos;t find what you&apos;re looking for, our support team is just a message away.
                    </p>
                </div>

                {/* Accordion */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                >
                    <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index + 1}`}
                                className="border border-gray-200 dark:border-gray-800 rounded-lg mb-4 px-2"
                            >
                                <AccordionTrigger className="hover:no-underline py-4 px-2">
                                    <span className="font-medium text-left text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                        {faq.question}
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 pb-4">
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {faq.answer}
                                    </p>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </motion.div>
            </div>
        </section>
    )
}
