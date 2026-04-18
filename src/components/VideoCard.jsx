import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export function VideoCard({ video, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className="group relative min-w-[280px] cursor-pointer"
      whileHover={{ scale: 1.05, zIndex: 10, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.3)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-card border border-border/50">
        {/* Iframe Facade Pattern */}
        <img
          src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
          alt={video.title}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300",
            isHovered ? "opacity-0" : "opacity-100"
          )}
        />
        {isHovered && (
          <div className="absolute inset-0">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1`}
              allow="autoplay"
            />
          </div>
        )}
      </div>
      <div className="mt-3 opacity-0 transition-opacity group-hover:opacity-100 px-1">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{video.title}</h3>
      </div>
    </motion.div>
  );
}
