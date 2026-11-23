/**
 * YouTube API V3 Worker — Cloudflare Worker
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: GET /, /health, /api/channel, /api/videos, /api/search
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

function detectCategory(title: string): string {
	const t = title.toLowerCase();
	if (['quran', 'surah', 'ayah', 'tafsir', 'quranic'].some((k) => t.includes(k))) return 'quran';
	if (['prophecy', 'dajjal', 'gog', 'magog', 'end times'].some((k) => t.includes(k))) return 'prophecy';
	if (['discussion', 'podcast', 'debate', 'interview'].some((k) => t.includes(k))) return 'discussion';
	if (['guide', 'explained', 'documentary', 'lesson', 'education'].some((k) => t.includes(k))) return 'educational';
	if (['history', 'empire', 'caliph', 'war', 'civilization', 'ottoman', 'crusade', 'silk road'].some((k) => t.includes(k))) return 'history';
	return 'history';
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
		const path = url.pathname;

		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		const respondJSON = (data: unknown, status = 200) =>
			new Response(JSON.stringify(data), {
				status,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});

		const apiKey = env.YOUTUBE_API_KEY ?? '';
		const hasSecretBinding = !!env.YOUTUBE_API_KEY;

		try {
			// Health / root
			if (path === '/' || path === '/health') {
				return respondJSON({
					status: 'healthy',
					worker: 'yt-studio-worker',
					timestamp: new Date().toISOString(),
					channel: channelId,
					hasSecretBinding,
					environment: env.ENVIRONMENT ?? 'development',
					endpoints: { health: '/', channel: '/api/channel', videos: '/api/videos', search: '/api/search' },
				});
			}

			// Require API key for all /api/* routes
			if (path.startsWith('/api/') && !apiKey) {
				throw new Error('YOUTUBE_API_KEY is not configured');
			}

			// Channel info
			if (path === '/api/channel') {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`,
				);
				const data = (await res.json()) as any;
				if (data.error) throw new Error(data.error.message);
				if (!data.items?.length) throw new Error('Channel not found');
				const ch = data.items[0];
				return respondJSON({
					status: 'success',
					isDemo: false,
					hasSecretBinding,
					channel: {
						id: ch.id ?? channelId,
						title: ch.snippet?.title ?? 'Archive',
						description: ch.snippet?.description ?? '',
						thumbnail: ch.snippet?.thumbnails?.high?.url ?? ch.snippet?.thumbnails?.default?.url ?? '',
						subscribers: ch.statistics?.subscriberCount ?? 'Hidden',
						views: ch.statistics?.viewCount ?? '0',
						videos: parseInt(ch.statistics?.videoCount ?? '0', 10),
						url: `https://www.youtube.com/channel/${ch.id ?? channelId}`,
					},
				});
			}

			// Video listing
			if (path === '/api/videos') {
				const maxResults = url.searchParams.get('maxResults') ?? '12';
				const pageToken = url.searchParams.get('pageToken') ?? '';

				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
				);
				const chData = (await chRes.json()) as any;
				if (chData.error) throw new Error(chData.error.message);
				if (!chData.items?.[0]) throw new Error('Channel not found');

				const uploadsId = chData.items[0].contentDetails?.relatedPlaylists?.uploads;
				if (!uploadsId) throw new Error('Uploads playlist not found');

				const plRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}&pageToken=${pageToken}&key=${apiKey}`,
				);
				const plData = (await plRes.json()) as any;
				if (plData.error) throw new Error(plData.error.message);
				if (!plData.items) throw new Error('No videos found');

				const videos: Video[] = plData.items.map((item: any) => ({
					id: item.contentDetails?.videoId ?? '',
					videoId: item.contentDetails?.videoId ?? '',
					title: item.snippet?.title ?? 'Untitled',
					description: item.snippet?.description ?? '',
					thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
					publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
					category: detectCategory(item.snippet?.title ?? ''),
				}));

				return respondJSON({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken ?? null,
					totalResults: plData.pageInfo?.totalResults ?? videos.length,
					hasSecretBinding,
				});
			}

			// Search
			if (path === '/api/search') {
				const query = url.searchParams.get('q');
				if (!query) return respondJSON({ error: 'Query parameter q is required', results: [] }, 400);

				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`,
				);
				const data = (await res.json()) as any;
				if (data.error) throw new Error(data.error.message);

				const results = (data.items ?? []).map((item: any) => ({
					id: item.id?.videoId ?? '',
					title: item.snippet?.title ?? 'Untitled',
					description: item.snippet?.description ?? '',
					thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
					publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
				}));

				return respondJSON({ isDemo: false, results, hasSecretBinding });
			}

			return respondJSON({ error: 'Not found', endpoints: ['/', '/api/channel', '/api/videos', '/api/search'] }, 404);
		} catch (err) {
			// Fallback to demo data on any unhandled error
			return respondJSON(
				{
					error: 'Internal server error',
					message: String(err),
					isDemo: true,
					videos: DEMO_VIDEOS,
					hasSecretBinding,
				},
				500,
			);
		}
	},
} satisfies ExportedHandler<Env>;
