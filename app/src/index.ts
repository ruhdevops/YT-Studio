/**
 * YouTube API v3 Cloudflare Worker
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: /health, /api/channel, /api/videos, /api/search
 */

export interface Env {
	YOUTUBE_API_KEY?: string;
	CHANNEL_ID?: string;
	ENVIRONMENT?: string;
}

interface Video {
	id: string;
	videoId: string;
	title: string;
	description: string;
	thumbnail: string;
	publishedAt: string;
	category: string;
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
	const rules: [string, string[]][] = [
		['quran', ['quran', 'surah', 'ayah', 'tafsir']],
		['prophecy', ['prophecy', 'dajjal', 'gog', 'magog', 'end times']],
		['discussion', ['discussion', 'podcast', 'debate', 'interview']],
		['educational', ['guide', 'explained', 'documentary', 'lesson']],
		['history', ['history', 'empire', 'caliph', 'war', 'civilization', 'ottoman']],
	];
	for (const [cat, terms] of rules) {
		if (terms.some((term) => t.includes(term))) return cat;
	}
	return 'history';
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
		const apiKey = env.YOUTUBE_API_KEY || '';

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		if (url.pathname === '/' || url.pathname === '/health') {
			return json({
				status: 'healthy',
				worker: 'yt-studio-app',
				version: '1.0.0',
				timestamp: new Date().toISOString(),
				channel: channelId,
				environment: env.ENVIRONMENT || 'development',
				hasApiKey: !!apiKey,
				endpoints: {
					health: '/health',
					channel: '/api/channel',
					videos: '/api/videos',
					search: '/api/search?q=<query>',
				},
			});
		}

		if (!apiKey && url.pathname.startsWith('/api/')) {
			if (url.pathname === '/api/search' && !url.searchParams.get('q')) {
				return json({ error: 'Missing required query parameter: q', results: [] }, 400);
			}
			return json({
				isDemo: true,
				warning: 'YOUTUBE_API_KEY not configured — returning demo data',
				...(url.pathname === '/api/videos' && {
					videos: DEMO_VIDEOS,
					count: DEMO_VIDEOS.length,
					nextPageToken: null,
				}),
				...(url.pathname === '/api/channel' && {
					channel: {
						id: channelId,
						title: 'Ruh Al Tarikh (Demo)',
						url: `https://www.youtube.com/channel/${channelId}`,
					},
				}),
				...(url.pathname === '/api/search' && { results: [] }),
			});
		}

		if (url.pathname === '/api/channel') {
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`,
				);
				const data = (await res.json()) as {
					error?: { message: string };
					items?: {
						id: string;
						snippet: {
							title: string;
							description: string;
							thumbnails: { high?: { url: string }; default?: { url: string } };
						};
						statistics: {
							subscriberCount?: string;
							viewCount?: string;
							videoCount?: string;
						};
					}[];
				};
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
						subscribers: ch.statistics.subscriberCount || 'Hidden',
						views: ch.statistics.viewCount || '0',
						videos: parseInt(ch.statistics.videoCount || '0', 10),
						url: `https://www.youtube.com/channel/${ch.id}`,
					},
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), channel: { id: channelId } });
			}
		}

		if (url.pathname === '/api/videos') {
			const maxResults = url.searchParams.get('maxResults') || '12';
			const pageToken = url.searchParams.get('pageToken') || '';
			try {
				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
				);
				const chData = (await chRes.json()) as {
					error?: { message: string };
					items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
				};
				if (chData.error) throw new Error(chData.error.message);
				if (!chData.items?.[0]) throw new Error('Channel not found');
				const uploadsId = chData.items[0].contentDetails.relatedPlaylists.uploads;
				const ptParam = pageToken ? `&pageToken=${pageToken}` : '';
				const plRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`,
				);
				const plData = (await plRes.json()) as {
					error?: { message: string };
					items?: {
						contentDetails?: { videoId?: string };
						snippet?: {
							title?: string;
							description?: string;
							publishedAt?: string;
							thumbnails?: { high?: { url: string }; default?: { url: string } };
						};
					}[];
					nextPageToken?: string;
					pageInfo?: { totalResults?: number };
				};
				if (plData.error) throw new Error(plData.error.message);
				const videos: Video[] = (plData.items || []).map((item) => ({
					id: item.contentDetails?.videoId || '',
					videoId: item.contentDetails?.videoId || '',
					title: item.snippet?.title || 'Untitled',
					description: item.snippet?.description || '',
					thumbnail:
						item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
					publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
					category: detectCategory(item.snippet?.title || ''),
				}));
				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken || null,
					totalResults: plData.pageInfo?.totalResults || videos.length,
				});
			} catch (err) {
				const limit = Math.min(parseInt(maxResults, 10) || 12, DEMO_VIDEOS.length);
				return json({
					isDemo: true,
					error: String(err),
					videos: DEMO_VIDEOS.slice(0, limit),
					count: DEMO_VIDEOS.length,
					nextPageToken: null,
				});
			}
		}

		if (url.pathname === '/api/search') {
			const q = url.searchParams.get('q');
			if (!q) return json({ error: 'Missing required query parameter: q', results: [] }, 400);
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`,
				);
				const data = (await res.json()) as {
					error?: { message: string };
					items?: {
						id?: { videoId?: string };
						snippet?: {
							title?: string;
							description?: string;
							publishedAt?: string;
							thumbnails?: { high?: { url: string }; default?: { url: string } };
						};
					}[];
				};
				if (data.error) throw new Error(data.error.message);
				const results = (data.items || []).map((item) => ({
					id: item.id?.videoId || '',
					title: item.snippet?.title || 'Untitled',
					description: item.snippet?.description || '',
					thumbnail:
						item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
					publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
				}));
				return json({ isDemo: false, results });
			} catch (err) {
				return json({ isDemo: true, error: String(err), results: [] }, 500);
			}
		}

		return json(
			{
				error: 'Not found',
				availableEndpoints: ['/', '/health', '/api/channel', '/api/videos', '/api/search'],
			},
			404,
		);
	},
} satisfies ExportedHandler<Env>;
