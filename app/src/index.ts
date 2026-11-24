/**
 * YouTube API v3 Worker — Cloudflare Worker
 * Fetches data from YouTube channel UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: GET /, /api/channel, /api/videos, /api/search
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
		thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
		publishedAt: "2024-01-08T00:00:00Z",
		category: "prophecy",
	},
];

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

function detectCategory(title: string): string {
	const titleLower = title.toLowerCase();
	const categories: Record<string, string[]> = {
		quran: ["quran", "surah", "ayah", "tafsir", "quranic"],
		prophecy: ["prophecy", "dajjal", "gog", "magog", "end times"],
		discussion: ["discussion", "podcast", "debate", "interview"],
		educational: ["guide", "explained", "documentary", "lesson", "education"],
		history: ["history", "empire", "caliph", "war", "civilization", "ottoman", "crusade"],
	};
	for (const [category, terms] of Object.entries(categories)) {
		if (terms.some((term) => titleLower.includes(term))) return category;
	}
	return "history";
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
		const apiKey = env.YOUTUBE_API_KEY || "";
		const path = url.pathname;

		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		const respondJSON = (data: unknown, status = 200) =>
			new Response(JSON.stringify(data), {
				status,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});

		const hasApiKey = !!apiKey;

		if (path === "/" || path === "/health") {
			return respondJSON({
				status: "healthy",
				worker: "ytstudio-app",
				timestamp: new Date().toISOString(),
				channel: channelId,
				hasApiKey,
				environment: env.ENVIRONMENT || "development",
				endpoints: { health: "/", channel: "/api/channel", videos: "/api/videos", search: "/api/search" },
			});
		}

		if (path === "/api/channel") {
			if (!apiKey) {
				return respondJSON({
					isDemo: true,
					channel: { id: channelId, title: "Ruh Al Tarikh", url: `https://www.youtube.com/channel/${channelId}` },
				});
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`,
				);
				const data = (await res.json()) as { error?: { message: string }; items?: unknown[] };
				if (data.error) throw new Error(data.error.message);
				if (!data.items?.length) throw new Error("Channel not found");
				const ch = data.items[0] as Record<string, unknown>;
				const snippet = ch.snippet as Record<string, unknown>;
				const stats = ch.statistics as Record<string, unknown>;
				const thumbs = snippet.thumbnails as Record<string, { url: string }>;
				return respondJSON({
					isDemo: false,
					channel: {
						id: ch.id || channelId,
						title: snippet.title || "Archive",
						description: snippet.description || "",
						thumbnail: thumbs?.high?.url || thumbs?.default?.url || "",
						subscribers: stats?.subscriberCount || "Hidden",
						views: stats?.viewCount || "0",
						videos: parseInt(String(stats?.videoCount || "0"), 10),
						url: `https://www.youtube.com/channel/${ch.id || channelId}`,
					},
				});
			} catch (err) {
				return respondJSON({ isDemo: true, error: String(err), channel: { id: channelId } });
			}
		}

		if (path === "/api/videos") {
			const maxResults = url.searchParams.get("maxResults") || "12";
			const pageToken = url.searchParams.get("pageToken") || "";

			if (!apiKey) {
				const limit = Math.min(parseInt(maxResults, 10) || 12, DEMO_VIDEOS.length);
				return respondJSON({ isDemo: true, videos: DEMO_VIDEOS.slice(0, limit), count: DEMO_VIDEOS.length });
			}

			try {
				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
				);
				const chData = (await chRes.json()) as { error?: { message: string }; items?: unknown[] };
				if (chData.error) throw new Error(chData.error.message);
				if (!chData.items?.[0]) throw new Error("Channel not found");
				const ch0 = chData.items[0] as Record<string, unknown>;
				const contentDetails = ch0.contentDetails as Record<string, { uploads: string }>;
				const uploadsId = contentDetails?.relatedPlaylists?.uploads;
				if (!uploadsId) throw new Error("Uploads playlist not found");

				const ptRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}&pageToken=${pageToken}&key=${apiKey}`,
				);
				const ptData = (await ptRes.json()) as { error?: { message: string }; items?: unknown[]; nextPageToken?: string; pageInfo?: { totalResults: number } };
				if (ptData.error) throw new Error(ptData.error.message);

				const videos: Video[] = (ptData.items || []).map((item: unknown) => {
					const i = item as Record<string, unknown>;
					const snippet = i.snippet as Record<string, unknown>;
					const cd = i.contentDetails as Record<string, string>;
					const thumbs = snippet?.thumbnails as Record<string, { url: string }>;
					return {
						id: cd?.videoId || "",
						videoId: cd?.videoId || "",
						title: String(snippet?.title || "Untitled"),
						description: String(snippet?.description || ""),
						thumbnail: thumbs?.high?.url || thumbs?.default?.url || "",
						publishedAt: String(snippet?.publishedAt || new Date().toISOString()),
						category: detectCategory(String(snippet?.title || "")),
					};
				});

				return respondJSON({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: ptData.nextPageToken || null,
					totalResults: ptData.pageInfo?.totalResults || videos.length,
				});
			} catch (err) {
				const limit = Math.min(parseInt(maxResults, 10) || 12, DEMO_VIDEOS.length);
				return respondJSON({ isDemo: true, videos: DEMO_VIDEOS.slice(0, limit), count: DEMO_VIDEOS.length, error: String(err) });
			}
		}

		if (path === "/api/search") {
			const q = url.searchParams.get("q");
			if (!q) return respondJSON({ error: "Query parameter required", results: [] }, 400);
			if (!apiKey) return respondJSON({ isDemo: true, results: [] });

			try {
				const sRes = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`,
				);
				const sData = (await sRes.json()) as { error?: { message: string }; items?: unknown[] };
				if (sData.error) throw new Error(sData.error.message);
				const results = (sData.items || []).map((item: unknown) => {
					const i = item as Record<string, unknown>;
					const id = i.id as Record<string, string>;
					const snippet = i.snippet as Record<string, unknown>;
					const thumbs = snippet?.thumbnails as Record<string, { url: string }>;
					return {
						id: id?.videoId || "",
						title: String(snippet?.title || "Untitled"),
						description: String(snippet?.description || ""),
						thumbnail: thumbs?.high?.url || thumbs?.default?.url || "",
						publishedAt: String(snippet?.publishedAt || new Date().toISOString()),
					};
				});
				return respondJSON({ isDemo: false, results });
			} catch (err) {
				return respondJSON({ isDemo: true, results: [], error: String(err) }, 500);
			}
		}

		return respondJSON({ error: "Not found", endpoints: ["/", "/api/channel", "/api/videos", "/api/search"] }, 404);
	},
} satisfies ExportedHandler<Env>;
