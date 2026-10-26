import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("YouTube API Worker (yt-studio-app)", () => {
	it("responds with health status at root (unit style)", async () => {
		const request = new IncomingRequest("http://example.com");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = await response.json() as Record<string, unknown>;
		expect(data.status).toBe("ok");
		expect(data.worker).toBe("yt-studio-app");
	});

	it("responds with health status at root (integration style)", async () => {
		const response = await SELF.fetch("https://example.com");
		expect(response.status).toBe(200);
		const data = await response.json() as Record<string, unknown>;
		expect(data.status).toBe("ok");
		expect(data.worker).toBe("yt-studio-app");
	});

	it("returns 404 for unknown routes", async () => {
		const request = new IncomingRequest("http://example.com/unknown");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it("returns demo videos when no API key is set", async () => {
		const request = new IncomingRequest("http://example.com/api/videos");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = await response.json() as Record<string, unknown>;
		expect(data.isDemo).toBe(true);
		expect(Array.isArray(data.videos)).toBe(true);
	});
});
