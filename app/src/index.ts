/**
 * YT-Studio Cloudflare Worker
 * Fetches YouTube API v3 data for channel UCrjJP_SHUeCmqpTSHJCXkdA
 */

export interface Env {
	YOUTUBE_API_KEY?: string;
	CHANNEL_ID?: string;
	ENVIRONMENT?: string;
}

const DEMO_VIDEOS = [
	{
		id: "Zzcdtm7Il9U",
		videoId: "Zzcdtm7Il9U",
		title: "The hidden wall of Dhul-Qarnayn explained",
		description: "Deep dive into the archeological and scriptural evidence.",
		thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg",
		publishedAt: "2024-01-15T10:00:00Z",
	},
	{
		id: "dQw4w9WgXcQ",
		videoId: "dQw4w9WgXcQ",
		title: "Islamic History: The Umayyad Dynasty",
		description: "Tracing the rise and fall of the first major Islamic caliphate.",
		thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		publishedAt: "2024-01-10T00:00:00Z",
	},
	{
		id: "jNQXAC9IVRw",
		videoId: "jNQXAC9IVRw",
		title: "Prophecy and End Times in Islamic Tradition",
		description: "Examine prophetic narratives and their interpretations.",
		thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
		publishedAt: "2024-01-08T00:00:00Z",
	},
];

const DEFAULT_CHANNEL = "UCrjJP_SHUeCmqpTSHJCXkdA";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL;
		const apiKey = env.YOUTUBE_API_KEY || "";

		const cors = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: cors });
		}

		const json = (data: unknown, status = 200) =>
			new Response(JSON.stringify(data), {
				status,
				headers: { ...cors, "Content-Type": "application/json" },
			});

		const { pathname } = url;

		if (pathname === "/" || pathname === "/health") {
			return json({
				status: "ok",
				worker: "ytstudio-app",
				channel: channelId,
				hasApiKey: !!apiKey,
				environment: env.ENVIRONMENT || "development",
				endpoints: ["/api/videos", "/api/channel", "/api/search"],
				timestamp: new Date().toISOString(),
			});
		}

		if (pathname === "/api/videos") {
			const maxResults = url.searchParams.get("maxResults") || "12";
			if (!apiKey) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
			try {
				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = (await chRes.json()) as { items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[]; error?: { message: string } };
				if (chData.error) throw new Error(chData.error.message);
				const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
				if (!uploadsId) throw new Error("Uploads playlist not found");

				const plRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}&key=${apiKey}`
				);
				const plData = (await plRes.json()) as { items?: unknown[]; error?: { message: string }; nextPageToken?: string; pageInfo?: { totalResults: number } };
				if (plData.error) throw new Error(plData.error.message);

				const videos = ((plData.items || []) as Array<{ contentDetails?: { videoId?: string }; snippet?: { title?: string; description?: string; thumbnails?: { high?: { url: string }; default?: { url: string } }; publishedAt?: string } }>).map((item) => ({
					id: item.contentDetails?.videoId || "",
					videoId: item.contentDetails?.videoId || "",
					title: item.snippet?.title || "Untitled",
					description: item.snippet?.description || "",
					thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
					publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
				}));

				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken || null,
					totalResults: plData.pageInfo?.totalResults || videos.length,
				});
			} catch (err) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) });
			}
		}

		if (pathname === "/api/channel") {
			if (!apiKey) {
				return json({
					isDemo: true,
					channel: { id: channelId, title: "Ruh Al Tarikh", url: `https://www.youtube.com/channel/${channelId}` },
				});
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = (await res.json()) as { items?: { id?: string; snippet?: { title?: string; description?: string; thumbnails?: { high?: { url: string }; default?: { url: string } } }; statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string } }[]; error?: { message: string } };
				if (data.error) throw new Error(data.error.message);
				const ch = data.items?.[0];
				if (!ch) throw new Error("Channel not found");
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
				return json({
					isDemo: true,
					error: String(err),
					channel: { id: channelId, title: "Ruh Al Tarikh", url: `https://www.youtube.com/channel/${channelId}` },
				});
			}
		}

		if (pathname === "/api/search") {
			const q = url.searchParams.get("q");
			if (!q) return json({ error: "Query parameter required" }, 400);
			if (!apiKey) return json({ isDemo: true, results: [], error: "API key not configured" });
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`
				);
				const data = (await res.json()) as { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; description?: string; thumbnails?: { high?: { url: string }; default?: { url: string } }; publishedAt?: string } }>; error?: { message: string } };
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
				return json({ isDemo: true, results: [], error: String(err) }, 500);
			}
		}

		return json({ error: "Not found", endpoints: ["/", "/api/videos", "/api/channel", "/api/search"] }, 404);
	},
} satisfies ExportedHandler<Env>;
