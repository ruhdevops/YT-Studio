/**
 * YouTube API V3 Worker - Cloudflare Worker
 * Fetches data from YouTube Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Provides video listing, channel statistics, and search via REST endpoints
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

function respondJSON(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
	});
}

function detectCategory(title: string): string {
	const t = title.toLowerCase();
	const rules: [string, string[]][] = [
		['quran', ['quran', 'surah', 'ayah', 'tafsir', 'quranic']],
		['prophecy', ['prophecy', 'dajjal', 'gog', 'magog', 'end times']],
		['discussion', ['discussion', 'podcast', 'debate', 'interview']],
		['educational', ['guide', 'explained', 'documentary', 'lesson', 'education']],
		['history', ['history', 'empire', 'caliph', 'war', 'civilization', 'ottoman', 'crusade', 'silk road']],
	];
	for (const [category, terms] of rules) {
		if (terms.some((term) => t.includes(term))) return category;
	}
	return 'history';
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
		const apiKey = env.YOUTUBE_API_KEY || '';
		const hasSecretBinding = !!env.YOUTUBE_API_KEY;
		const path = url.pathname;

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		try {
			if (path === '/' || path === '/health') {
				return respondJSON({
					status: 'healthy',
					worker: 'ytstudio',
					timestamp: new Date().toISOString(),
					channel: channelId,
					hasSecretBinding,
					environment: env.ENVIRONMENT || 'development',
					endpoints: {
						health: '/',
						channel: '/api/channel',
						videos: '/api/videos',
						search: '/api/search',
					},
				});
			}

			if (path.startsWith('/api/') && !apiKey) {
				return respondJSON({ error: 'YOUTUBE_API_KEY is not configured', isDemo: true, videos: DEMO_VIDEOS }, 503);
			}

			if (path === '/api/channel') {
				try {
					const res = await fetch(
						`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
					);
					const data = await res.json() as { error?: { message: string }; items?: Record<string, unknown>[] };
					if (data.error) throw new Error(data.error.message);
					if (!data.items || data.items.length === 0) throw new Error('Channel not found');
					const ch = data.items[0] as {
						id?: string;
						snippet?: { title?: string; description?: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } } };
						statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string };
					};
					return respondJSON({
						status: 'success',
						isDemo: false,
						hasSecretBinding,
						channel: {
							id: ch.id || channelId,
							title: ch.snippet?.title || 'Archive',
							description: ch.snippet?.description || '',
							thumbnail: ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url || '',
							subscribers: ch.statistics?.subscriberCount || 'Hidden',
							views: ch.statistics?.viewCount || '0',
							videos: parseInt(ch.statistics?.videoCount || '0', 10),
							url: `https://www.youtube.com/channel/${ch.id || channelId}`,
						},
					});
				} catch (error) {
					return respondJSON({
						isDemo: true,
						status: 'fallback_to_demo',
						error: String(error),
						channel: { id: channelId, title: 'Ruh Al Tarikh - Cinematic Islamic Archive', url: `https://www.youtube.com/channel/${channelId}` },
					});
				}
			}

			if (path === '/api/videos') {
				const maxResults = url.searchParams.get('maxResults') || '12';
				const pageToken = url.searchParams.get('pageToken') || '';
				try {
					const chRes = await fetch(
						`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
					);
					const chData = await chRes.json() as { error?: { message: string }; items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] };
					if (chData.error) throw new Error(chData.error.message);
					if (!chData.items || !chData.items[0]) throw new Error('Channel not found');
					const uploadsPlaylistId = chData.items[0].contentDetails?.relatedPlaylists?.uploads;
					if (!uploadsPlaylistId) throw new Error('Uploads playlist not found');

					const vidRes = await fetch(
						`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&pageToken=${pageToken}&key=${apiKey}`
					);
					const vidData = await vidRes.json() as {
						error?: { message: string };
						items?: {
							contentDetails?: { videoId?: string };
							snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } } };
						}[];
						nextPageToken?: string;
						pageInfo?: { totalResults?: number };
					};
					if (vidData.error) throw new Error(vidData.error.message);
					if (!vidData.items) throw new Error('No videos found');

					const videos: Video[] = (vidData.items || []).map((item) => ({
						id: item.contentDetails?.videoId || '',
						videoId: item.contentDetails?.videoId || '',
						title: item.snippet?.title || 'Untitled',
						description: item.snippet?.description || '',
						thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
						publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
						category: detectCategory(item.snippet?.title || ''),
					}));

					return respondJSON({
						isDemo: false,
						videos,
						count: videos.length,
						nextPageToken: vidData.nextPageToken || null,
						totalResults: vidData.pageInfo?.totalResults || videos.length,
						hasSecretBinding,
					});
				} catch (error) {
					const limit = parseInt(maxResults, 10);
					const count = isNaN(limit) ? 12 : Math.min(limit, DEMO_VIDEOS.length);
					return respondJSON({ isDemo: true, videos: DEMO_VIDEOS.slice(0, count), count: DEMO_VIDEOS.length, error: String(error), hasSecretBinding });
				}
			}

			if (path === '/api/search') {
				const query = url.searchParams.get('q');
				if (!query) return respondJSON({ error: 'Query parameter required', results: [] }, 400);
				try {
					const searchRes = await fetch(
						`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
					);
					const searchData = await searchRes.json() as {
						error?: { message: string };
						items?: { id?: { videoId?: string }; snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } } } }[];
					};
					if (searchData.error) throw new Error(searchData.error.message);
					const results = (searchData.items || []).map((item) => ({
						id: item.id?.videoId || '',
						title: item.snippet?.title || 'Untitled',
						description: item.snippet?.description || '',
						thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
						publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
					}));
					return respondJSON({ isDemo: false, results, hasSecretBinding });
				} catch (error) {
					return respondJSON({ error: String(error), isDemo: true, results: [] }, 500);
				}
			}

			return respondJSON({ error: 'Not found', endpoints: ['/', '/api/channel', '/api/videos', '/api/search'] }, 404);
		} catch (error) {
			return respondJSON({ error: 'Internal server error', message: String(error), isDemo: true, videos: DEMO_VIDEOS }, 500);
		}
	},
} satisfies ExportedHandler<Env>;
