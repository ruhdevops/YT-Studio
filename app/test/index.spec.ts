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
		const request = new IncomingRequest("http://example.com/health");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as { status: string; worker: string };
		expect(body.status).toBe("healthy");
		expect(body.worker).toBe("ytstudio-api");
	});

	it("health endpoint returns healthy status (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/health");
		expect(response.status).toBe(200);
		const body = await response.json() as { status: string };
		expect(body.status).toBe("healthy");
	});

	it("returns demo videos when no API key is set", async () => {
		const response = await SELF.fetch("https://example.com/api/videos");
		expect(response.status).toBe(200);
		const body = await response.json() as { isDemo: boolean; videos: unknown[] };
		expect(body.isDemo).toBe(true);
		expect(Array.isArray(body.videos)).toBe(true);
		expect(body.videos.length).toBeGreaterThan(0);
	});

	it("returns 400 for search without query", async () => {
		const response = await SELF.fetch("https://example.com/api/search");
		expect(response.status).toBe(400);
	});

	it("returns 404 for unknown routes", async () => {
		const response = await SELF.fetch("https://example.com/unknown");
		expect(response.status).toBe(404);
	});

	it("handles CORS preflight", async () => {
		const response = await SELF.fetch("https://example.com/health", { method: "OPTIONS" });
		expect(response.status).toBe(204);
	});
});
