/**
 * YouTube API V3 Proxy Worker - Cloudflare Worker
 * Fetches data from YouTube Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: /health, /api/channel, /api/videos, /api/search
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
	channel?: string;
}

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

const DEMO_VIDEOS: Video[] = [
	{
		id: "Zzcdtm7Il9U",
		title: "The hidden wall of Dhul-Qarnayn explained",
		description: "Deep dive into the archeological and scriptural evidence of the wall.",
		thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg",
		publishedAt: "2024-01-15T10:00:00Z",
		channel: "Ruh Al Tarikh",
	},
	{
		id: "dQw4w9WgXcQ",
		title: "Islamic History: The Umayyad Dynasty",
		description: "Tracing the rise and fall of the first major Islamic caliphate.",
		thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		publishedAt: "2024-01-10T00:00:00Z",
		channel: "Ruh Al Tarikh",
	},
	{
		id: "jNQXAC9IVRw",
		title: "Prophecy and End Times in Islamic Tradition",
		description: "Examine the prophetic narratives of the Quran and their interpretations.",
		thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
		publishedAt: "2024-01-08T00:00:00Z",
		channel: "Ruh Al Tarikh",
	},
];

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

		if (path === "/" || path === "/health") {
			return respondJSON({
				status: "healthy",
				worker: "ytstudio-proxy",
				timestamp: new Date().toISOString(),
				channel: channelId,
				environment: env.ENVIRONMENT || "development",
				hasApiKey: !!apiKey,
				endpoints: ["/health", "/api/channel", "/api/videos", "/api/search"],
			});
		}

		if (path === "/api/channel") {
			if (!apiKey) {
				return respondJSON({
					isDemo: true,
					status: "no_api_key",
					channel: { id: channelId, title: "Ruh Al Tarikh", url: `https://www.youtube.com/channel/${channelId}` },
				});
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = (await res.json()) as { items?: { id: string; snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } } }; statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string } }[]; error?: { message: string } };
				if (data.error) throw new Error(data.error.message);
				if (!data.items?.length) throw new Error("Channel not found");
				const ch = data.items[0];
				return respondJSON({
					isDemo: false,
					channel: {
						id: ch.id,
						title: ch.snippet?.title,
						description: ch.snippet?.description,
						thumbnail: ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url,
						subscribers: ch.statistics?.subscriberCount ?? "Hidden",
						views: ch.statistics?.viewCount ?? "0",
						videos: parseInt(ch.statistics?.videoCount ?? "0", 10),
						url: `https://www.youtube.com/channel/${ch.id}`,
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
				return respondJSON({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
			try {
				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = (await chRes.json()) as { items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[]; error?: { message: string } };
				if (chData.error) throw new Error(chData.error.message);
				const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
				if (!uploadsId) throw new Error("Uploads playlist not found");

				const ptParam = pageToken ? `&pageToken=${pageToken}` : "";
				const plRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`
				);
				const plData = (await plRes.json()) as { items?: { contentDetails: { videoId: string }; snippet: { title: string; description: string; publishedAt: string; thumbnails: { high?: { url: string }; default?: { url: string } }; channelTitle: string } }[]; nextPageToken?: string; pageInfo?: { totalResults: number }; error?: { message: string } };
				if (plData.error) throw new Error(plData.error.message);

				const videos: Video[] = (plData.items ?? []).map((item) => ({
					id: item.contentDetails?.videoId,
					title: item.snippet?.title ?? "Untitled",
					description: item.snippet?.description ?? "",
					thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? "",
					publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
					channel: item.snippet?.channelTitle,
				}));

				return respondJSON({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken ?? null,
					totalResults: plData.pageInfo?.totalResults ?? videos.length,
				});
			} catch (err) {
				return respondJSON({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) });
			}
		}

		if (path === "/api/search") {
			const query = url.searchParams.get("q");
			if (!query) return respondJSON({ error: "Query parameter q is required", results: [] }, 400);
			if (!apiKey) return respondJSON({ isDemo: true, results: [], error: "No API key configured" });
			try {
				const searchRes = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
				);
				const searchData = (await searchRes.json()) as { items?: { id: { videoId: string }; snippet: { title: string; description: string; publishedAt: string; thumbnails: { high?: { url: string }; default?: { url: string } } } }[]; error?: { message: string } };
				if (searchData.error) throw new Error(searchData.error.message);
				const results = (searchData.items ?? []).map((item) => ({
					id: item.id?.videoId,
					title: item.snippet?.title ?? "Untitled",
					description: item.snippet?.description ?? "",
					thumbnail: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? "",
					publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
				}));
				return respondJSON({ isDemo: false, results });
			} catch (err) {
				return respondJSON({ isDemo: true, results: [], error: String(err) }, 500);
			}
		}

		return respondJSON({ error: "Not found", endpoints: ["/health", "/api/channel", "/api/videos", "/api/search"] }, 404);
	},
} satisfies ExportedHandler<Env>;
