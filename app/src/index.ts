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
		const path = url.pathname;

		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		const respondJSON = (data: unknown, status = 200) =>
			new Response(JSON.stringify(data), {
				status,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});

		const apiKey = env.YOUTUBE_API_KEY || "";
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
					status: "no_api_key",
					channel: { id: channelId, title: "Ruh Al Tarikh - Cinematic Islamic Archive", url: `https://www.youtube.com/channel/${channelId}` },
				});
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
				);
				const data = (await res.json()) as { error?: { message: string }; items?: unknown[] };
				if (data.error) throw new Error(data.error.message);
				if (!data.items || data.items.length === 0) throw new Error("Channel not found");

				const channel = data.items[0] as {
					id: string;
					snippet?: { title?: string; description?: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } } };
					statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string };
				};
				return respondJSON({
					status: "success",
					isDemo: false,
					channel: {
						id: channel.id || channelId,
						title: channel.snippet?.title || "Archive",
						description: channel.snippet?.description || "",
						thumbnail: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url || "",
						subscribers: channel.statistics?.subscriberCount || "Hidden",
						views: channel.statistics?.viewCount || "0",
						videos: parseInt(channel.statistics?.videoCount || "0", 10),
						url: `https://www.youtube.com/channel/${channel.id || channelId}`,
					},
				});
			} catch (error) {
				return respondJSON({
					isDemo: true,
					status: "fallback_to_demo",
					error: String(error),
					channel: { id: channelId, title: "Ruh Al Tarikh - Cinematic Islamic Archive", url: `https://www.youtube.com/channel/${channelId}` },
				});
			}
		}

		if (path === "/api/videos") {
			const maxResults = url.searchParams.get("maxResults") || "12";
			const pageToken = url.searchParams.get("pageToken") || "";

			if (!apiKey) {
				const limit = Math.min(parseInt(maxResults, 10) || 12, DEMO_VIDEOS.length);
				return respondJSON({ isDemo: true, videos: DEMO_VIDEOS.slice(0, limit), count: DEMO_VIDEOS.length, hasApiKey });
			}

			try {
				const channelRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const channelData = (await channelRes.json()) as {
					error?: { message: string };
					items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>;
				};
				if (channelData.error) throw new Error(channelData.error.message);
				if (!channelData.items?.[0]) throw new Error("Channel not found");

				const uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;
				if (!uploadsPlaylistId) throw new Error("Uploads playlist not found");

				const ptParam = pageToken ? `&pageToken=${pageToken}` : "";
				const videosRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`
				);
				const videosData = (await videosRes.json()) as {
					error?: { message: string };
					items?: unknown[];
					nextPageToken?: string;
					pageInfo?: { totalResults?: number };
				};
				if (videosData.error) throw new Error(videosData.error.message);

				const videos: Video[] = (videosData.items || []).map((item: unknown) => {
					const i = item as {
						contentDetails?: { videoId?: string };
						snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } } };
					};
					return {
						id: i.contentDetails?.videoId || "",
						videoId: i.contentDetails?.videoId || "",
						title: i.snippet?.title || "Untitled",
						description: i.snippet?.description || "",
						thumbnail: i.snippet?.thumbnails?.high?.url || i.snippet?.thumbnails?.default?.url || "",
						publishedAt: i.snippet?.publishedAt || new Date().toISOString(),
						category: detectCategory(i.snippet?.title || ""),
					};
				});

				return respondJSON({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: videosData.nextPageToken || null,
					totalResults: videosData.pageInfo?.totalResults || videos.length,
					hasApiKey,
				});
			} catch (error) {
				const limit = Math.min(parseInt(maxResults, 10) || 12, DEMO_VIDEOS.length);
				return respondJSON({ isDemo: true, videos: DEMO_VIDEOS.slice(0, limit), count: DEMO_VIDEOS.length, error: String(error), hasApiKey });
			}
		}

		if (path === "/api/search") {
			const query = url.searchParams.get("q");
			if (!query) return respondJSON({ error: "Query parameter required", results: [] }, 400);

			if (!apiKey) {
				return respondJSON({ isDemo: true, results: [], error: "No API key configured" });
			}

			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
				);
				const data = (await res.json()) as { error?: { message: string }; items?: unknown[] };
				if (data.error) throw new Error(data.error.message);

				const results = (data.items || []).map((item: unknown) => {
					const i = item as {
						id?: { videoId?: string };
						snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } } };
					};
					return {
						id: i.id?.videoId || "",
						title: i.snippet?.title || "Untitled",
						description: i.snippet?.description || "",
						thumbnail: i.snippet?.thumbnails?.high?.url || i.snippet?.thumbnails?.default?.url || "",
						publishedAt: i.snippet?.publishedAt || new Date().toISOString(),
					};
				});

				return respondJSON({ isDemo: false, results, hasApiKey });
			} catch (error) {
				return respondJSON({ error: String(error), isDemo: true, results: [] }, 500);
			}
		}

		return respondJSON({ error: "Not found", endpoints: ["/", "/api/channel", "/api/videos", "/api/search"] }, 404);
	},
} satisfies ExportedHandler<Env>;
