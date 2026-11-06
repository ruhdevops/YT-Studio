/**
 * YT-Studio Cloudflare Worker — YouTube API v3 proxy
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 */

export interface Env {
	YOUTUBE_API_KEY?: string;
	CHANNEL_ID?: string;
	ENVIRONMENT?: string;
}

interface Video {
	id: string;
	title: string;
	thumbnail: string;
	publishedAt: string;
	description: string;
}

const CHANNEL_ID_DEFAULT = "UCrjJP_SHUeCmqpTSHJCXkdA";

const DEMO_VIDEOS: Video[] = [
	{
		id: "Zzcdtm7Il9U",
		title: "The hidden wall of Dhul-Qarnayn explained",
		thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg",
		publishedAt: "2024-01-15T10:00:00Z",
		description: "Deep dive into the archeological and scriptural evidence of the wall.",
	},
	{
		id: "dQw4w9WgXcQ",
		title: "Islamic History: The Umayyad Dynasty",
		thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		publishedAt: "2024-01-10T00:00:00Z",
		description: "Tracing the rise and fall of the first major Islamic caliphate.",
	},
	{
		id: "jNQXAC9IVRw",
		title: "Prophecy and End Times in Islamic Tradition",
		thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
		publishedAt: "2024-01-08T00:00:00Z",
		description: "Examine the prophetic narratives of the Quran and their interpretations.",
	},
];

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID ?? CHANNEL_ID_DEFAULT;
		const apiKey = env.YOUTUBE_API_KEY ?? "";

		const cors: HeadersInit = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: cors });
		}

		const json = (data: unknown, status = 200): Response =>
			new Response(JSON.stringify(data), {
				status,
				headers: { ...cors, "Content-Type": "application/json" },
			});

		const { pathname } = url;

		if (pathname === "/" || pathname === "/health") {
			return json({
				status: "healthy",
				worker: "ytstudio-proxy",
				environment: env.ENVIRONMENT ?? "development",
				channel: channelId,
				hasApiKey: !!apiKey,
				timestamp: new Date().toISOString(),
				endpoints: ["/health", "/api/channel", "/api/videos", "/api/search"],
			});
		}

		if (pathname === "/api/channel") {
			if (!apiKey) {
				return json({
					isDemo: true,
					channel: { id: channelId, title: "Ruh Al Tarikh (demo)" },
				});
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = (await res.json()) as Record<string, unknown>;
				const items = data.items as Array<Record<string, unknown>> | undefined;
				if (!items || items.length === 0) throw new Error("Channel not found");
				const ch = items[0] as Record<string, Record<string, unknown>>;
				const snippet = ch["snippet"] as Record<string, unknown>;
				const stats = ch["statistics"] as Record<string, unknown>;
				const thumbs = snippet["thumbnails"] as Record<string, Record<string, string>>;
				return json({
					isDemo: false,
					channel: {
						id: channelId,
						title: snippet["title"],
						description: snippet["description"],
						thumbnail: thumbs?.["high"]?.["url"] ?? thumbs?.["default"]?.["url"] ?? "",
						subscribers: stats?.["subscriberCount"] ?? "Hidden",
						views: stats?.["viewCount"] ?? "0",
						videos: parseInt(String(stats?.["videoCount"] ?? "0"), 10),
					},
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), channel: { id: channelId } });
			}
		}

		if (pathname === "/api/videos") {
			const maxResults = url.searchParams.get("maxResults") ?? "12";
			const pageToken = url.searchParams.get("pageToken") ?? "";

			if (!apiKey) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
			try {
				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = (await chRes.json()) as Record<string, unknown>;
				const chItems = chData.items as Array<Record<string, unknown>> | undefined;
				if (!chItems || !chItems[0]) throw new Error("Channel not found");
				const relatedPlaylists = (
					(chItems[0]["contentDetails"] as Record<string, unknown>)["relatedPlaylists"]
				) as Record<string, string>;
				const uploadsId = relatedPlaylists["uploads"];
				if (!uploadsId) throw new Error("Uploads playlist not found");

				const ptParam = pageToken ? `&pageToken=${pageToken}` : "";
				const plRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`
				);
				const plData = (await plRes.json()) as Record<string, unknown>;
				const plItems = plData.items as Array<Record<string, unknown>> | undefined;
				if (!plItems) throw new Error("No videos found");

				const videos: Video[] = plItems.map((item) => {
					const snippet = item["snippet"] as Record<string, unknown>;
					const cd = item["contentDetails"] as Record<string, string>;
					const thumbs = snippet["thumbnails"] as Record<string, Record<string, string>>;
					return {
						id: cd["videoId"] ?? "",
						title: String(snippet["title"] ?? "Untitled"),
						thumbnail: thumbs?.["high"]?.["url"] ?? thumbs?.["default"]?.["url"] ?? "",
						publishedAt: String(snippet["publishedAt"] ?? new Date().toISOString()),
						description: String(snippet["description"] ?? ""),
					};
				});

				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData["nextPageToken"] ?? null,
				});
			} catch (err) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) });
			}
		}

		if (pathname === "/api/search") {
			const q = url.searchParams.get("q");
			if (!q) return json({ error: "Missing query parameter ?q=", results: [] }, 400);
			if (!apiKey) return json({ isDemo: true, results: [] });
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`
				);
				const data = (await res.json()) as Record<string, unknown>;
				const items = data.items as Array<Record<string, unknown>> | undefined;
				const results = (items ?? []).map((item) => {
					const id = item["id"] as Record<string, string>;
					const snippet = item["snippet"] as Record<string, unknown>;
					const thumbs = snippet["thumbnails"] as Record<string, Record<string, string>>;
					return {
						id: id["videoId"] ?? "",
						title: String(snippet["title"] ?? ""),
						thumbnail: thumbs?.["high"]?.["url"] ?? thumbs?.["default"]?.["url"] ?? "",
						publishedAt: String(snippet["publishedAt"] ?? ""),
					};
				});
				return json({ isDemo: false, results });
			} catch (err) {
				return json({ isDemo: true, results: [], error: String(err) }, 500);
			}
		}

		return json(
			{ error: "Not found", endpoints: ["/health", "/api/channel", "/api/videos", "/api/search"] },
			404
		);
	},
} satisfies ExportedHandler<Env>;
