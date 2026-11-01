import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("YT-Studio YouTube API v3 Worker", () => {
	it("responds with healthy status at root (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as { status: string; worker: string };
		expect(body.status).toBe("healthy");
		expect(body.worker).toBe("ytstudio");
	});

	it("responds with healthy status at /health (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/health");
		expect(response.status).toBe(200);
		const body = await response.json() as { status: string };
		expect(body.status).toBe("healthy");
	});

	it("returns demo videos at /api/videos when no API key is set", async () => {
		const request = new IncomingRequest("http://example.com/api/videos");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as { isDemo: boolean; videos: unknown[] };
		expect(body.isDemo).toBe(true);
		expect(Array.isArray(body.videos)).toBe(true);
	});

	it("returns demo channel info at /api/channel when no API key is set", async () => {
		const request = new IncomingRequest("http://example.com/api/channel");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as { isDemo: boolean };
		expect(body.isDemo).toBe(true);
	});

	it("returns 400 at /api/search without query param", async () => {
		const request = new IncomingRequest("http://example.com/api/search");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(400);
	});

	it("returns demo search results at /api/search with query", async () => {
		const request = new IncomingRequest("http://example.com/api/search?q=history");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as { isDemo: boolean; results: unknown[] };
		expect(body.isDemo).toBe(true);
		expect(Array.isArray(body.results)).toBe(true);
	});

	it("returns 404 for unknown paths", async () => {
		const request = new IncomingRequest("http://example.com/unknown");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it("handles OPTIONS preflight with 204", async () => {
		const request = new IncomingRequest("http://example.com/api/videos", { method: "OPTIONS" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(204);
	});
});
