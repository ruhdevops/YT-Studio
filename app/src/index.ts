/**
 * YouTube API v3 Worker - yt-studio-app
 * Proxies YouTube Data API v3 for channel UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 *
 * Endpoints:
 *   GET /            - Health check with worker info
 *   GET /api/channel - Channel statistics from YouTube API v3
 *   GET /api/videos  - Video listing from uploads playlist
 */

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

type VideoItem = { id: string; title: string; thumbnail: string; publishedAt: string };

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
		const apiKey = env.YOUTUBE_API_KEY || '';

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

		if (path === '/' || path === '/health') {
			return json({
				status: 'ok',
				worker: 'yt-studio-app',
				channel: channelId,
				hasApiKey: !!apiKey,
				environment: env.ENVIRONMENT || 'development',
				endpoints: ['/api/channel', '/api/videos'],
			});
		}

		if (path === '/api/channel') {
			if (!apiKey) {
				return json({ isDemo: true, channel: { id: channelId } });
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = await res.json() as { items?: Array<Record<string, unknown>> };
				if (!data.items?.length) throw new Error('Channel not found');
				const ch = data.items[0] as Record<string, Record<string, unknown>>;
				const snippet = ch.snippet as Record<string, unknown>;
				const statistics = ch.statistics as Record<string, unknown>;
				return json({
					isDemo: false,
					channel: {
						id: ch.id,
						title: snippet?.title,
						subscribers: statistics?.subscriberCount,
						views: statistics?.viewCount,
						videos: statistics?.videoCount,
					},
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), channel: { id: channelId } });
			}
		}

		if (path === '/api/videos') {
			const maxResults = url.searchParams.get('maxResults') || '12';
			const pageToken = url.searchParams.get('pageToken') || '';
			if (!apiKey) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
			try {
				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = await chRes.json() as { items?: Array<Record<string, unknown>> };
				const uploadsId = (
					(chData.items?.[0] as Record<string, Record<string, Record<string, string>>>)
					?.contentDetails?.relatedPlaylists?.uploads
				);
				if (!uploadsId) throw new Error('Uploads playlist not found');

				const ptParam = pageToken ? `&pageToken=${pageToken}` : '';
				const plRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`
				);
				const plData = await plRes.json() as {
					items?: Array<Record<string, unknown>>;
					nextPageToken?: string;
				};
				const videos: VideoItem[] = (plData.items || []).map((item) => {
					const it = item as Record<string, Record<string, unknown>>;
					const snippet = it.snippet as Record<string, Record<string, string>>;
					const contentDetails = it.contentDetails as Record<string, string>;
					return {
						id: contentDetails?.videoId ?? '',
						title: (snippet?.title as string) ?? '',
						thumbnail: snippet?.thumbnails?.['high']?.url || snippet?.thumbnails?.['default']?.url || '',
						publishedAt: (snippet?.publishedAt as string) ?? '',
					};
				});
				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken || null,
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
		}

		return json(
			{ error: 'Not found', endpoints: ['/', '/api/channel', '/api/videos'] },
			404
		);
	},
} satisfies ExportedHandler<Env>;
