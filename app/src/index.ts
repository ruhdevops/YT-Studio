export interface Env {
	YOUTUBE_API_KEY?: string;
	CHANNEL_ID?: string;
}

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

const DEMO_VIDEOS = [
	{
		id: "Zzcdtm7Il9U",
		title: "The hidden wall of Dhul-Qarnayn explained",
		thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg",
		publishedAt: "2024-01-15T10:00:00Z",
	},
	{
		id: "dQw4w9WgXcQ",
		title: "Islamic History: The Umayyad Dynasty",
		thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		publishedAt: "2024-01-10T00:00:00Z",
	},
	{
		id: "jNQXAC9IVRw",
		title: "Prophecy and End Times in Islamic Tradition",
		thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
		publishedAt: "2024-01-08T00:00:00Z",
	},
];

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
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

		if (url.pathname === "/" || url.pathname === "/health") {
			return json({
				status: "healthy",
				worker: "ytstudio-app",
				channel: channelId,
				hasApiKey: !!apiKey,
				endpoints: ["/api/videos", "/api/channel"],
			});
		}

		if (url.pathname === "/api/videos") {
			if (!apiKey) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
			}
			try {
				const channelResp = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const channelData = await channelResp.json() as { items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }> };
				if (!channelData.items?.length) throw new Error("Channel not found");
				const uploadsId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

				const maxResults = url.searchParams.get("maxResults") || "12";
				const pageToken = url.searchParams.get("pageToken") || "";
				const playlistResp = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}&pageToken=${pageToken}&key=${apiKey}`
				);
				const playlistData = await playlistResp.json() as {
					items?: Array<{ contentDetails: { videoId: string }; snippet: { title: string; description: string; publishedAt: string; thumbnails: { high?: { url: string }; default?: { url: string } } } }>;
					nextPageToken?: string;
					pageInfo?: { totalResults: number };
				};
				if (!playlistData.items) throw new Error("No videos found");

				const videos = playlistData.items.map((item) => ({
					id: item.contentDetails.videoId,
					title: item.snippet.title,
					description: item.snippet.description,
					thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || "",
					publishedAt: item.snippet.publishedAt,
				}));

				return json({
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: playlistData.nextPageToken || null,
					totalResults: playlistData.pageInfo?.totalResults || videos.length,
				});
			} catch (err) {
				return json({ isDemo: true, videos: DEMO_VIDEOS, error: String(err) });
			}
		}

		if (url.pathname === "/api/channel") {
			if (!apiKey) {
				return json({ isDemo: true, channel: { id: channelId, title: "Ruh Al Tarikh" } });
			}
			try {
				const resp = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = await resp.json() as {
					items?: Array<{ id: string; snippet: { title: string; description: string; thumbnails: { high?: { url: string } } }; statistics: { subscriberCount: string; viewCount: string; videoCount: string } }>;
					error?: { message: string };
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
						thumbnail: ch.snippet.thumbnails.high?.url || "",
						subscribers: ch.statistics.subscriberCount,
						views: ch.statistics.viewCount,
						videos: ch.statistics.videoCount,
					},
				});
			} catch (err) {
				return json({ isDemo: true, error: String(err), channel: { id: channelId } });
			}
		}

		return json({ error: "Not found", endpoints: ["/", "/api/videos", "/api/channel"] }, 404);
	},
} satisfies ExportedHandler<Env>;
