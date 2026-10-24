/**
 * YouTube API v3 Worker - Cloudflare Worker (app entry point)
 * Provides channel stats, video listing and search for channel UCrjJP_SHUeCmqpTSHJCXkdA
 */

export interface Env {
	YOUTUBE_API_KEY?: string;
	CHANNEL_ID?: string;
	ENVIRONMENT?: string;
}

interface VideoItem {
	id: string;
	videoId: string;
	title: string;
	description: string;
	thumbnail: string;
	publishedAt: string;
	category: string;
}

const DEMO_VIDEOS: VideoItem[] = [
	{
		id: 'Zzcdtm7Il9U',
		videoId: 'Zzcdtm7Il9U',
		title: 'The hidden wall of Dhul-Qarnayn explained',
		description: 'Deep dive into the archeological and scriptural evidence of the wall.',
		thumbnail: 'https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg',
		publishedAt: '2024-01-15T10:00:00Z',
		category: 'history',
	},
	{
		id: 'dQw4w9WgXcQ',
		videoId: 'dQw4w9WgXcQ',
		title: 'Islamic History: The Umayyad Dynasty',
		description: 'Tracing the rise and fall of the first major Islamic caliphate.',
		thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
		publishedAt: '2024-01-10T00:00:00Z',
		category: 'history',
	},
	{
		id: 'jNQXAC9IVRw',
		videoId: 'jNQXAC9IVRw',
		title: 'Prophecy and End Times in Islamic Tradition',
		description: 'Examine the prophetic narratives of the Quran and their interpretations.',
		thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
		publishedAt: '2024-01-08T00:00:00Z',
		category: 'prophecy',
	},
];

const DEFAULT_CHANNEL_ID = 'UCrjJP_SHUeCmqpTSHJCXkdA';
const YT_BASE = 'https://www.googleapis.com/youtube/v3';

function detectCategory(title: string): string {
	const t = title.toLowerCase();
	if (['quran', 'surah', 'ayah', 'tafsir'].some((k) => t.includes(k))) return 'quran';
	if (['prophecy', 'dajjal', 'gog', 'magog', 'end times'].some((k) => t.includes(k))) return 'prophecy';
	if (['discussion', 'podcast', 'debate', 'interview'].some((k) => t.includes(k))) return 'discussion';
	if (['history', 'empire', 'caliph', 'war', 'ottoman', 'crusade'].some((k) => t.includes(k))) return 'history';
	return 'general';
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
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

		const { pathname } = url;

		if (pathname === '/' || pathname === '/health') {
			return json({
				status: 'healthy',
				worker: 'yt-studio-app',
				channel: channelId,
				hasApiKey: !!apiKey,
				environment: env.ENVIRONMENT || 'development',
				endpoints: ['/health', '/api/channel', '/api/videos', '/api/search'],
				timestamp: new Date().toISOString(),
			});
		}

		if (pathname === '/api/channel') {
			if (!apiKey) {
				return json({ isDemo: true, error: 'YOUTUBE_API_KEY not configured', channel: { id: channelId } });
			}
			try {
				const res = await fetch(`${YT_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`);
				const data = (await res.json()) as { items?: { id: string; snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } } }; statistics: { subscriberCount: string; viewCount: string; videoCount: string } }[] };
				if (!data.items?.length) throw new Error('Channel not found');
				const ch = data.items[0];
				return json({
					isDemo: false,
					channel: {
						id: ch.id,
						title: ch.snippet.title,
						description: ch.snippet.description,
						thumbnail: ch.snippet.thumbnails.high?.url || ch.snippet.thumbnails.default?.url || '',
						subscribers: ch.statistics.subscriberCount,
						views: ch.statistics.viewCount,
						videos: parseInt(ch.statistics.videoCount, 10),
						url: `https://www.youtube.com/channel/${ch.id}`,
					},
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), channel: { id: channelId } });
			}
		}

		if (pathname === '/api/videos') {
			const maxResults = url.searchParams.get('maxResults') || '12';
			const pageToken = url.searchParams.get('pageToken') || '';
			if (!apiKey) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: 'YOUTUBE_API_KEY not configured' });
			}
			try {
				const chRes = await fetch(`${YT_BASE}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
				const chData = (await chRes.json()) as { items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[] };
				if (!chData.items?.length) throw new Error('Channel not found');
				const uploadsId = chData.items[0].contentDetails.relatedPlaylists.uploads;

				const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
				const plRes = await fetch(`${YT_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${pageParam}&key=${apiKey}`);
				const plData = (await plRes.json()) as { items?: { contentDetails: { videoId: string }; snippet: { title: string; description: string; publishedAt: string; thumbnails: { high?: { url: string }; default?: { url: string } } } }[]; nextPageToken?: string; pageInfo?: { totalResults: number } };
				if (!plData.items) throw new Error('No videos found');

				const videos: VideoItem[] = plData.items.map((item) => ({
					id: item.contentDetails.videoId,
					videoId: item.contentDetails.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
					publishedAt: item.snippet.publishedAt,
					category: detectCategory(item.snippet.title),
				}));

				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken || null,
					totalResults: plData.pageInfo?.totalResults ?? videos.length,
				});
			} catch (err) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) });
			}
		}

		if (pathname === '/api/search') {
			const q = url.searchParams.get('q');
			if (!q) return json({ error: 'q parameter required', results: [] }, 400);
			if (!apiKey) return json({ isDemo: true, results: [], error: 'YOUTUBE_API_KEY not configured' });
			try {
				const res = await fetch(`${YT_BASE}/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`);
				const data = (await res.json()) as { items?: { id: { videoId: string }; snippet: { title: string; description: string; publishedAt: string; thumbnails: { high?: { url: string }; default?: { url: string } } } }[] };
				const results = (data.items || []).map((item) => ({
					id: item.id.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
					publishedAt: item.snippet.publishedAt,
				}));
				return json({ isDemo: false, results });
			} catch (err) {
				return json({ isDemo: true, results: [], error: String(err) }, 500);
			}
		}

		return json({ error: 'Not found', endpoints: ['/', '/api/channel', '/api/videos', '/api/search'] }, 404);
	},
} satisfies ExportedHandler<Env>;
