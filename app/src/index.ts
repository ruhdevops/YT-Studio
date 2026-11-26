/**
 * YouTube API v3 Proxy Worker
 * Cloudflare Worker that proxies YouTube Data API v3 requests.
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 *
 * Endpoints:
 *   GET /           → health check
 *   GET /api/channel → channel statistics and snippet
 *   GET /api/videos  → paginated video list from uploads playlist
 *   GET /api/search  → search videos within channel
 */

export interface Env {
	YOUTUBE_API_KEY?: string;
	CHANNEL_ID?: string;
	ENVIRONMENT?: string;
}

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

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

async function fetchYouTube(url: string): Promise<{ ok: boolean; data: unknown }> {
	const res = await fetch(url);
	const data = await res.json();
	return { ok: res.ok, data };
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		const apiKey = env.YOUTUBE_API_KEY ?? "";
		const channelId = env.CHANNEL_ID ?? DEFAULT_CHANNEL_ID;

		// Health / root
		if (url.pathname === "/" || url.pathname === "/health") {
			return json({
				status: "healthy",
				worker: "ytstudio-proxy",
				environment: env.ENVIRONMENT ?? "development",
				channel: channelId,
				configured: !!apiKey,
				endpoints: ["/api/channel", "/api/videos", "/api/search"],
			});
		}

		// Require API key for all /api/* routes
		if (url.pathname.startsWith("/api/") && !apiKey) {
			return json({ error: "YOUTUBE_API_KEY secret not configured" }, 503);
		}

		// Channel statistics
		if (url.pathname === "/api/channel") {
			const { ok, data } = await fetchYouTube(
				`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`,
			);
			if (!ok) return json({ error: "YouTube API error", detail: data }, 502);
			const d = data as Record<string, unknown>;
			const items = d.items as Array<Record<string, unknown>> | undefined;
			if (!items?.length) return json({ error: "Channel not found" }, 404);
			const channel = items[0];
			const snippet = channel.snippet as Record<string, unknown>;
			const statistics = channel.statistics as Record<string, unknown>;
			const thumbnails = snippet.thumbnails as Record<string, Record<string, string>>;
			return json({
				id: channel.id,
				title: snippet.title,
				description: snippet.description,
				thumbnail: thumbnails?.high?.url ?? thumbnails?.default?.url ?? "",
				subscribers: statistics?.subscriberCount ?? "Hidden",
				views: statistics?.viewCount ?? "0",
				videoCount: parseInt(String(statistics?.videoCount ?? "0"), 10),
				url: `https://www.youtube.com/channel/${channel.id}`,
			});
		}

		// Video listing from uploads playlist
		if (url.pathname === "/api/videos") {
			const maxResults = url.searchParams.get("maxResults") ?? "12";
			const pageToken = url.searchParams.get("pageToken") ?? "";

			// Get uploads playlist ID
			const { ok: chOk, data: chData } = await fetchYouTube(
				`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
			);
			if (!chOk) return json({ error: "Failed to fetch channel", detail: chData }, 502);
			const cd = chData as Record<string, unknown>;
			const chItems = cd.items as Array<Record<string, unknown>> | undefined;
			if (!chItems?.length) return json({ error: "Channel not found" }, 404);
			const contentDetails = chItems[0].contentDetails as Record<string, unknown>;
			const relatedPlaylists = contentDetails.relatedPlaylists as Record<string, string>;
			const uploadsPlaylistId = relatedPlaylists?.uploads;
			if (!uploadsPlaylistId) return json({ error: "Uploads playlist not found" }, 404);

			// Fetch playlist items
			const pageParam = pageToken ? `&pageToken=${pageToken}` : "";
			const { ok: plOk, data: plData } = await fetchYouTube(
				`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}${pageParam}&key=${apiKey}`,
			);
			if (!plOk) return json({ error: "Failed to fetch videos", detail: plData }, 502);
			const pl = plData as Record<string, unknown>;
			const plItems = (pl.items as Array<Record<string, unknown>>) ?? [];
			const videos = plItems.map((item) => {
				const sn = item.snippet as Record<string, unknown>;
				const ct = item.contentDetails as Record<string, unknown>;
				const thumbs = sn.thumbnails as Record<string, Record<string, string>>;
				return {
					id: ct?.videoId,
					title: sn?.title ?? "Untitled",
					description: sn?.description ?? "",
					thumbnail: thumbs?.high?.url ?? thumbs?.default?.url ?? "",
					publishedAt: sn?.publishedAt ?? new Date().toISOString(),
				};
			});

			const pageInfo = pl.pageInfo as Record<string, number> | undefined;
			return json({
				videos,
				count: videos.length,
				nextPageToken: pl.nextPageToken ?? null,
				totalResults: pageInfo?.totalResults ?? videos.length,
			});
		}

		// Search within channel
		if (url.pathname === "/api/search") {
			const q = url.searchParams.get("q");
			if (!q) return json({ error: "Missing query parameter ?q=" }, 400);
			const maxResults = url.searchParams.get("maxResults") ?? "10";
			const { ok, data } = await fetchYouTube(
				`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=${maxResults}&key=${apiKey}`,
			);
			if (!ok) return json({ error: "Search failed", detail: data }, 502);
			const d = data as Record<string, unknown>;
			const items = (d.items as Array<Record<string, unknown>>) ?? [];
			const results = items.map((item) => {
				const id = item.id as Record<string, string>;
				const sn = item.snippet as Record<string, unknown>;
				const thumbs = sn.thumbnails as Record<string, Record<string, string>>;
				return {
					id: id?.videoId,
					title: sn?.title ?? "Untitled",
					description: sn?.description ?? "",
					thumbnail: thumbs?.high?.url ?? thumbs?.default?.url ?? "",
					publishedAt: sn?.publishedAt ?? new Date().toISOString(),
				};
			});
			return json({ results, count: results.length });
		}

		return json(
			{ error: "Not found", endpoints: ["/", "/api/channel", "/api/videos", "/api/search"] },
			404,
		);
	},
} satisfies ExportedHandler<Env>;
