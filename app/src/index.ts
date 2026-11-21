/**
 * YT-Studio Cloudflare Worker — YouTube API v3 proxy
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: GET /  GET /api/channel  GET /api/videos  GET /api/search
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
	category: string;
}

const DEFAULT_CHANNEL_ID = 'UCrjJP_SHUeCmqpTSHJCXkdA';

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

function detectCategory(title: string): string {
	const t = title.toLowerCase();
	if (['quran', 'surah', 'ayah', 'tafsir'].some((k) => t.includes(k))) return 'quran';
	if (['prophecy', 'dajjal', 'gog', 'magog', 'end times'].some((k) => t.includes(k))) return 'prophecy';
	if (['history', 'empire', 'caliph', 'ottoman', 'crusade', 'umayyad', 'abbasid'].some((k) => t.includes(k))) return 'history';
	if (['guide', 'explained', 'documentary', 'lesson'].some((k) => t.includes(k))) return 'educational';
	return 'history';
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
		const apiKey = env.YOUTUBE_API_KEY || '';
		const hasKey = !!apiKey;

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

		// Health / root
		if (pathname === '/' || pathname === '/health') {
			return json({
				status: 'healthy',
				worker: 'ytstudio-worker',
				timestamp: new Date().toISOString(),
				channel: channelId,
				hasKey,
				environment: env.ENVIRONMENT || 'development',
				endpoints: ['/api/channel', '/api/videos', '/api/search'],
			});
		}

		// Channel statistics
		if (pathname === '/api/channel') {
			if (!hasKey) {
				return json({ isDemo: true, error: 'YOUTUBE_API_KEY not configured', channel: { id: channelId } });
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = (await res.json()) as { error?: { message: string }; items?: unknown[] };
				if (data.error) throw new Error(data.error.message);
				const items = data.items as Array<{
					id: string;
					snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } } };
					statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string };
				}>;
				if (!items?.length) throw new Error('Channel not found');
				const ch = items[0];
				return json({
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
			} catch (err) {
				return json({ isDemo: true, error: String(err), channel: { id: channelId } });
			}
		}

		// Video listing from uploads playlist
		if (pathname === '/api/videos') {
			const maxResults = url.searchParams.get('maxResults') ?? '12';
			const pageToken = url.searchParams.get('pageToken') ?? '';

			if (!hasKey) {
				return json({ isDemo: true, error: 'YOUTUBE_API_KEY not configured', videos: DEMO_VIDEOS });
			}
			try {
				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = (await chRes.json()) as { error?: { message: string }; items?: unknown[] };
				if (chData.error) throw new Error(chData.error.message);
				const chItems = chData.items as Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }>;
				if (!chItems?.length) throw new Error('Channel not found');
				const uploadsId = chItems[0].contentDetails.relatedPlaylists.uploads;

				const ptParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
				const plRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`
				);
				const plData = (await plRes.json()) as {
					error?: { message: string };
					items?: unknown[];
					nextPageToken?: string;
					pageInfo?: { totalResults: number };
				};
				if (plData.error) throw new Error(plData.error.message);

				const videos: Video[] = ((plData.items ?? []) as Array<{
					contentDetails: { videoId: string };
					snippet: {
						title: string;
						description: string;
						publishedAt: string;
						thumbnails: { high?: { url: string }; default?: { url: string } };
					};
				}>).map((item) => ({
					id: item.contentDetails.videoId,
					videoId: item.contentDetails.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? '',
					publishedAt: item.snippet.publishedAt,
					category: detectCategory(item.snippet.title),
				}));

				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken ?? null,
					totalResults: plData.pageInfo?.totalResults ?? videos.length,
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), videos: DEMO_VIDEOS });
			}
		}

		// Search within channel
		if (pathname === '/api/search') {
			const q = url.searchParams.get('q');
			if (!q) return json({ error: 'Missing query parameter ?q=', results: [] }, 400);
			if (!hasKey) return json({ isDemo: true, error: 'YOUTUBE_API_KEY not configured', results: [] });

			try {
				const srRes = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`
				);
				const srData = (await srRes.json()) as {
					error?: { message: string };
					items?: unknown[];
				};
				if (srData.error) throw new Error(srData.error.message);

				const results = ((srData.items ?? []) as Array<{
					id: { videoId: string };
					snippet: {
						title: string;
						description: string;
						publishedAt: string;
						thumbnails: { high?: { url: string }; default?: { url: string } };
					};
				}>).map((item) => ({
					id: item.id.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? '',
					publishedAt: item.snippet.publishedAt,
				}));

				return json({ isDemo: false, results });
			} catch (err) {
				return json({ isDemo: true, error: String(err), results: [] }, 500);
			}
		}

		return json({ error: 'Not found', endpoints: ['/', '/api/channel', '/api/videos', '/api/search'] }, 404);
	},
} satisfies ExportedHandler<Env>;
