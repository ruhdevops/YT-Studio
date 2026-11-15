import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("YT-Studio worker", () => {
	it("health endpoint returns ok status (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		const body = await response.json() as { status: string };
		expect(body.status).toBe("ok");
		expect(response.status).toBe(200);
	});

	it("health endpoint returns ok status (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/");
		const body = await response.json() as { status: string };
		expect(body.status).toBe("ok");
	});

	it("returns demo videos when no API key configured", async () => {
		const request = new IncomingRequest("http://example.com/api/videos");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		const body = await response.json() as { isDemo: boolean; videos: unknown[] };
		expect(body.isDemo).toBe(true);
		expect(Array.isArray(body.videos)).toBe(true);
		expect(body.videos.length).toBeGreaterThan(0);
	});

	it("returns 400 for search without query", async () => {
		const request = new IncomingRequest("http://example.com/api/search");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
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

	it("handles CORS preflight", async () => {
		const request = new IncomingRequest("http://example.com/", { method: "OPTIONS" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(204);
	});
});
