/**
 * YT-Studio Cloudflare Worker — YouTube Data API v3
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: GET /, /api/channel, /api/videos, /api/search
 */

export interface Env {
	YOUTUBE_API_KEY?: string;
	CHANNEL_ID?: string;
	ENVIRONMENT?: string;
}

interface Video {
	id: string;
	videoId: string;
	title: string;
	description: string;
	thumbnail: string;
	publishedAt: string;
	category: string;
}

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

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

const CORS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...CORS, "Content-Type": "application/json" },
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
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: CORS });
		}

		const url = new URL(request.url);
		const path = url.pathname;
		const apiKey = env.YOUTUBE_API_KEY ?? "";
		const channelId = env.CHANNEL_ID ?? DEFAULT_CHANNEL_ID;
		const hasKey = apiKey.length > 0;

		if (path === "/" || path === "/health") {
			return json({
				status: "healthy",
				worker: "ytstudio",
				timestamp: new Date().toISOString(),
				channel: channelId,
				environment: env.ENVIRONMENT ?? "development",
				hasYouTubeKey: hasKey,
				endpoints: ["/api/channel", "/api/videos", "/api/search"],
			});
		}

		if (path === "/api/channel") {
			if (!hasKey) {
				return json({
					isDemo: true,
					status: "no_api_key",
					channel: { id: channelId, url: `https://www.youtube.com/channel/${channelId}` },
				});
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`,
				);
				const data = (await res.json()) as {
					error?: { message: string };
					items?: Array<{
						id: string;
						snippet: {
							title: string;
							description: string;
							thumbnails: { high?: { url: string }; default?: { url: string } };
						};
						statistics: {
							subscriberCount: string;
							viewCount: string;
							videoCount: string;
						};
					}>;
				};
				if (data.error) throw new Error(data.error.message);
				if (!data.items?.length) throw new Error("Channel not found");
				const ch = data.items[0];
				return json({
					isDemo: false,
					channel: {
						id: ch.id,
						title: ch.snippet.title,
						description: ch.snippet.description,
						thumbnail: ch.snippet.thumbnails.high?.url ?? ch.snippet.thumbnails.default?.url ?? "",
						subscribers: ch.statistics.subscriberCount,
						views: ch.statistics.viewCount,
						videos: parseInt(ch.statistics.videoCount, 10),
						url: `https://www.youtube.com/channel/${ch.id}`,
					},
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err) }, 502);
			}
		}

		if (path === "/api/videos") {
			const maxResults = url.searchParams.get("maxResults") ?? "12";
			const pageToken = url.searchParams.get("pageToken") ?? "";

			if (!hasKey) {
				return json({
					isDemo: true,
					videos: DEMO_VIDEOS,
					count: DEMO_VIDEOS.length,
					nextPageToken: null,
				});
			}
			try {
				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`,
				);
				const chData = (await chRes.json()) as {
					error?: { message: string };
					items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }>;
				};
				if (chData.error) throw new Error(chData.error.message);
				if (!chData.items?.[0]) throw new Error("Channel not found");

				const uploadsId = chData.items[0].contentDetails.relatedPlaylists.uploads;
				const ptParam = pageToken ? `&pageToken=${pageToken}` : "";
				const plRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`,
				);
				const plData = (await plRes.json()) as {
					error?: { message: string };
					items?: Array<{
						contentDetails: { videoId: string };
						snippet: {
							title: string;
							description: string;
							publishedAt: string;
							thumbnails: { high?: { url: string }; default?: { url: string } };
						};
					}>;
					nextPageToken?: string;
					pageInfo?: { totalResults: number };
				};
				if (plData.error) throw new Error(plData.error.message);

				const videos: Video[] = (plData.items ?? []).map((item) => ({
					id: item.contentDetails.videoId,
					videoId: item.contentDetails.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail:
						item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? "",
					publishedAt: item.snippet.publishedAt,
					category: detectCategory(item.snippet.title),
				}));

				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: plData.nextPageToken ?? null,
					totalResults: plData.pageInfo?.totalResults ?? videos.length,
				});
			} catch (err) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) }, 502);
			}
		}

		if (path === "/api/search") {
			const q = url.searchParams.get("q");
			if (!q) return json({ error: "Missing query parameter ?q=", results: [] }, 400);
			if (!hasKey) return json({ isDemo: true, results: [], error: "API key not configured" });

			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`,
				);
				const data = (await res.json()) as {
					error?: { message: string };
					items?: Array<{
						id: { videoId: string };
						snippet: {
							title: string;
							description: string;
							publishedAt: string;
							thumbnails: { high?: { url: string }; default?: { url: string } };
						};
					}>;
				};
				if (data.error) throw new Error(data.error.message);

				const results = (data.items ?? []).map((item) => ({
					id: item.id.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? "",
					publishedAt: item.snippet.publishedAt,
				}));

				return json({ isDemo: false, results });
			} catch (err) {
				return json({ error: String(err), isDemo: true, results: [] }, 502);
			}
		}

		return json({ error: "Not found", endpoints: ["/", "/api/channel", "/api/videos", "/api/search"] }, 404);
	},
} satisfies ExportedHandler<Env>;
