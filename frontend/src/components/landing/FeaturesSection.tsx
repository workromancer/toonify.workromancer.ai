'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Users, Video, Coins, BookOpen } from 'lucide-react';

const icons = {
    casting: Users,
    director: Video,
    world: BookOpen,
    global: Coins,
};

export default function FeaturesSection() {
    const t = useTranslations('Landing.Features');

    const features = [
        {
            key: 'casting',
            icon: icons.casting,
            title: t('castingTitle'),
            desc: t('castingDesc'),
        },
        {
            key: 'director',
            icon: icons.director,
            title: t('directorTitle'),
            desc: t('directorDesc'),
        },
        {
            key: 'world',
            icon: icons.world,
            title: t('worldTitle'),
            desc: t('worldDesc'),
        },
        {
            key: 'global',
            icon: icons.global,
            title: t('globalTitle'),
            desc: t('globalDesc'),
        },
    ];

    return (
        <section id="features" className="relative py-48 bg-black">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center mb-24">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        {t('title')}
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {features.map((feature, idx) => {
                        const Icon = feature.icon;
                        return (
                            <motion.div
                                key={feature.key}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                className="relative flex flex-col items-start gap-4 rounded-2xl bg-white/5 p-6 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-gray-400">
                                        {feature.desc}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
