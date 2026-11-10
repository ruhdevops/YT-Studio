/**
 * YouTube API V3 Cloudflare Worker (app)
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
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
	const titleLower = title.toLowerCase();
	const categories: Record<string, string[]> = {
		quran: ['quran', 'surah', 'ayah', 'tafsir', 'quranic'],
		prophecy: ['prophecy', 'dajjal', 'gog', 'magog', 'end times'],
		discussion: ['discussion', 'podcast', 'debate', 'interview'],
		educational: ['guide', 'explained', 'documentary', 'lesson', 'education'],
		history: ['history', 'empire', 'caliph', 'war', 'civilization', 'ottoman', 'crusade'],
	};

	for (const [category, terms] of Object.entries(categories)) {
		if (terms.some((term) => titleLower.includes(term))) return category;
	}
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
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		const respondJSON = (data: unknown, status = 200) =>
			new Response(JSON.stringify(data), {
				status,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});

		try {
			const apiKey = env.YOUTUBE_API_KEY ?? '';
			const hasApiKey = !!apiKey;

			// Health / root
			if (path === '/' || path === '/health') {
				return respondJSON({
					status: 'healthy',
					worker: 'yt-studio-app',
					timestamp: new Date().toISOString(),
					channel: channelId,
					hasApiKey,
					environment: env.ENVIRONMENT ?? 'development',
					endpoints: { health: '/', channel: '/api/channel', videos: '/api/videos', search: '/api/search' },
				});
			}

			// Channel stats
			if (path === '/api/channel') {
				if (!hasApiKey) {
					return respondJSON({
						isDemo: true,
						status: 'no_api_key',
						channel: { id: channelId, title: 'Ruh Al Tarikh', url: `https://www.youtube.com/channel/${channelId}` },
					});
				}
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
				);
				const data = (await res.json()) as { error?: { message: string }; items?: unknown[] };
				if (data.error) throw new Error(data.error.message);
				if (!data.items?.length) throw new Error('Channel not found');
				const ch = data.items[0] as {
					id: string;
					snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } } };
					statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string };
				};
				return respondJSON({
					status: 'success',
					isDemo: false,
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

				if (!hasApiKey) {
					const limit = Math.min(parseInt(maxResults, 10) || 12, DEMO_VIDEOS.length);
					return respondJSON({ isDemo: true, videos: DEMO_VIDEOS.slice(0, limit), count: limit });
				}

				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = (await chRes.json()) as { error?: { message: string }; items?: unknown[] };
				if (chData.error) throw new Error(chData.error.message);
				if (!chData.items?.length) throw new Error('Channel not found');

				const uploadsId = (
					chData.items[0] as { contentDetails: { relatedPlaylists: { uploads: string } } }
				).contentDetails.relatedPlaylists.uploads;

				const ptParam = pageToken ? `&pageToken=${pageToken}` : '';
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

				const videos: Video[] = ((plData.items ?? []) as {
					contentDetails?: { videoId?: string };
					snippet?: {
						title?: string;
						description?: string;
						publishedAt?: string;
						thumbnails?: { high?: { url: string }; default?: { url: string } };
					};
				}[]).map((item) => ({
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
				});
			}

			// Search
			if (path === '/api/search') {
				const query = url.searchParams.get('q');
				if (!query) return respondJSON({ error: 'Missing q parameter', results: [] }, 400);

				if (!hasApiKey) {
					return respondJSON({ isDemo: true, results: [], error: 'No API key configured' });
				}

				const srRes = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
				);
				const srData = (await srRes.json()) as { error?: { message: string }; items?: unknown[] };
				if (srData.error) throw new Error(srData.error.message);

				const results = ((srData.items ?? []) as {
					id?: { videoId?: string };
					snippet?: {
						title?: string;
						description?: string;
						publishedAt?: string;
						thumbnails?: { high?: { url: string }; default?: { url: string } };
					};
				}[]).map((item) => ({
					id: item.id?.videoId ?? '',
					title: item.snippet?.title ?? 'Untitled',
					description: item.snippet?.description ?? '',
					thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
					publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
				}));

				return respondJSON({ isDemo: false, results });
			}

			return respondJSON({ error: 'Not found', endpoints: ['/', '/api/channel', '/api/videos', '/api/search'] }, 404);
		} catch (error) {
			return respondJSON({ error: 'Internal server error', message: String(error), isDemo: true, videos: DEMO_VIDEOS }, 500);
		}
	},
} satisfies ExportedHandler<Env>;
