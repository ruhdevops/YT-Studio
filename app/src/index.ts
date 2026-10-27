export interface Env {
	YOUTUBE_API_KEY?: string;
	CHANNEL_ID?: string;
}

const DEFAULT_CHANNEL_ID = 'UCrjJP_SHUeCmqpTSHJCXkdA';

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
	});
}

export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
		const apiKey = env.YOUTUBE_API_KEY;

		if (url.pathname === '/health') {
			return json({ status: 'ok', worker: 'ytstudio-app', channel: channelId, hasApiKey: !!apiKey });
		}

		if (!apiKey) {
			return json({
				status: 'degraded',
				message: 'YOUTUBE_API_KEY secret not configured — bind it in wrangler.jsonc to enable live data',
				channel: channelId,
			});
		}

		if (url.pathname === '/api/channel') {
			try {
				const resp = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = await resp.json() as Record<string, unknown>;
				return json(data);
			} catch (err: unknown) {
				return json({ error: String(err) }, 500);
			}
		}

		if (url.pathname === '/api/videos') {
			const maxResults = url.searchParams.get('maxResults') || '12';
			try {
				const channelResp = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const channelData = await channelResp.json() as { items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] };
				const uploadsId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
				if (!uploadsId) return json({ error: 'Uploads playlist not found' }, 404);

				const videosResp = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}&key=${apiKey}`
				);
				const videosData = await videosResp.json() as Record<string, unknown>;
				return json(videosData);
			} catch (err: unknown) {
				return json({ error: String(err) }, 500);
			}
		}

		return json(
			{ error: 'Not found', endpoints: ['/health', '/api/channel', '/api/videos'] },
			404
		);
	},
} satisfies ExportedHandler<Env>;
