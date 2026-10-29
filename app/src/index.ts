/**
 * Cloudflare Worker — YouTube API v3 proxy for the YT-Studio project.
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 *
 * Endpoints:
 *   GET /                  health check
 *   GET /api/channel       channel statistics & snippet
 *   GET /api/videos        upload playlist (paginated)
 *   GET /api/search?q=...  video search within channel
 *
 * Environment bindings (Wrangler secrets):
 *   YOUTUBE_API_KEY  — YouTube Data API v3 key
 *   CHANNEL_ID       — optional override, defaults to UCrjJP_SHUeCmqpTSHJCXkdA
 */

export interface Env {
	YOUTUBE_API_KEY?: string;
	CHANNEL_ID?: string;
	ENVIRONMENT?: string;
}

interface Video {
	id: string;
	title: string;
	description: string;
	thumbnail: string;
	publishedAt: string;
	category: string;
}

const DEFAULT_CHANNEL = "UCrjJP_SHUeCmqpTSHJCXkdA";

const DEMO_VIDEOS: Video[] = [
	{
		id: "Zzcdtm7Il9U",
		title: "The hidden wall of Dhul-Qarnayn explained",
		description: "Deep dive into the archeological and scriptural evidence of the wall.",
		thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg",
		publishedAt: "2024-01-15T10:00:00Z",
		category: "history",
	},
	{
		id: "dQw4w9WgXcQ",
		title: "Islamic History: The Umayyad Dynasty",
		description: "Tracing the rise and fall of the first major Islamic caliphate.",
		thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		publishedAt: "2024-01-10T00:00:00Z",
		category: "history",
	},
	{
		id: "jNQXAC9IVRw",
		title: "Prophecy and End Times in Islamic Tradition",
		description: "Examine the prophetic narratives of the Quran and their interpretations.",
		thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
		publishedAt: "2024-01-08T00:00:00Z",
		category: "prophecy",
	},
];

const CORS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...CORS, "Content-Type": "application/json" },
	});
}

function detectCategory(title: string): string {
	const t = title.toLowerCase();
	if (["quran", "surah", "ayah", "tafsir"].some((k) => t.includes(k))) return "quran";
	if (["prophecy", "dajjal", "gog", "magog", "end times"].some((k) => t.includes(k))) return "prophecy";
	if (["discussion", "podcast", "debate", "interview"].some((k) => t.includes(k))) return "discussion";
	if (["guide", "explained", "documentary", "lesson"].some((k) => t.includes(k))) return "educational";
	return "history";
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: CORS });
		}

		const url = new URL(request.url);
		const path = url.pathname;
		const apiKey = env.YOUTUBE_API_KEY ?? "";
		const channelId = env.CHANNEL_ID ?? DEFAULT_CHANNEL;
		const hasKey = apiKey.length > 0;

		if (path === "/" || path === "/health") {
			return json({
				status: "healthy",
				worker: "ytstudio",
				channel: channelId,
				hasApiKey: hasKey,
				environment: env.ENVIRONMENT ?? "production",
				timestamp: new Date().toISOString(),
				endpoints: ["/api/channel", "/api/videos", "/api/search"],
			});
		}

		if (path === "/api/channel") {
			if (!hasKey) {
				return json({ isDemo: true, channel: { id: channelId, title: "Ruh Al Tarikh" } });
			}
			try {
				const res = await fetch(
					`https://youtube.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = (await res.json()) as Record<string, unknown>;
				const items = data.items as Record<string, unknown>[] | undefined;
				if (!items?.length) throw new Error("Channel not found");
				const ch = items[0] as Record<string, Record<string, unknown>>;
				const snippet = ch.snippet ?? {};
				const stats = ch.statistics ?? {};
				const thumbs = (snippet.thumbnails ?? {}) as Record<string, { url: string }>;
				return json({
					isDemo: false,
					channel: {
						id: ch.id ?? channelId,
						title: snippet.title ?? "",
						description: snippet.description ?? "",
						thumbnail: thumbs.high?.url ?? thumbs.default?.url ?? "",
						subscribers: stats.subscriberCount ?? "Hidden",
						views: stats.viewCount ?? "0",
						videos: Number(stats.videoCount ?? 0),
					},
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), channel: { id: channelId } });
			}
		}

		if (path === "/api/videos") {
			const maxResults = url.searchParams.get("maxResults") ?? "12";
			const pageToken = url.searchParams.get("pageToken") ?? "";

			if (!hasKey) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
			try {
				const chRes = await fetch(
					`https://youtube.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = (await chRes.json()) as Record<string, unknown>;
				const chItems = chData.items as Record<string, Record<string, Record<string, Record<string, string>>>>[] | undefined;
				if (!chItems?.length) throw new Error("Channel not found");
				const uploadsId = chItems[0].contentDetails?.relatedPlaylists?.uploads;
				if (!uploadsId) throw new Error("Uploads playlist not found");

				const ptParam = pageToken ? `&pageToken=${pageToken}` : "";
				const plRes = await fetch(
					`https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`
				);
				const plData = (await plRes.json()) as Record<string, unknown>;
				const plItems = (plData.items ?? []) as Record<string, Record<string, unknown>>[];

				const videos: Video[] = plItems.map((item) => {
					const sn = item.snippet as Record<string, unknown>;
					const cd = item.contentDetails as Record<string, string>;
					const thumbs = (sn?.thumbnails ?? {}) as Record<string, { url: string }>;
					return {
						id: cd?.videoId ?? "",
						title: String(sn?.title ?? "Untitled"),
						description: String(sn?.description ?? ""),
						thumbnail: thumbs.high?.url ?? thumbs.default?.url ?? "",
						publishedAt: String(sn?.publishedAt ?? new Date().toISOString()),
						category: detectCategory(String(sn?.title ?? "")),
					};
				});

				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: (plData.nextPageToken as string) ?? null,
					totalResults: (plData.pageInfo as Record<string, number>)?.totalResults ?? videos.length,
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
		}

		if (path === "/api/search") {
			const q = url.searchParams.get("q");
			if (!q) return json({ error: "Query parameter q is required", results: [] }, 400);
			if (!hasKey) return json({ isDemo: true, results: [], message: "API key required for search" });

			try {
				const searchRes = await fetch(
					`https://youtube.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`
				);
				const searchData = (await searchRes.json()) as Record<string, unknown>;
				const items = (searchData.items ?? []) as Record<string, Record<string, unknown>>[];
				const results = items.map((item) => {
					const sn = item.snippet as Record<string, unknown>;
					const id = item.id as Record<string, string>;
					const thumbs = (sn?.thumbnails ?? {}) as Record<string, { url: string }>;
					return {
						id: id?.videoId ?? "",
						title: String(sn?.title ?? ""),
						description: String(sn?.description ?? ""),
						thumbnail: thumbs.high?.url ?? thumbs.default?.url ?? "",
						publishedAt: String(sn?.publishedAt ?? ""),
					};
				});
				return json({ isDemo: false, results });
			} catch (err) {
				return json({ isDemo: true, error: String(err), results: [] }, 500);
			}
		}

		return json({ error: "Not found", endpoints: ["/", "/api/channel", "/api/videos", "/api/search"] }, 404);
	},
} satisfies ExportedHandler<Env>;
