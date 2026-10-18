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
	category: string;
}

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

const DEMO_VIDEOS: Video[] = [
	{
		id: "Zzcdtm7Il9U",
		title: "The hidden wall of Dhul-Qarnayn explained",
		thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg",
		publishedAt: "2024-01-15T10:00:00Z",
		description: "Deep dive into the archeological and scriptural evidence of the wall.",
		category: "history",
	},
	{
		id: "dQw4w9WgXcQ",
		title: "Islamic History: The Umayyad Dynasty",
		thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		publishedAt: "2024-01-10T00:00:00Z",
		description: "Tracing the rise and fall of the first major Islamic caliphate.",
		category: "history",
	},
	{
		id: "jNQXAC9IVRw",
		title: "Prophecy and End Times in Islamic Tradition",
		thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
		publishedAt: "2024-01-08T00:00:00Z",
		description: "Examine the prophetic narratives of the Quran and their interpretations.",
		category: "prophecy",
	},
];

function detectCategory(title: string): string {
	const lower = title.toLowerCase();
	if (["quran", "surah", "ayah", "tafsir"].some((t) => lower.includes(t))) return "quran";
	if (["prophecy", "dajjal", "gog", "magog", "end times"].some((t) => lower.includes(t))) return "prophecy";
	if (["discussion", "podcast", "debate"].some((t) => lower.includes(t))) return "discussion";
	if (["guide", "explained", "documentary", "lesson"].some((t) => lower.includes(t))) return "educational";
	return "history";
}

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const apiKey = env.YOUTUBE_API_KEY ?? "";
		const channelId = env.CHANNEL_ID ?? DEFAULT_CHANNEL_ID;

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		if (path === "/" || path === "/health") {
			return json({
				status: "ok",
				worker: "youtube-api-worker",
				channel: channelId,
				hasApiKey: !!apiKey,
				environment: env.ENVIRONMENT ?? "production",
				endpoints: ["/health", "/api/channel", "/api/videos", "/api/search"],
				timestamp: new Date().toISOString(),
			});
		}

		if (path === "/api/channel") {
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
				const data = (await res.json()) as { items?: { id: string; snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } } }; statistics: { subscriberCount: string; viewCount: string; videoCount: string } }[] };
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
						videoCount: parseInt(ch.statistics.videoCount, 10),
						url: `https://www.youtube.com/channel/${ch.id}`,
					},
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), channel: { id: channelId } });
			}
		}

		if (path === "/api/videos") {
			const maxResults = url.searchParams.get("maxResults") ?? "12";
			const pageToken = url.searchParams.get("pageToken") ?? "";
			if (!apiKey) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
			try {
				const chRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const chData = (await chRes.json()) as { items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[] };
				if (!chData.items?.length) throw new Error("Channel not found");
				const playlistId = chData.items[0].contentDetails.relatedPlaylists.uploads;

				const ptParam = pageToken ? `&pageToken=${pageToken}` : "";
				const plRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`
				);
				const plData = (await plRes.json()) as {
					items?: { contentDetails: { videoId: string }; snippet: { title: string; description: string; publishedAt: string; thumbnails: { high?: { url: string }; default?: { url: string } } } }[];
					nextPageToken?: string;
					pageInfo?: { totalResults: number };
				};
				if (!plData.items) throw new Error("No videos found");

				const videos: Video[] = plData.items.map((item) => ({
					id: item.contentDetails.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? "",
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
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) });
			}
		}

		if (path === "/api/search") {
			const query = url.searchParams.get("q");
			if (!query) return json({ error: "Missing query parameter q" }, 400);
			if (!apiKey) {
				const results = DEMO_VIDEOS.filter((v) =>
					v.title.toLowerCase().includes(query.toLowerCase())
				);
				return json({ isDemo: true, results });
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
				);
				const data = (await res.json()) as {
					items?: { id: { videoId: string }; snippet: { title: string; description: string; publishedAt: string; thumbnails: { high?: { url: string }; default?: { url: string } } } }[];
				};
				const results = (data.items ?? []).map((item) => ({
					id: item.id.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? "",
					publishedAt: item.snippet.publishedAt,
				}));
				return json({ isDemo: false, results });
			} catch (err) {
				return json({ isDemo: true, results: [], error: String(err) }, 500);
			}
		}

		return json({ error: "Not found", endpoints: ["/health", "/api/channel", "/api/videos", "/api/search"] }, 404);
	},
} satisfies ExportedHandler<Env>;
