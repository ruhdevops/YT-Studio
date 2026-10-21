/**
 * YT-Studio Cloudflare Worker — YouTube API v3 proxy
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 */

export interface Env {
	YOUTUBE_API_KEY?: string;
	CHANNEL_ID?: string;
	ENVIRONMENT?: string;
}

const DEFAULT_CHANNEL = "UCrjJP_SHUeCmqpTSHJCXkdA";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		const apiKey = env.YOUTUBE_API_KEY ?? "";
		const channelId = env.CHANNEL_ID ?? DEFAULT_CHANNEL;

		if (url.pathname === "/" || url.pathname === "/health") {
			return json({
				status: "healthy",
				worker: "ytstudio",
				channel: channelId,
				environment: env.ENVIRONMENT ?? "development",
				hasApiKey: !!apiKey,
				endpoints: ["/health", "/api/channel", "/api/videos", "/api/search"],
			});
		}

		if (url.pathname === "/api/channel") {
			if (!apiKey) {
				return json({ error: "YOUTUBE_API_KEY not configured" }, 503);
			}
			const ytUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
			const res = await fetch(ytUrl);
			const data = (await res.json()) as { items?: unknown[]; error?: { message: string } };
			if (data.error) return json({ error: data.error.message }, 502);
			if (!data.items?.length) return json({ error: "Channel not found" }, 404);
			return json({ status: "success", channel: data.items![0] });
		}

		if (url.pathname === "/api/videos") {
			if (!apiKey) {
				return json({ error: "YOUTUBE_API_KEY not configured" }, 503);
			}
			const maxResults = url.searchParams.get("maxResults") ?? "12";
			const pageToken = url.searchParams.get("pageToken") ?? "";

			const chRes = await fetch(
				`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
			);
			const chData = (await chRes.json()) as {
				items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[];
				error?: { message: string };
			};
			if (chData.error) return json({ error: chData.error.message }, 502);
			const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
			if (!uploadsId) return json({ error: "Uploads playlist not found" }, 404);

			const ptParam = pageToken ? `&pageToken=${pageToken}` : "";
			const plRes = await fetch(
				`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`,
			);
			const plData = (await plRes.json()) as {
				items?: unknown[];
				nextPageToken?: string;
				pageInfo?: { totalResults?: number };
				error?: { message: string };
			};
			if (plData.error) return json({ error: plData.error.message }, 502);
			return json({
				status: "success",
				videos: plData.items ?? [],
				nextPageToken: plData.nextPageToken ?? null,
				totalResults: plData.pageInfo?.totalResults ?? 0,
			});
		}

		if (url.pathname === "/api/search") {
			if (!apiKey) {
				return json({ error: "YOUTUBE_API_KEY not configured" }, 503);
			}
			const q = url.searchParams.get("q");
			if (!q) return json({ error: "Missing query parameter q" }, 400);
			const searchRes = await fetch(
				`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`,
			);
			const searchData = (await searchRes.json()) as {
				items?: unknown[];
				error?: { message: string };
			};
			if (searchData.error) return json({ error: searchData.error.message }, 502);
			return json({ status: "success", results: searchData.items ?? [] });
		}

		return json({ error: "Not found", endpoints: ["/health", "/api/channel", "/api/videos", "/api/search"] }, 404);
	},
} satisfies ExportedHandler<Env>;
