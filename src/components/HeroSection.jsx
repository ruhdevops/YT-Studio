import React from 'react';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

export function HeroSection({ video, onPlay }) {
  if (!video) return null;

  return (
    <section className="relative h-[70vh] w-full overflow-hidden">
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/20 to-transparent" />
      <iframe
        className="absolute inset-0 h-full w-full scale-125 opacity-60 grayscale-[20%]"
        src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${video.videoId}&rel=0`}
        allow="autoplay; encrypted-media"
      />
      <div className="absolute bottom-0 z-20 w-full p-8 md:p-16">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl text-4xl font-bold md:text-6xl"
        >
          {video.title}
        </motion.h1>
        <p className="mt-4 text-lg text-muted-foreground">Cinematic Islamic Documentary Series</p>
        <button
          onClick={onPlay}
          className="mt-8 flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        >
          <Play fill="currentColor" size={20} /> Play Now
        </button>
      </div>
    </section>
  );
}
