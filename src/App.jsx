import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { HeroSection } from './components/HeroSection';
import { VideoRow } from './components/VideoRow';
import { VideoModal } from './components/VideoModal';

const API = "https://yt-studio-api.ruhdevopsytstudio.workers.dev";

export default function App() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => {
        setVideos(data.videos || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const heroVideo = videos[0];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />

      <main className="flex-1 lg:ml-64">
        {loading ? (
          <div className="flex h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <HeroSection video={heroVideo} onPlay={() => setSelectedVideo(heroVideo)} />

            <div className="space-y-12 pb-20 pt-8">
              <VideoRow title="🔥 Trending" videos={videos.slice(0, 10)} onSelect={setSelectedVideo} />
              <VideoRow title="🆕 Latest Episodes" videos={[...videos].reverse().slice(0, 10)} onSelect={setSelectedVideo} />
            </div>
          </>
        )}
      </main>

      <AnimatePresence>
        {selectedVideo && (
          <VideoModal
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            onNext={() => {
              const idx = videos.indexOf(selectedVideo);
              if (idx < videos.length - 1) setSelectedVideo(videos[idx + 1]);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
