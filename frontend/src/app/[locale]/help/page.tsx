'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'; // Assuming shadcn accordion exists, if not I'll use simple details
import { HelpCircle, Book, MessageCircle, FileText } from 'lucide-react';

export default function HelpPage() {
    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto p-8">
                <header className="mb-10 text-center">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">How can we help?</h1>
                    <div className="max-w-xl mx-auto">
                        <input
                            type="text"
                            placeholder="Search for help articles..."
                            className="w-full h-12 px-5 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                    </div>
                </header>

                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-primary/50 transition-colors cursor-pointer">
                        <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                            <Book size={24} />
                        </div>
                        <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Documentation</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Detailed guides on using Toonify features.</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-primary/50 transition-colors cursor-pointer">
                        <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                            <FileText size={24} />
                        </div>
                        <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">API Reference</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Developer documentation for API integration.</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-primary/50 transition-colors cursor-pointer">
                        <div className="bg-green-100 dark:bg-green-900/30 w-12 h-12 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
                            <MessageCircle size={24} />
                        </div>
                        <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Support</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Contact our support team for assistance.</p>
                    </div>
                </div>

                <section>
                    <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        <details className="group bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 [&_summary::-webkit-details-marker]:hidden">
                            <summary className="flex cursor-pointer items-center justify-between gap-1.5 font-medium text-gray-900 dark:text-white">
                                <h3 className="text-lg">How do credits work?</h3>
                                <span className="shrink-0 rounded-full bg-white p-1.5 text-gray-900 sm:p-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="size-5 shrink-0 transition duration-300 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            </summary>
                            <p className="mt-4 leading-relaxed text-gray-700 dark:text-gray-300">
                                Credits are used to generate AI images and perform advanced edits. Each generation costs 1 credit. You receive 50 free credits upon sign-up, and you can purchase more or upgrade your plan for a monthly allowance.
                            </p>
                        </details>

                        <details className="group bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 [&_summary::-webkit-details-marker]:hidden">
                            <summary className="flex cursor-pointer items-center justify-between gap-1.5 font-medium text-gray-900 dark:text-white">
                                <h3 className="text-lg">Can I export my webtoon?</h3>
                                <span className="shrink-0 rounded-full bg-white p-1.5 text-gray-900 sm:p-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="size-5 shrink-0 transition duration-300 group-open:-rotate-180" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </span>
                            </summary>
                            <p className="mt-4 leading-relaxed text-gray-700 dark:text-gray-300">
                                Yes! You can export your episodes as vertical scroll images (PNG/JPG) or as a PDF. Premium users can also export project files for other software like Clip Studio Paint.
                            </p>
                        </details>
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}
