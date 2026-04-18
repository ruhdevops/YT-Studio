import React from 'react';
import { VideoCard } from './VideoCard';

export function VideoRow({ title, videos, onSelect }) {
  return (
    <section className="px-8 md:px-16">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {videos.map((v, i) => (
          <VideoCard key={v.videoId + i} video={v} onClick={() => onSelect(v)} />
        ))}
      </div>
    </section>
  );
}
