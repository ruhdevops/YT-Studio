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
		const body = await response.json() as any;
		expect(body.status).toBe("healthy");
		expect(body.worker).toBe("ytstudio");
	});

	it("health endpoint returns healthy status (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/health");
		expect(response.status).toBe(200);
		const body = await response.json() as any;
		expect(body.status).toBe("healthy");
	});

	it("root path returns health info", async () => {
		const response = await SELF.fetch("https://example.com/");
		expect(response.status).toBe(200);
		const body = await response.json() as any;
		expect(body.status).toBe("healthy");
		expect(Array.isArray(body.endpoints)).toBe(true);
	});

	it("videos endpoint returns demo data when no API key", async () => {
		const response = await SELF.fetch("https://example.com/api/videos");
		expect(response.status).toBe(200);
		const body = await response.json() as any;
		expect(body.isDemo).toBe(true);
		expect(Array.isArray(body.videos)).toBe(true);
		expect(body.videos.length).toBeGreaterThan(0);
	});

	it("channel endpoint returns demo data when no API key", async () => {
		const response = await SELF.fetch("https://example.com/api/channel");
		expect(response.status).toBe(200);
		const body = await response.json() as any;
		expect(body.isDemo).toBe(true);
		expect(body.channel).toBeDefined();
	});

	it("search requires query parameter", async () => {
		const response = await SELF.fetch("https://example.com/api/search");
		expect(response.status).toBe(400);
		const body = await response.json() as any;
		expect(body.error).toContain("query");
	});

	it("search returns demo results when no API key", async () => {
		const response = await SELF.fetch("https://example.com/api/search?q=history");
		expect(response.status).toBe(200);
		const body = await response.json() as any;
		expect(body.isDemo).toBe(true);
		expect(Array.isArray(body.results)).toBe(true);
	});

	it("unknown route returns 404", async () => {
		const response = await SELF.fetch("https://example.com/unknown");
		expect(response.status).toBe(404);
	});

	it("OPTIONS request returns CORS headers", async () => {
		const request = new IncomingRequest("https://example.com/api/videos", { method: "OPTIONS" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});
});
