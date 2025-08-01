"use client"
import { Brain, Heart, Shield, Sparkles } from 'lucide-react'
import { motion } from "motion/react"

const features = [
  {
    name: '24/7 Emotional Support',
    description:
      'Access compassionate support whenever you need it. Our AI therapist is always available to listen, understand, and provide guidance through your emotional challenges.',
    icon: Heart,
  },
  {
    name: 'Private & Secure',
    description: 'Your mental health journey is personal. We ensure complete privacy with end-to-end encryption and strict data protection measures.',
    icon: Shield,
  },
  {
    name: 'Personalized Growth',
    description: 'Experience therapy tailored to your unique needs. Our AI learns and adapts to provide personalized insights and coping strategies that work for you.',
    icon: Brain,
  },
]

export default function SideBySide() {
  return (
    <section id="features" className="py-24 overflow-hidden">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="lg:pr-8 lg:pt-4"
          >
            <div>
              {/* Pill badge */}
              <div className="mb-6 w-fit rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/30 px-4 py-1">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-200">
                  <Sparkles className="h-4 w-4" />
                  <span>Why Choose AI Therapy</span>
                </div>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 dark:from-white dark:via-blue-300 dark:to-white pb-2">
                Your Mental Health Companion
              </h2>
              <p className="mt-6 text-lg text-gray-600 dark:text-gray-300">
                Experience the future of mental health support with our AI therapist. Get immediate, empathetic, and personalized care that grows with you.
              </p>
              <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-gray-600 lg:max-w-none">
                {features.map((feature, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    key={feature.name}
                    className="relative pl-12 group hover:bg-gray-50 dark:hover:bg-gray-800/50 p-4 rounded-xl transition-colors"
                  >
                    <dt className="inline font-semibold text-gray-900 dark:text-white">
                      <feature.icon
                        className="absolute left-3 top-5 h-6 w-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"
                        aria-hidden="true"
                      />
                      {feature.name}
                    </dt>{' '}
                    <dd className="inline text-gray-600 dark:text-gray-300">{feature.description}</dd>
                  </motion.div>
                ))}
              </dl>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
