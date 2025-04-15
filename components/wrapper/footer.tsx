"use client"
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="border-t bg-white dark:bg-black">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="text-center md:text-left">
                        <Link href="/" className="inline-flex md:flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold">sereni</span>
                        </Link>
                    </div>

                    {/* Socials */}
                    <div className="text-center md:text-left">
                        <h3 className="text-sm font-medium mb-4">socials</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="https://www.instagram.com/sereni.day" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                                    instagram
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="text-center md:text-left">
                        <h3 className="text-sm font-medium mb-4">legal</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/privacy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                    privacy policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                    terms of service
                                </Link>
                            </li>
                            <li>
                                <Link href="/disclaimer" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                    ai disclaimer
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Copyright */}
                    <div className="text-center md:text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400"> 2025 Sereni Inc</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">by soul devs</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
