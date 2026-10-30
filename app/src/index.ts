/**
 * YouTube API v3 Worker - ytstudio-app
 * Fetches channel data, videos, and search results from YouTube Data API v3.
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
	const t = title.toLowerCase();
	if (["quran", "surah", "ayah", "tafsir"].some((k) => t.includes(k))) return "quran";
	if (["prophecy", "dajjal", "gog", "magog", "end times"].some((k) => t.includes(k))) return "prophecy";
	if (["discussion", "podcast", "debate", "interview"].some((k) => t.includes(k))) return "discussion";
	if (["guide", "explained", "documentary", "lesson"].some((k) => t.includes(k))) return "educational";
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

		const json = (data: unknown, status = 200): Response =>
			new Response(JSON.stringify(data), {
				status,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});

		// Health / root
		if (path === "/" || path === "/health") {
			return json({
				status: "healthy",
				worker: "ytstudio-app",
				environment: env.ENVIRONMENT || "development",
				channel: channelId,
				hasApiKey: !!apiKey,
				timestamp: new Date().toISOString(),
				endpoints: {
					health: "/",
					channel: "/api/channel",
					videos: "/api/videos",
					search: "/api/search?q=<query>",
				},
			});
		}

		// Channel statistics
		if (path === "/api/channel") {
			if (!apiKey) {
				return json({
					isDemo: true,
					status: "no_api_key",
					channel: {
						id: channelId,
						title: "Ruh Al Tarikh - Cinematic Islamic Archive",
						url: `https://www.youtube.com/channel/${channelId}`,
					},
				});
			}
			try {
				const ytUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`;
				const resp = await fetch(ytUrl);
				const data = (await resp.json()) as {
					items?: Array<{
						id: string;
						snippet?: { title?: string; description?: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } } };
						statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string };
					}>;
					error?: { message: string };
				};
				if (data.error) throw new Error(data.error.message);
				if (!data.items || data.items.length === 0) throw new Error("Channel not found");
				const ch = data.items[0];
				return json({
					isDemo: false,
					channel: {
						id: ch.id || channelId,
						title: ch.snippet?.title || "Archive",
						description: ch.snippet?.description || "",
						thumbnail: ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url || "",
						subscribers: ch.statistics?.subscriberCount || "Hidden",
						views: ch.statistics?.viewCount || "0",
						videos: parseInt(ch.statistics?.videoCount || "0", 10),
						url: `https://www.youtube.com/channel/${ch.id || channelId}`,
					},
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), channel: { id: channelId, url: `https://www.youtube.com/channel/${channelId}` } });
			}
		}

		// Video listing via uploads playlist
		if (path === "/api/videos") {
			const maxResults = url.searchParams.get("maxResults") || "12";
			const pageToken = url.searchParams.get("pageToken") || "";
			if (!apiKey) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, status: "no_api_key" });
			}
			try {
				const chResp = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = (await chResp.json()) as {
					items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>;
					error?: { message: string };
				};
				if (chData.error) throw new Error(chData.error.message);
				if (!chData.items?.[0]) throw new Error("Channel not found");
				const playlistId = chData.items[0].contentDetails?.relatedPlaylists?.uploads;
				if (!playlistId) throw new Error("Uploads playlist not found");

				const ptParam = pageToken ? `&pageToken=${pageToken}` : "";
				const plResp = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`
				);
				const plData = (await plResp.json()) as {
					items?: Array<{
						contentDetails?: { videoId?: string };
						snippet?: {
							title?: string;
							description?: string;
							publishedAt?: string;
							thumbnails?: { high?: { url?: string }; default?: { url?: string } };
						};
					}>;
					nextPageToken?: string;
					pageInfo?: { totalResults?: number };
					error?: { message: string };
				};
				if (plData.error) throw new Error(plData.error.message);

				const videos: Video[] = (plData.items || []).map((item) => ({
					id: item.contentDetails?.videoId || "",
					videoId: item.contentDetails?.videoId || "",
					title: item.snippet?.title || "Untitled",
					description: item.snippet?.description || "",
					thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
					publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
					category: detectCategory(item.snippet?.title || ""),
				}));

				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken || null,
					totalResults: plData.pageInfo?.totalResults || videos.length,
				});
			} catch (err) {
				const limit = parseInt(maxResults, 10);
				const cap = isNaN(limit) ? 12 : Math.min(limit, DEMO_VIDEOS.length);
				return json({ isDemo: true, videos: DEMO_VIDEOS.slice(0, cap), count: DEMO_VIDEOS.length, error: String(err) });
			}
		}

		// Search
		if (path === "/api/search") {
			const q = url.searchParams.get("q");
			if (!q) return json({ error: "Query parameter ?q= required", results: [] }, 400);
			if (!apiKey) return json({ isDemo: true, error: "No API key configured", results: [] });
			try {
				const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`;
				const resp = await fetch(searchUrl);
				const data = (await resp.json()) as {
					items?: Array<{
						id?: { videoId?: string };
						snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; default?: { url?: string } } };
					}>;
					error?: { message: string };
				};
				if (data.error) throw new Error(data.error.message);
				const results = (data.items || []).map((item) => ({
					id: item.id?.videoId || "",
					title: item.snippet?.title || "Untitled",
					description: item.snippet?.description || "",
					thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
					publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
				}));
				return json({ isDemo: false, results });
			} catch (err) {
				return json({ isDemo: true, error: String(err), results: [] }, 500);
			}
		}

		return json({ error: "Not found", endpoints: ["/", "/api/channel", "/api/videos", "/api/search"] }, 404);
	},
} satisfies ExportedHandler<Env>;
