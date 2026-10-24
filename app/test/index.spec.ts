import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("YouTube API v3 Worker", () => {
	it("responds with healthy status on / (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		const body = await response.json() as Record<string, unknown>;
		expect(response.status).toBe(200);
		expect(body.status).toBe("healthy");
		expect(body.worker).toBe("ytstudio-app");
	});

	it("returns demo videos when API key is absent (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/api/videos");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		const body = await response.json() as Record<string, unknown>;
		expect(response.status).toBe(200);
		expect(body.isDemo).toBe(true);
		expect(Array.isArray(body.videos)).toBe(true);
	});

	it("responds with healthy status on / (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/");
		const body = await response.json() as Record<string, unknown>;
		expect(response.status).toBe(200);
		expect(body.status).toBe("healthy");
	});

	it("returns 404 for unknown paths", async () => {
		const response = await SELF.fetch("https://example.com/unknown");
		expect(response.status).toBe(404);
	});
});
