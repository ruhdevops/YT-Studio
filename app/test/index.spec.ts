import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("YouTube API proxy worker", () => {
	it("responds with healthy status on /health (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/health");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as { status: string; worker: string };
		expect(body.status).toBe("healthy");
		expect(body.worker).toBe("ytstudio-proxy");
	});

	it("responds with healthy status on / (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/");
		expect(response.status).toBe(200);
		const body = await response.json() as { status: string };
		expect(body.status).toBe("healthy");
	});

	it("returns 400 for /api/search without query param", async () => {
		const response = await SELF.fetch("https://example.com/api/search");
		expect(response.status).toBe(400);
	});

	it("returns demo videos on /api/videos without API key", async () => {
		const response = await SELF.fetch("https://example.com/api/videos");
		expect(response.status).toBe(200);
		const body = await response.json() as { isDemo: boolean; videos: unknown[] };
		expect(body.isDemo).toBe(true);
		expect(Array.isArray(body.videos)).toBe(true);
	});

	it("returns 404 for unknown routes", async () => {
		const response = await SELF.fetch("https://example.com/unknown");
		expect(response.status).toBe(404);
	});
});
