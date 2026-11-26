import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("YouTube API v3 proxy worker", () => {
	it("health endpoint returns healthy status (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as Record<string, unknown>;
		expect(body.status).toBe("healthy");
		expect(body.worker).toBe("ytstudio-proxy");
	});

	it("health endpoint responds via SELF (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/health");
		expect(response.status).toBe(200);
		const body = await response.json() as Record<string, unknown>;
		expect(body.status).toBe("healthy");
	});

	it("returns 503 when YOUTUBE_API_KEY is not set for /api/channel", async () => {
		const request = new IncomingRequest("http://example.com/api/channel");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(503);
	});

	it("returns 400 for /api/search without query param", async () => {
		const testEnv = { ...env, YOUTUBE_API_KEY: "test-key" };
		const request = new IncomingRequest("http://example.com/api/search");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, testEnv, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(400);
	});

	it("returns 404 for unknown routes", async () => {
		const request = new IncomingRequest("http://example.com/unknown");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it("handles CORS preflight OPTIONS request", async () => {
		const request = new IncomingRequest("http://example.com/api/channel", { method: "OPTIONS" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});
});
