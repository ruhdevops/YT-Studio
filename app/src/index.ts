/**
 * YT-Studio App Worker - Cloudflare Worker
 * Fetches YouTube API v3 data for channel UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 */

export interface Env {
	YOUTUBE_API_KEY?: string;
	ENVIRONMENT?: string;
	CHANNEL_ID?: string;
}

interface Video {
	id: string;
	title: string;
	description: string;
	thumbnail: string;
	publishedAt: string;
}

interface ChannelStats {
	id: string;
	title: string;
	description: string;
	thumbnail: string;
	subscribers: string;
	views: string;
	videoCount: number;
}

const DEFAULT_CHANNEL_ID = 'UCrjJP_SHUeCmqpTSHJCXkdA';

const DEMO_VIDEOS: Video[] = [
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

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
		const apiKey = env.YOUTUBE_API_KEY || '';

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		const json = (data: unknown, status = 200) =>
			new Response(JSON.stringify(data), {
				status,
				headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
			});

		const path = url.pathname;

		if (path === '/' || path === '/health') {
			return json({
				status: 'healthy',
				worker: 'yt-studio-app',
				environment: env.ENVIRONMENT || 'development',
				channel: channelId,
				hasApiKey: !!apiKey,
				endpoints: ['/api/videos', '/api/channel', '/api/search'],
				timestamp: new Date().toISOString(),
			});
		}

		if (path === '/api/videos') {
			const maxResults = url.searchParams.get('maxResults') || '12';
			const pageToken = url.searchParams.get('pageToken') || '';

			if (!apiKey) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}

			try {
				const chanResp = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chanData = (await chanResp.json()) as { items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }>; error?: { message: string } };

				if (chanData.error) throw new Error(chanData.error.message);
				if (!chanData.items?.[0]) throw new Error('Channel not found');

				const uploadsId = chanData.items[0].contentDetails.relatedPlaylists.uploads;
				const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
				const plResp = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${pageParam}&key=${apiKey}`
				);
				const plData = (await plResp.json()) as {
					items?: Array<{
						contentDetails?: { videoId?: string };
						snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: { high?: { url: string }; default?: { url: string } } };
					}>;
					nextPageToken?: string;
					pageInfo?: { totalResults?: number };
					error?: { message: string };
				};

				if (plData.error) throw new Error(plData.error.message);

				const videos: Video[] = (plData.items || []).map((item) => ({
					id: item.contentDetails?.videoId || '',
					title: item.snippet?.title || 'Untitled',
					description: item.snippet?.description || '',
					thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
					publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
				}));

				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken || null,
					totalResults: plData.pageInfo?.totalResults || videos.length,
				});
			} catch (err) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) });
			}
		}

		if (path === '/api/channel') {
			if (!apiKey) {
				return json({
					isDemo: true,
					channel: { id: channelId, title: 'Ruh Al Tarikh', url: `https://www.youtube.com/channel/${channelId}` },
				});
			}

			try {
				const resp = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = (await resp.json()) as {
					items?: Array<{
						id?: string;
						snippet?: { title?: string; description?: string; thumbnails?: { high?: { url: string }; default?: { url: string } } };
						statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string };
					}>;
					error?: { message: string };
				};

				if (data.error) throw new Error(data.error.message);
				if (!data.items?.[0]) throw new Error('Channel not found');

				const ch = data.items[0];
				const stats: ChannelStats = {
					id: ch.id || channelId,
					title: ch.snippet?.title || 'Ruh Al Tarikh',
					description: ch.snippet?.description || '',
					thumbnail: ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url || '',
					subscribers: ch.statistics?.subscriberCount || 'Hidden',
					views: ch.statistics?.viewCount || '0',
					videoCount: parseInt(ch.statistics?.videoCount || '0', 10),
				};

				return json({ isDemo: false, channel: stats });
			} catch (err) {
				return json({
					isDemo: true,
					channel: { id: channelId, title: 'Ruh Al Tarikh', url: `https://www.youtube.com/channel/${channelId}` },
					error: String(err),
				});
			}
		}

		if (path === '/api/search') {
			const q = url.searchParams.get('q');
			if (!q) return json({ error: 'Query parameter required' }, 400);

			if (!apiKey) {
				const filtered = DEMO_VIDEOS.filter((v) => v.title.toLowerCase().includes(q.toLowerCase()));
				return json({ isDemo: true, results: filtered });
			}

			try {
				const resp = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`
				);
				const data = (await resp.json()) as {
					items?: Array<{
						id?: { videoId?: string };
						snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: { high?: { url: string }; default?: { url: string } } };
					}>;
					error?: { message: string };
				};

				if (data.error) throw new Error(data.error.message);

				const results = (data.items || []).map((item) => ({
					id: item.id?.videoId || '',
					title: item.snippet?.title || 'Untitled',
					description: item.snippet?.description || '',
					thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
					publishedAt: item.snippet?.publishedAt || '',
				}));

				return json({ isDemo: false, results });
			} catch (err) {
				return json({ error: String(err), isDemo: true, results: [] }, 500);
			}
		}

		return json({ error: 'Not found', endpoints: ['/', '/api/videos', '/api/channel', '/api/search'] }, 404);
	},
} satisfies ExportedHandler<Env>;
