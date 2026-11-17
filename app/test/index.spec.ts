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
	it("responds with health status (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/health");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = await response.json() as { status: string; worker: string };
		expect(data.status).toBe("healthy");
		expect(data.worker).toBe("ytstudio-app");
	});

	it("responds with demo videos when no API key (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/api/videos");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = await response.json() as { isDemo: boolean; videos: unknown[] };
		expect(data.isDemo).toBe(true);
		expect(Array.isArray(data.videos)).toBe(true);
	});

	it("responds with health status (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/health");
		expect(response.status).toBe(200);
		const data = await response.json() as { status: string };
		expect(data.status).toBe("healthy");
	});

	it("returns 404 for unknown routes", async () => {
		const response = await SELF.fetch("https://example.com/unknown-route");
		expect(response.status).toBe(404);
	});
});
