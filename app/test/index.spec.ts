import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("YouTube API Worker", () => {
	it("health endpoint returns healthy status (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as { status: string; worker: string };
		expect(body.status).toBe("healthy");
		expect(body.worker).toBe("yt-studio-app");
	});

	it("health endpoint returns healthy status (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/");
		expect(response.status).toBe(200);
		const body = await response.json() as { status: string };
		expect(body.status).toBe("healthy");
	});

	it("health endpoint returns expected endpoints list", async () => {
		const request = new IncomingRequest("http://example.com/health");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		const body = await response.json() as { endpoints: Record<string, string> };
		expect(body.endpoints).toHaveProperty("videos");
		expect(body.endpoints).toHaveProperty("channel");
	});

	it("OPTIONS returns 204 with CORS headers", async () => {
		const request = new IncomingRequest("http://example.com/", { method: "OPTIONS" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});

	it("/api/videos returns demo videos when no API key is set", async () => {
		const request = new IncomingRequest("http://example.com/api/videos");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as { isDemo: boolean; videos: unknown[] };
		expect(body.isDemo).toBe(true);
		expect(Array.isArray(body.videos)).toBe(true);
		expect(body.videos.length).toBeGreaterThan(0);
	});

	it("/api/channel returns demo channel when no API key is set", async () => {
		const request = new IncomingRequest("http://example.com/api/channel");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as { isDemo: boolean; channel: { id: string } };
		expect(body.isDemo).toBe(true);
		expect(body.channel.id).toBe("UCrjJP_SHUeCmqpTSHJCXkdA");
	});

	it("/api/search returns 400 without q param", async () => {
		const request = new IncomingRequest("http://example.com/api/search");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(400);
	});

	it("/api/search returns demo results when no API key is set", async () => {
		const request = new IncomingRequest("http://example.com/api/search?q=history");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as { isDemo: boolean; results: unknown[] };
		expect(body.isDemo).toBe(true);
	});

	it("unknown path returns 404", async () => {
		const request = new IncomingRequest("http://example.com/nonexistent");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});
});
