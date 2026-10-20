import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("YouTube API v3 Worker", () => {
	it("health endpoint returns healthy status", async () => {
		const request = new IncomingRequest("http://localhost/health");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = await response.json() as { status: string; worker: string };
		expect(data.status).toBe("healthy");
		expect(data.worker).toBe("yt-studio-worker");
	});

	it("videos endpoint returns demo videos when no API key", async () => {
		const request = new IncomingRequest("http://localhost/api/videos");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = await response.json() as { success: boolean; isDemo: boolean; videos: unknown[] };
		expect(data.success).toBe(true);
		expect(data.isDemo).toBe(true);
		expect(Array.isArray(data.videos)).toBe(true);
		expect(data.videos.length).toBeGreaterThan(0);
	});

	it("OPTIONS returns CORS headers", async () => {
		const request = new IncomingRequest("http://localhost/api/videos", { method: "OPTIONS" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});

	it("unknown route returns 404", async () => {
		const request = new IncomingRequest("http://localhost/unknown");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});
});
