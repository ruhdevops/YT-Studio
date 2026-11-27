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
	channel?: string;
	category?: string;
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
		channel: 'Ruh Al Tarikh',
		category: 'history',
	},
	{
		id: 'dQw4w9WgXcQ',
		videoId: 'dQw4w9WgXcQ',
		title: 'Islamic History: The Umayyad Dynasty',
		description: 'Tracing the rise and fall of the first major Islamic caliphate.',
		thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
		publishedAt: '2024-01-10T00:00:00Z',
		channel: 'Ruh Al Tarikh',
		category: 'history',
	},
	{
		id: 'jNQXAC9IVRw',
		videoId: 'jNQXAC9IVRw',
		title: 'Prophecy and End Times in Islamic Tradition',
		description: 'Examine the prophetic narratives of the Quran and their interpretations.',
		thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
		publishedAt: '2024-01-08T00:00:00Z',
		channel: 'Ruh Al Tarikh',
		category: 'prophecy',
	},
];

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

		if (pathname === '/' || pathname === '/health') {
			return json({
				status: 'healthy',
				worker: 'ytstudio',
				version: '2.0.0',
				timestamp: new Date().toISOString(),
				channel: channelId,
				hasApiKey: hasKey,
				environment: env.ENVIRONMENT || 'production',
				endpoints: ['/health', '/api/channel', '/api/videos', '/api/search'],
			});
		}

		if (pathname === '/api/channel') {
			if (!hasKey) {
				return json({
					isDemo: true,
					channel: { id: channelId, title: 'Ruh Al Tarikh', url: `https://www.youtube.com/channel/${channelId}` },
				});
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = (await res.json()) as any;
				if (data.error) throw new Error(data.error.message);
				if (!data.items?.length) throw new Error('Channel not found');
				const ch = data.items[0];
				return json({
					isDemo: false,
					channel: {
						id: ch.id,
						title: ch.snippet?.title,
						description: ch.snippet?.description,
						thumbnail: ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url,
						subscribers: ch.statistics?.subscriberCount ?? 'Hidden',
						views: ch.statistics?.viewCount ?? '0',
						videoCount: parseInt(ch.statistics?.videoCount ?? '0', 10),
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

			if (!hasKey) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
			try {
				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = (await chRes.json()) as any;
				if (chData.error) throw new Error(chData.error.message);
				const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
				if (!uploadsId) throw new Error('Uploads playlist not found');

				const ptParam = pageToken ? `&pageToken=${pageToken}` : '';
				const plRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`
				);
				const plData = (await plRes.json()) as any;
				if (plData.error) throw new Error(plData.error.message);

				const videos: Video[] = (plData.items || []).map((item: any) => ({
					id: item.contentDetails?.videoId ?? '',
					videoId: item.contentDetails?.videoId ?? '',
					title: item.snippet?.title ?? 'Untitled',
					description: item.snippet?.description ?? '',
					thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
					publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
					channel: item.snippet?.channelTitle,
					category: detectCategory(item.snippet?.title ?? ''),
				}));

				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken ?? null,
					totalResults: plData.pageInfo?.totalResults ?? videos.length,
				});
			} catch (err) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) });
			}
		}

		if (pathname === '/api/search') {
			const q = url.searchParams.get('q');
			if (!q) return json({ error: 'Missing query parameter ?q=', results: [] }, 400);

			if (!hasKey) {
				const lower = q.toLowerCase();
				const results = DEMO_VIDEOS.filter(
					(v) => v.title.toLowerCase().includes(lower) || v.description.toLowerCase().includes(lower)
				);
				return json({ isDemo: true, results, count: results.length });
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`
				);
				const data = (await res.json()) as any;
				if (data.error) throw new Error(data.error.message);
				const results = (data.items || []).map((item: any) => ({
					id: item.id?.videoId ?? '',
					title: item.snippet?.title ?? 'Untitled',
					description: item.snippet?.description ?? '',
					thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
					publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
				}));
				return json({ isDemo: false, results, count: results.length });
			} catch (err) {
				return json({ isDemo: true, results: [], error: String(err) }, 500);
			}
		}

		return json(
			{ error: 'Not found', endpoints: ['/health', '/api/channel', '/api/videos', '/api/search'] },
			404
		);
	},
} satisfies ExportedHandler<Env>;
