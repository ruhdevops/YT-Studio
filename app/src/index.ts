export interface Env {
	YOUTUBE_API_KEY?: string;
	CHANNEL_ID?: string;
}

const DEFAULT_CHANNEL_ID = 'UCrjJP_SHUeCmqpTSHJCXkdA';

const DEMO_VIDEOS = [
	{
		id: 'Zzcdtm7Il9U',
		title: 'The hidden wall of Dhul-Qarnayn explained',
		thumbnail: 'https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg',
		publishedAt: '2024-01-15T10:00:00Z',
	},
	{
		id: 'dQw4w9WgXcQ',
		title: 'Islamic History: The Umayyad Dynasty',
		thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
		publishedAt: '2024-01-10T00:00:00Z',
	},
	{
		id: 'jNQXAC9IVRw',
		title: 'Prophecy and End Times in Islamic Tradition',
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
		const path = url.pathname;
		const channelId = env.CHANNEL_ID ?? DEFAULT_CHANNEL_ID;
		const apiKey = env.YOUTUBE_API_KEY ?? '';

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		const json = (data: unknown, status = 200) =>
			new Response(JSON.stringify(data), {
				status,
				headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
			});

		if (path === '/' || path === '/health') {
			return json({
				status: 'healthy',
				worker: 'ytstudio-app',
				channel: channelId,
				apiConfigured: !!apiKey,
				endpoints: ['/api/channel', '/api/videos'],
			});
		}

		if (path === '/api/channel') {
			if (!apiKey) {
				return json({ status: 'demo', channel: { id: channelId, title: 'Ruh Al Tarikh' } });
			}
			try {
				const resp = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = await resp.json() as {
					items?: Array<{
						id: string;
						snippet: { title: string; description: string };
						statistics: { subscriberCount: string; viewCount: string; videoCount: string };
					}>;
				};
				if (!data.items?.length) return json({ error: 'Channel not found' }, 404);
				const ch = data.items[0];
				return json({
					status: 'success',
					channel: {
						id: ch.id,
						title: ch.snippet.title,
						description: ch.snippet.description,
						subscribers: ch.statistics.subscriberCount,
						views: ch.statistics.viewCount,
						videos: ch.statistics.videoCount,
					},
				});
			} catch (e) {
				return json({ status: 'demo', error: String(e), channel: { id: channelId } });
			}
		}

		if (path === '/api/videos') {
			const maxResults = url.searchParams.get('maxResults') ?? '12';
			if (!apiKey) {
				return json({ status: 'demo', videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
			try {
				const chResp = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = await chResp.json() as {
					items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }>;
				};
				const playlistId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
				if (!playlistId) return json({ error: 'Playlist not found' }, 404);

				const vResp = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`
				);
				const vData = await vResp.json() as {
					items?: Array<{
						contentDetails: { videoId: string };
						snippet: { title: string; description: string; publishedAt: string; thumbnails?: { high?: { url: string }; default?: { url: string } } };
					}>;
					nextPageToken?: string;
				};
				const videos = (vData.items ?? []).map(item => ({
					id: item.contentDetails.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? '',
					publishedAt: item.snippet.publishedAt,
				}));
				return json({ status: 'success', videos, count: videos.length, nextPageToken: vData.nextPageToken ?? null });
			} catch (e) {
				return json({ status: 'demo', error: String(e), videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
		}

		return json({ error: 'Not found', endpoints: ['/', '/api/channel', '/api/videos'] }, 404);
	},
} satisfies ExportedHandler<Env>;
