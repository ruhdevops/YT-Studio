/**
 * YouTube API v3 Cloudflare Worker
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: /health, /api/channel, /api/videos, /api/search
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
		id: "Zzcdtm7Il9U",
		videoId: "Zzcdtm7Il9U",
		title: "The hidden wall of Dhul-Qarnayn explained",
		description: "Deep dive into the archeological and scriptural evidence of the wall.",
		thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg",
		publishedAt: "2024-01-15T10:00:00Z",
		category: "history",
	},
	{
		id: "dQw4w9WgXcQ",
		videoId: "dQw4w9WgXcQ",
		title: "Islamic History: The Umayyad Dynasty",
		description: "Tracing the rise and fall of the first major Islamic caliphate.",
		thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		publishedAt: "2024-01-10T00:00:00Z",
		category: "history",
	},
	{
		id: "jNQXAC9IVRw",
		videoId: "jNQXAC9IVRw",
		title: "Prophecy and End Times in Islamic Tradition",
		description: "Examine the prophetic narratives of the Quran and their interpretations.",
		thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg",
		publishedAt: "2024-01-08T00:00:00Z",
		category: "prophecy",
	},
];

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function respondJSON(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
	});
}

function detectCategory(title: string): string {
	const t = title.toLowerCase();
	const map: Record<string, string[]> = {
		quran: ["quran", "surah", "ayah", "tafsir"],
		prophecy: ["prophecy", "dajjal", "gog", "magog", "end times"],
		discussion: ["discussion", "podcast", "debate", "interview"],
		educational: ["guide", "explained", "documentary", "lesson"],
		history: ["history", "empire", "caliph", "war", "civilization", "ottoman", "crusade"],
	};
	for (const [cat, terms] of Object.entries(map)) {
		if (terms.some((term) => t.includes(term))) return cat;
	}
	return "history";
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
		const apiKey = env.YOUTUBE_API_KEY || "";
		const hasApiKey = !!apiKey;

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		if (path === "/" || path === "/health") {
			return respondJSON({
				status: "healthy",
				worker: "ytstudio",
				timestamp: new Date().toISOString(),
				channel: channelId,
				hasApiKey,
				environment: env.ENVIRONMENT || "production",
				endpoints: {
					health: "/health",
					channel: "/api/channel",
					videos: "/api/videos",
					search: "/api/search?q=query",
				},
			});
		}

		if (path === "/api/channel") {
			if (!apiKey) {
				return respondJSON({
					isDemo: true,
					status: "no_api_key",
					channel: { id: channelId, title: "Ruh Al Tarikh - Cinematic Islamic Archive", url: `https://www.youtube.com/channel/${channelId}` },
				});
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
				);
				const data = (await res.json()) as { error?: { message: string }; items?: Record<string, unknown>[] };
				if (data.error) throw new Error(data.error.message);
				if (!data.items || data.items.length === 0) throw new Error("Channel not found");
				const ch = data.items[0] as Record<string, Record<string, unknown>>;
				const snippet = ch.snippet as Record<string, unknown>;
				const stats = ch.statistics as Record<string, string>;
				const thumbnails = snippet.thumbnails as Record<string, { url: string }>;
				return respondJSON({
					status: "success",
					isDemo: false,
					channel: {
						id: channelId,
						title: snippet.title,
						description: snippet.description,
						thumbnail: thumbnails?.high?.url || thumbnails?.default?.url || "",
						subscribers: stats?.subscriberCount || "Hidden",
						views: stats?.viewCount || "0",
						videos: parseInt(stats?.videoCount || "0", 10),
						url: `https://www.youtube.com/channel/${channelId}`,
					},
				});
			} catch (err) {
				return respondJSON({ isDemo: true, status: "fallback", error: String(err), channel: { id: channelId } });
			}
		}

		if (path === "/api/videos") {
			const maxResults = url.searchParams.get("maxResults") || "12";
			const pageToken = url.searchParams.get("pageToken") || "";
			if (!apiKey) {
				return respondJSON({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, hasApiKey });
			}
			try {
				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = (await chRes.json()) as { error?: { message: string }; items?: Record<string, unknown>[] };
				if (chData.error) throw new Error(chData.error.message);
				if (!chData.items?.[0]) throw new Error("Channel not found");
				const contentDetails = (chData.items[0] as Record<string, Record<string, Record<string, string>>>).contentDetails;
				const uploadsId = contentDetails?.relatedPlaylists?.uploads;
				if (!uploadsId) throw new Error("Uploads playlist not found");

				const pageParam = pageToken ? `&pageToken=${pageToken}` : "";
				const plRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${pageParam}&key=${apiKey}`
				);
				const plData = (await plRes.json()) as {
					error?: { message: string };
					items?: Record<string, Record<string, unknown>>[];
					nextPageToken?: string;
					pageInfo?: { totalResults: number };
				};
				if (plData.error) throw new Error(plData.error.message);

				const videos: Video[] = (plData.items || []).map((item) => {
					const cd = item.contentDetails as Record<string, string>;
					const sn = item.snippet as Record<string, unknown>;
					const thumbs = sn.thumbnails as Record<string, { url: string }>;
					const vid = cd?.videoId || "";
					return {
						id: vid,
						videoId: vid,
						title: String(sn?.title || "Untitled"),
						description: String(sn?.description || ""),
						thumbnail: thumbs?.high?.url || thumbs?.default?.url || "",
						publishedAt: String(sn?.publishedAt || new Date().toISOString()),
						category: detectCategory(String(sn?.title || "")),
					};
				});

				return respondJSON({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken || null,
					totalResults: plData.pageInfo?.totalResults || videos.length,
					hasApiKey,
				});
			} catch (err) {
				const limit = parseInt(maxResults, 10);
				return respondJSON({
					isDemo: true,
					videos: DEMO_VIDEOS.slice(0, isNaN(limit) ? 12 : Math.min(limit, DEMO_VIDEOS.length)),
					count: DEMO_VIDEOS.length,
					error: String(err),
					hasApiKey,
				});
			}
		}

		if (path === "/api/search") {
			const query = url.searchParams.get("q");
			if (!query) return respondJSON({ error: "Query parameter q is required", results: [] }, 400);
			if (!apiKey) return respondJSON({ isDemo: true, results: [], error: "No API key configured" });
			try {
				const srRes = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
				);
				const srData = (await srRes.json()) as {
					error?: { message: string };
					items?: Record<string, unknown>[];
				};
				if (srData.error) throw new Error(srData.error.message);
				const results = (srData.items || []).map((item) => {
					const id = item.id as Record<string, string>;
					const sn = item.snippet as Record<string, unknown>;
					const thumbs = sn?.thumbnails as Record<string, { url: string }>;
					return {
						id: id?.videoId || "",
						title: String(sn?.title || "Untitled"),
						description: String(sn?.description || ""),
						thumbnail: thumbs?.high?.url || thumbs?.default?.url || "",
						publishedAt: String(sn?.publishedAt || new Date().toISOString()),
					};
				});
				return respondJSON({ isDemo: false, results, hasApiKey });
			} catch (err) {
				return respondJSON({ error: String(err), isDemo: true, results: [] }, 500);
			}
		}

		return respondJSON({ error: "Not found", endpoints: ["/health", "/api/channel", "/api/videos", "/api/search"] }, 404);
	},
} satisfies ExportedHandler<Env>;
