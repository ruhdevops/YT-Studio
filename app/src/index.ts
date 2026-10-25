export interface Env {
	YOUTUBE_API_KEY?: string;
	ENVIRONMENT?: string;
	CHANNEL_ID?: string;
}

interface Video {
	id: string;
	title: string;
	thumbnail: string;
	publishedAt: string;
	channel: string;
	description?: string;
}

const DEMO_VIDEOS: Video[] = [
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
	{
		id: "B-K08v-qCmo",
		title: "The Rise of the Abbasid Caliphate",
		thumbnail: "https://i.ytimg.com/vi/B-K08v-qCmo/hqdefault.jpg",
		publishedAt: "2024-01-05T12:00:00Z",
		channel: "Ruh Al Tarikh",
	},
	{
		id: "qMTCWHz7e8Q",
		title: "Prophecies of the End Times: An In-depth Study",
		thumbnail: "https://i.ytimg.com/vi/qMTCWHz7e8Q/hqdefault.jpg",
		publishedAt: "2023-12-28T16:45:00Z",
		channel: "Ruh Al Tarikh",
	},
];

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		const respondJSON = (data: unknown, status = 200) => {
			return new Response(JSON.stringify(data), {
				status,
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
					"Cache-Control": "public, max-age=600",
				},
			});
		};

		const apiKey = env.YOUTUBE_API_KEY || "";
		const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;

		if (url.pathname === "/" || url.pathname === "/health") {
			return respondJSON({
				status: "healthy",
				worker: "yt-api-worker",
				timestamp: new Date().toISOString(),
				channel: channelId,
				environment: env.ENVIRONMENT || "development",
				endpoints: {
					health: "/health",
					videos: "/api/videos",
					channel: "/api/channel",
					search: "/api/search",
				},
			});
		}

		if (url.pathname === "/api/videos") {
			const maxResults = url.searchParams.get("maxResults") || "12";
			const pageToken = url.searchParams.get("pageToken") || "";

			if (!apiKey) {
				return respondJSON({
					success: true,
					isDemo: true,
					videos: DEMO_VIDEOS,
					count: DEMO_VIDEOS.length,
				});
			}

			try {
				const channelRes = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
				);
				const channelData = (await channelRes.json()) as {
					items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }>;
					error?: { message: string };
				};

				if (channelData.error) throw new Error(channelData.error.message);
				if (!channelData.items?.[0]) throw new Error("Channel not found");

				const uploadsPlaylistId =
					channelData.items[0].contentDetails.relatedPlaylists.uploads;

				const pageTokenParam = pageToken ? `&pageToken=${pageToken}` : "";
				const playlistRes = await fetch(
					`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}${pageTokenParam}&key=${apiKey}`
				);
				const playlistData = (await playlistRes.json()) as {
					items?: Array<{
						snippet: {
							title: string;
							publishedAt: string;
							channelTitle: string;
							description: string;
							thumbnails: { high?: { url: string }; default?: { url: string } };
						};
						contentDetails: { videoId: string };
					}>;
					nextPageToken?: string;
					pageInfo?: { totalResults: number };
					error?: { message: string };
				};

				if (playlistData.error) throw new Error(playlistData.error.message);
				if (!playlistData.items) throw new Error("No videos found");

				const videos: Video[] = (playlistData.items || []).map((item) => ({
					id: item.contentDetails?.videoId || "",
					title: item.snippet?.title || "Untitled",
					thumbnail:
						item.snippet?.thumbnails?.high?.url ||
						item.snippet?.thumbnails?.default?.url ||
						"",
					publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
					channel: item.snippet?.channelTitle || "Ruh Al Tarikh",
					description: item.snippet?.description || "",
				}));

				return respondJSON({
					success: true,
					isDemo: false,
					videos,
					count: videos.length,
					nextPageToken: playlistData.nextPageToken || null,
					totalResults: playlistData.pageInfo?.totalResults || videos.length,
				});
			} catch (err) {
				return respondJSON({
					success: true,
					isDemo: true,
					videos: DEMO_VIDEOS,
					count: DEMO_VIDEOS.length,
					error: String(err),
				});
			}
		}

		if (url.pathname === "/api/channel") {
			if (!apiKey) {
				return respondJSON({
					success: false,
					error: "YOUTUBE_API_KEY not configured",
					isDemo: true,
					channel: { id: channelId, title: "Ruh Al Tarikh" },
				});
			}

			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
				);
				const data = (await res.json()) as {
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
					error?: { message: string };
				};

				if (data.error) throw new Error(data.error.message);
				if (!data.items?.[0]) throw new Error("Channel not found");

				const ch = data.items[0];
				return respondJSON({
					success: true,
					isDemo: false,
					channel: {
						id: ch.id || channelId,
						title: ch.snippet?.title || "Ruh Al Tarikh",
						description: ch.snippet?.description || "",
						thumbnail:
							ch.snippet?.thumbnails?.high?.url ||
							ch.snippet?.thumbnails?.default?.url ||
							"",
						subscribers: ch.statistics?.subscriberCount || "Hidden",
						views: ch.statistics?.viewCount || "0",
						videos: parseInt(ch.statistics?.videoCount || "0", 10),
						url: `https://www.youtube.com/channel/${ch.id || channelId}`,
					},
				});
			} catch (err) {
				return respondJSON({
					success: false,
					isDemo: true,
					error: String(err),
					channel: { id: channelId, title: "Ruh Al Tarikh" },
				});
			}
		}

		if (url.pathname === "/api/search") {
			const query = url.searchParams.get("q");
			if (!query) {
				return respondJSON({ success: false, error: "Missing query parameter q" }, 400);
			}
			if (!apiKey) {
				return respondJSON({ success: false, error: "YOUTUBE_API_KEY not configured" }, 503);
			}

			try {
				const res = await fetch(
					`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
				);
				const data = (await res.json()) as {
					items?: Array<{
						id: { videoId: string };
						snippet: {
							title: string;
							description: string;
							publishedAt: string;
							thumbnails: { high?: { url: string }; default?: { url: string } };
						};
					}>;
					error?: { message: string };
				};

				if (data.error) throw new Error(data.error.message);

				const results = (data.items || []).map((item) => ({
					id: item.id?.videoId || "",
					title: item.snippet?.title || "Untitled",
					description: item.snippet?.description || "",
					thumbnail:
						item.snippet?.thumbnails?.high?.url ||
						item.snippet?.thumbnails?.default?.url ||
						"",
					publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
				}));

				return respondJSON({ success: true, isDemo: false, results });
			} catch (err) {
				return respondJSON({ success: false, error: String(err), isDemo: true, results: [] }, 500);
			}
		}

		return respondJSON(
			{
				success: false,
				error: "Not Found",
				endpoints: ["/health", "/api/videos", "/api/channel", "/api/search"],
			},
			404
		);
	},
} satisfies ExportedHandler<Env>;
