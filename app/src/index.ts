/**
 * YouTube API v3 Cloudflare Worker — ytstudio
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: /, /api/channel, /api/videos, /api/search
 */

export interface Env {
	YOUTUBE_API_KEY?: string;
	ENVIRONMENT?: string;
	CHANNEL_ID?: string;
}

interface Video {
	id: string;
	videoId: string;
	title: string;
	description: string;
	thumbnail: string;
	publishedAt: string;
	category?: string;
}

const DEMO_VIDEOS: Video[] = [
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

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS, POST',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function detectCategory(title: string): string {
	const lower = title.toLowerCase();
	const categories: Record<string, string[]> = {
		quran: ['quran', 'surah', 'ayah', 'tafsir', 'quranic'],
		prophecy: ['prophecy', 'dajjal', 'gog', 'magog', 'end times'],
		discussion: ['discussion', 'podcast', 'debate', 'interview'],
		educational: ['guide', 'explained', 'documentary', 'lesson', 'education'],
		history: ['history', 'empire', 'caliph', 'war', 'civilization', 'ottoman', 'crusade', 'silk road'],
	};
	for (const [cat, terms] of Object.entries(categories)) {
		if (terms.some((t) => lower.includes(t))) return cat;
	}
	return 'history';
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID ?? DEFAULT_CHANNEL_ID;
		const apiKey = env.YOUTUBE_API_KEY ?? '';
		const path = url.pathname;

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		const json = (data: unknown, status = 200) =>
			new Response(JSON.stringify(data), {
				status,
				headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
			});

		try {
			// Health / root
			if (path === '/' || path === '/health') {
				return json({
					status: 'healthy',
					worker: 'ytstudio',
					timestamp: new Date().toISOString(),
					channel: channelId,
					hasApiKey: !!apiKey,
					environment: env.ENVIRONMENT ?? 'development',
					endpoints: { health: '/', channel: '/api/channel', videos: '/api/videos', search: '/api/search' },
				});
			}

			// Channel info
			if (path === '/api/channel') {
				if (!apiKey) {
					return json({ isDemo: true, status: 'no_api_key', channel: { id: channelId, title: 'Ruh Al Tarikh', url: `https://www.youtube.com/channel/${channelId}` } });
				}
				const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`);
				const data = (await res.json()) as { items?: { id: string; snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } } }; statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string } }[]; error?: { message: string } };
				if (data.error) throw new Error(data.error.message);
				if (!data.items?.length) throw new Error('Channel not found');
				const ch = data.items[0];
				return json({
					status: 'success',
					isDemo: false,
					channel: {
						id: ch.id,
						title: ch.snippet.title,
						description: ch.snippet.description,
						thumbnail: ch.snippet.thumbnails.high?.url ?? ch.snippet.thumbnails.default?.url ?? '',
						subscribers: ch.statistics.subscriberCount ?? 'Hidden',
						views: ch.statistics.viewCount ?? '0',
						videos: parseInt(ch.statistics.videoCount ?? '0', 10),
						url: `https://www.youtube.com/channel/${ch.id}`,
					},
				});
			}

			// Video list
			if (path === '/api/videos') {
				const maxResults = url.searchParams.get('maxResults') ?? '12';
				const pageToken = url.searchParams.get('pageToken') ?? '';

				if (!apiKey) {
					const limit = Math.min(parseInt(maxResults, 10) || 12, DEMO_VIDEOS.length);
					return json({ isDemo: true, videos: DEMO_VIDEOS.slice(0, limit), count: DEMO_VIDEOS.length, error: 'No API key configured' });
				}

				const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
				const chData = (await chRes.json()) as { items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[]; error?: { message: string } };
				if (chData.error) throw new Error(chData.error.message);
				if (!chData.items?.[0]) throw new Error('Channel not found');

				const uploadsId = chData.items[0].contentDetails.relatedPlaylists.uploads;
				const vtRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}&pageToken=${pageToken}&key=${apiKey}`);
				const vtData = (await vtRes.json()) as { items?: { snippet: { title: string; description: string; publishedAt: string; thumbnails: { high?: { url: string }; default?: { url: string } } }; contentDetails: { videoId: string } }[]; nextPageToken?: string; pageInfo?: { totalResults: number }; error?: { message: string } };
				if (vtData.error) throw new Error(vtData.error.message);

				const videos: Video[] = (vtData.items ?? []).map((item) => ({
					id: item.contentDetails.videoId,
					videoId: item.contentDetails.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? '',
					publishedAt: item.snippet.publishedAt,
					category: detectCategory(item.snippet.title),
				}));

				return json({ isDemo: false, videos, count: videos.length, nextPageToken: vtData.nextPageToken ?? null, totalResults: vtData.pageInfo?.totalResults ?? videos.length });
			}

			// Search
			if (path === '/api/search') {
				const q = url.searchParams.get('q');
				if (!q) return json({ error: 'Query parameter required', results: [] }, 400);

				if (!apiKey) return json({ error: 'No API key configured', isDemo: true, results: [] }, 503);

				const srRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`);
				const srData = (await srRes.json()) as { items?: { id: { videoId: string }; snippet: { title: string; description: string; publishedAt: string; thumbnails: { high?: { url: string }; default?: { url: string } } } }[]; error?: { message: string } };
				if (srData.error) throw new Error(srData.error.message);

				const results = (srData.items ?? []).map((item) => ({
					id: item.id.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? '',
					publishedAt: item.snippet.publishedAt,
				}));

				return json({ isDemo: false, results });
			}

			return json({ error: 'Not found', endpoints: ['/', '/api/channel', '/api/videos', '/api/search'] }, 404);
		} catch (err) {
			return json({ error: 'Internal server error', message: String(err), isDemo: true, videos: DEMO_VIDEOS }, 500);
		}
	},
} satisfies ExportedHandler<Env>;
