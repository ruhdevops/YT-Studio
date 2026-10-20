/**
 * YouTube API v3 Worker - Cloudflare Worker
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 */

export interface Env {
	YOUTUBE_API_KEY?: string;
	CHANNEL_ID?: string;
	ENVIRONMENT?: string;
}

const DEMO_VIDEOS = [
	{
		id: "Zzcdtm7Il9U",
		title: "The hidden wall of Dhul-Qarnayn explained",
		thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg",
		publishedAt: "2024-01-15T10:00:00Z",
		channel: "Ruh Al Tarikh",
	},
	{
		id: "dQw4w9WgXcQ",
		title: "Islamic History: The Umayyad Dynasty",
		thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		publishedAt: "2024-01-10T14:30:00Z",
		channel: "Ruh Al Tarikh",
	},
	{
		id: "jNQXAC9IVRw",
		title: "Quran Tafsir: Surah Al-Fatiha",
		thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
		publishedAt: "2024-01-08T09:15:00Z",
		channel: "Ruh Al Tarikh",
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

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
		const apiKey = env.YOUTUBE_API_KEY || "";

		if (url.pathname === "/health" || url.pathname === "/") {
			return respondJSON({
				status: "healthy",
				worker: "yt-studio-worker",
				channel: channelId,
				environment: env.ENVIRONMENT || "development",
				hasApiKey: !!apiKey,
				endpoints: ["/health", "/api/videos", "/api/channel"],
			});
		}

		if (url.pathname === "/api/videos" || url.pathname === "/api/youtube/videos") {
			if (!apiKey) {
				return respondJSON({
					success: true,
					isDemo: true,
					videos: DEMO_VIDEOS,
					message: "Demo mode — set YOUTUBE_API_KEY binding for live data",
				});
			}
			try {
				const channelRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const channelData = (await channelRes.json()) as {
					items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[];
					error?: { message: string };
				};
				if (!channelRes.ok) throw new Error(channelData.error?.message || "Channel fetch failed");
				if (!channelData.items?.length) throw new Error("Channel not found");

				const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
				const maxResults = url.searchParams.get("maxResults") || "50";
				const pageToken = url.searchParams.get("pageToken") || "";
				const pageParam = pageToken ? `&pageToken=${pageToken}` : "";

				const playlistRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${uploadsPlaylistId}${pageParam}&key=${apiKey}`
				);
				const playlistData = (await playlistRes.json()) as {
					items?: {
						snippet: {
							resourceId: { videoId: string };
							title: string;
							thumbnails: { high?: { url: string }; default?: { url: string } };
							publishedAt: string;
							channelTitle: string;
							description: string;
						};
					}[];
					nextPageToken?: string;
					error?: { message: string };
				};
				if (!playlistRes.ok) throw new Error(playlistData.error?.message || "Playlist fetch failed");

				const videos = (playlistData.items || []).map((item) => ({
					id: item.snippet.resourceId.videoId,
					title: item.snippet.title,
					thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
					publishedAt: item.snippet.publishedAt,
					channel: item.snippet.channelTitle,
					description: item.snippet.description,
				}));

				return respondJSON({
					success: true,
					isDemo: false,
					videos,
					nextPageToken: playlistData.nextPageToken || null,
				});
			} catch (err) {
				return respondJSON({
					success: true,
					isDemo: true,
					videos: DEMO_VIDEOS,
					error: String(err),
				});
			}
		}

		if (url.pathname === "/api/channel" || url.pathname === "/api/youtube/channel") {
			const id = url.searchParams.get("id") || channelId;
			if (!apiKey) {
				return respondJSON({ success: false, error: "YOUTUBE_API_KEY binding required" }, 400);
			}
			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(id)}&key=${apiKey}`
				);
				const data = (await res.json()) as {
					items?: {
						snippet: {
							title: string;
							description: string;
							customUrl: string;
							thumbnails: { medium?: { url: string }; default?: { url: string } };
						};
						statistics: {
							subscriberCount: string;
							videoCount: string;
							viewCount: string;
						};
					}[];
					error?: { message: string };
				};
				if (!res.ok) throw new Error(data.error?.message || "YouTube API error");
				if (!data.items?.length) return respondJSON({ success: false, error: "Channel not found" }, 404);
				const ch = data.items[0];
				return respondJSON({
					success: true,
					data: {
						title: ch.snippet.title,
						description: ch.snippet.description,
						customUrl: ch.snippet.customUrl,
						avatar: ch.snippet.thumbnails.medium?.url || ch.snippet.thumbnails.default?.url,
						subscribers: ch.statistics.subscriberCount,
						videoCount: ch.statistics.videoCount,
						viewCount: ch.statistics.viewCount,
					},
				});
			} catch (err) {
				return respondJSON({ success: false, error: String(err) }, 500);
			}
		}

		return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
	},
} satisfies ExportedHandler<Env>;
