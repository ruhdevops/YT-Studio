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
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(API)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);

  useEffect(() => {
    fetch(API)
      .then(res => res.json())
      .then(data => {
        setVideos(data.videos || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setError(err.message);
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
          <div className="flex h-screen flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground animate-pulse">Fetching cinematic content...</p>
          </div>
        ) : error ? (
          <div className="flex h-screen flex-col items-center justify-center gap-6 px-4 text-center">
            <div className="rounded-full bg-destructive/10 p-6 text-destructive">
               <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Failed to load videos</h2>
              <p className="mt-2 text-muted-foreground">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-foreground px-8 py-2 font-bold text-background transition-transform hover:scale-105"
            >
              Retry
            </button>
          <div className="flex h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <HeroSection video={heroVideo} onPlay={() => setSelectedVideo(heroVideo)} />

            <div className="space-y-12 pb-20 pt-8">
              {videos.length > 0 ? (
                <>
                  <VideoRow title="🔥 Trending" videos={videos.slice(0, 10)} onSelect={setSelectedVideo} />
                  <VideoRow title="🆕 Latest Episodes" videos={[...videos].reverse().slice(0, 10)} onSelect={setSelectedVideo} />
                </>
              ) : (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-muted-foreground">No videos found in this channel.</p>
                </div>
              )}
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
