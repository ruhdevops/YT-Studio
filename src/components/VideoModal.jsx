import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function VideoModal({ video, onClose, onNext }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm md:p-8"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-card shadow-2xl border border-border"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-background/50 p-2 text-foreground backdrop-blur-md hover:bg-background/80 transition-colors"
        >
          <X size={20} />
        </button>
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
          allow="autoplay; fullscreen"
        />
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-card p-6 md:p-10">
          <h2 className="text-2xl font-bold md:text-3xl">{video.title}</h2>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Now Playing</span>
            <button
              onClick={onNext}
              className="flex items-center gap-2 rounded-full bg-foreground px-6 py-2 text-sm font-bold text-background transition-transform hover:scale-105 active:scale-95"
            >
              Next Episode <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
