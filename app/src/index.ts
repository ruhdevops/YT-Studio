/**
 * YT-Studio App Worker - Cloudflare Worker
 * Fetches YouTube API v3 data for channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: /health, /api/channel, /api/videos, /api/search
 */

export interface Env {
	YOUTUBE_API_KEY?: string;
	ENVIRONMENT?: string;
	CHANNEL_ID?: string;
}

interface VideoItem {
	id: string;
	title: string;
	description: string;
	thumbnail: string;
	publishedAt: string;
}

const DEMO_VIDEOS: VideoItem[] = [
	{
		id: 'Zzcdtm7Il9U',
		title: 'The hidden wall of Dhul-Qarnayn explained',
		description: 'Deep dive into the archeological and scriptural evidence of the wall.',
		thumbnail: 'https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg',
		publishedAt: '2024-01-15T10:00:00Z',
	},
	{
		id: 'dQw4w9WgXcQ',
		title: 'Islamic History: The Umayyad Dynasty',
		description: 'Tracing the rise and fall of the first major Islamic caliphate.',
		thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
		publishedAt: '2024-01-10T00:00:00Z',
	},
	{
		id: 'jNQXAC9IVRw',
		title: 'Prophecy and End Times in Islamic Tradition',
		description: 'Examine the prophetic narratives of the Quran and their interpretations.',
		thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
		publishedAt: '2024-01-08T00:00:00Z',
	},
];

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const DEFAULT_CHANNEL = 'UCrjJP_SHUeCmqpTSHJCXkdA';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL;
		const apiKey = env.YOUTUBE_API_KEY || '';

		const cors = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: cors });
		}

		const json = (data: unknown, status = 200) =>
			new Response(JSON.stringify(data), {
				status,
				headers: { ...cors, 'Content-Type': 'application/json' },
			});

		if (path === '/' || path === '/health') {
			return json({
				status: 'ok',
				worker: 'yt-studio-app',
				environment: env.ENVIRONMENT || 'development',
				channel: channelId,
				hasApiKey: !!apiKey,
				endpoints: ['/health', '/api/channel', '/api/videos', '/api/search'],
				timestamp: new Date().toISOString(),
			});
		}

		if (path === '/api/channel') {
			if (!apiKey) {
				return json({ isDemo: true, channel: { id: channelId, title: 'Ruh Al Tarikh' } });
			}
			try {
				const res = await fetch(
					`${YOUTUBE_API}/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = await res.json() as { items?: { id: string; snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } } }; statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string } }[]; error?: { message: string } };
				if (data.error) throw new Error(data.error.message);
				if (!data.items?.length) throw new Error('Channel not found');
				const ch = data.items[0];
				return json({
					isDemo: false,
					channel: {
						id: ch.id,
						title: ch.snippet.title,
						description: ch.snippet.description,
						thumbnail: ch.snippet.thumbnails.high?.url || ch.snippet.thumbnails.default?.url || '',
						subscribers: ch.statistics.subscriberCount || 'hidden',
						views: ch.statistics.viewCount || '0',
						videoCount: parseInt(ch.statistics.videoCount || '0', 10),
						url: `https://www.youtube.com/channel/${ch.id}`,
					},
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), channel: { id: channelId, title: 'Ruh Al Tarikh' } });
			}
		}

		if (path === '/api/videos') {
			const maxResults = Math.min(parseInt(url.searchParams.get('maxResults') || '12', 10), 50);
			const pageToken = url.searchParams.get('pageToken') || '';

			if (!apiKey) {
				return json({ isDemo: true, videos: DEMO_VIDEOS.slice(0, maxResults), count: DEMO_VIDEOS.length });
			}
			try {
				const chRes = await fetch(
					`${YOUTUBE_API}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = await chRes.json() as { items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[]; error?: { message: string } };
				if (chData.error) throw new Error(chData.error.message);
				if (!chData.items?.length) throw new Error('Channel not found');

				const uploadsId = chData.items[0].contentDetails.relatedPlaylists.uploads;
				const tokenParam = pageToken ? `&pageToken=${pageToken}` : '';
				const plRes = await fetch(
					`${YOUTUBE_API}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${tokenParam}&key=${apiKey}`
				);
				const plData = await plRes.json() as { items?: { contentDetails: { videoId: string }; snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } }; publishedAt: string } }[]; nextPageToken?: string; pageInfo?: { totalResults: number }; error?: { message: string } };
				if (plData.error) throw new Error(plData.error.message);

				const videos: VideoItem[] = (plData.items || []).map((item) => ({
					id: item.contentDetails.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
					publishedAt: item.snippet.publishedAt,
				}));

				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken || null,
					totalResults: plData.pageInfo?.totalResults || videos.length,
				});
			} catch (err) {
				return json({ isDemo: true, videos: DEMO_VIDEOS.slice(0, maxResults), count: DEMO_VIDEOS.length, error: String(err) });
			}
		}

		if (path === '/api/search') {
			const q = url.searchParams.get('q');
			if (!q) return json({ error: 'Missing query parameter q' }, 400);
			if (!apiKey) return json({ isDemo: true, results: [], error: 'No API key configured' });

			try {
				const res = await fetch(
					`${YOUTUBE_API}/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`
				);
				const data = await res.json() as { items?: { id: { videoId: string }; snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } }; publishedAt: string } }[]; error?: { message: string } };
				if (data.error) throw new Error(data.error.message);
				const results = (data.items || []).map((item) => ({
					id: item.id.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
					publishedAt: item.snippet.publishedAt,
				}));
				return json({ isDemo: false, results, count: results.length });
			} catch (err) {
				return json({ isDemo: true, results: [], error: String(err) }, 500);
			}
		}

		return json({ error: 'Not found', endpoints: ['/health', '/api/channel', '/api/videos', '/api/search'] }, 404);
	},
} satisfies ExportedHandler<Env>;
