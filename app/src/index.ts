/**
 * YouTube API v3 Cloudflare Worker
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: /, /api/channel, /api/videos, /api/search
 */

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
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function detectCategory(title: string): string {
	const t = title.toLowerCase();
	const map: Record<string, string[]> = {
		quran: ['quran', 'surah', 'ayah', 'tafsir', 'quranic'],
		prophecy: ['prophecy', 'dajjal', 'gog', 'magog', 'end times'],
		discussion: ['discussion', 'podcast', 'debate', 'interview'],
		educational: ['guide', 'explained', 'documentary', 'lesson', 'education'],
		history: ['history', 'empire', 'caliph', 'war', 'civilization', 'ottoman', 'crusade'],
	};
	for (const [cat, terms] of Object.entries(map)) {
		if (terms.some((term) => t.includes(term))) return cat;
	}
	return 'history';
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
		const apiKey = env.YOUTUBE_API_KEY || '';

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		const json = (data: unknown, status = 200): Response =>
			new Response(JSON.stringify(data), {
				status,
				headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
			});

		const path = url.pathname;

		// Health / root
		if (path === '/' || path === '/health') {
			return json({
				status: 'healthy',
				worker: 'ytstudio-app',
				timestamp: new Date().toISOString(),
				channel: channelId,
				hasApiKey: !!apiKey,
				environment: env.ENVIRONMENT || 'development',
				endpoints: { health: '/', channel: '/api/channel', videos: '/api/videos', search: '/api/search' },
			});
		}

		// Channel statistics
		if (path === '/api/channel') {
			if (!apiKey) {
				return json({ isDemo: true, error: 'YOUTUBE_API_KEY not configured', channel: { id: channelId } }, 200);
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`,
				);
				const data = (await res.json()) as { items?: { id: string; snippet: Record<string, unknown>; statistics: Record<string, unknown> }[]; error?: { message: string } };
				if (data.error) throw new Error(data.error.message);
				if (!data.items?.length) throw new Error('Channel not found');
				const ch = data.items[0];
				return json({
					status: 'success',
					isDemo: false,
					channel: {
						id: ch.id,
						title: (ch.snippet as { title?: string }).title ?? '',
						subscribers: (ch.statistics as { subscriberCount?: string }).subscriberCount ?? 'Hidden',
						views: (ch.statistics as { viewCount?: string }).viewCount ?? '0',
						videos: parseInt(String((ch.statistics as { videoCount?: string }).videoCount ?? '0'), 10),
						url: `https://www.youtube.com/channel/${ch.id}`,
					},
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), channel: { id: channelId } });
			}
		}

		// Video listing
		if (path === '/api/videos') {
			const maxResults = url.searchParams.get('maxResults') ?? '12';
			const pageToken = url.searchParams.get('pageToken') ?? '';
			if (!apiKey) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
			try {
				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
				);
				const chData = (await chRes.json()) as { items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[]; error?: { message: string } };
				if (chData.error) throw new Error(chData.error.message);
				if (!chData.items?.[0]) throw new Error('Channel not found');
				const uploadsId = chData.items[0].contentDetails.relatedPlaylists.uploads;

				const vRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}&pageToken=${pageToken}&key=${apiKey}`,
				);
				const vData = (await vRes.json()) as { items?: unknown[]; nextPageToken?: string; pageInfo?: { totalResults: number }; error?: { message: string } };
				if (vData.error) throw new Error(vData.error.message);

				const videos = ((vData.items ?? []) as { contentDetails?: { videoId?: string }; snippet?: { title?: string; description?: string; thumbnails?: { high?: { url: string }; default?: { url: string } }; publishedAt?: string } }[]).map((item) => ({
					id: item.contentDetails?.videoId ?? '',
					videoId: item.contentDetails?.videoId ?? '',
					title: item.snippet?.title ?? 'Untitled',
					description: item.snippet?.description ?? '',
					thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
					publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
					category: detectCategory(item.snippet?.title ?? ''),
				}));

				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: vData.nextPageToken ?? null,
					totalResults: vData.pageInfo?.totalResults ?? videos.length,
				});
			} catch (err) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) });
			}
		}

		// Search
		if (path === '/api/search') {
			const query = url.searchParams.get('q');
			if (!query) return json({ error: 'Missing q parameter', results: [] }, 400);
			if (!apiKey) return json({ isDemo: true, error: 'YOUTUBE_API_KEY not configured', results: [] });
			try {
				const sRes = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`,
				);
				const sData = (await sRes.json()) as { items?: unknown[]; error?: { message: string } };
				if (sData.error) throw new Error(sData.error.message);
				const results = ((sData.items ?? []) as { id?: { videoId?: string }; snippet?: { title?: string; description?: string; thumbnails?: { high?: { url: string }; default?: { url: string } }; publishedAt?: string } }[]).map((item) => ({
					id: item.id?.videoId ?? '',
					title: item.snippet?.title ?? 'Untitled',
					description: item.snippet?.description ?? '',
					thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
					publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
				}));
				return json({ isDemo: false, results });
			} catch (err) {
				return json({ isDemo: true, error: String(err), results: [] }, 500);
			}
		}

		return json({ error: 'Not found', endpoints: ['/', '/api/channel', '/api/videos', '/api/search'] }, 404);
	},
} satisfies ExportedHandler<Env>;
