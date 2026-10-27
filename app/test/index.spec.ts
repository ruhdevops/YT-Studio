import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("YT Studio Worker", () => {
	it("health endpoint returns status healthy (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as { status: string };
		expect(body.status).toBe("healthy");
	});

	it("health endpoint returns status healthy (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/health");
		expect(response.status).toBe(200);
		const body = await response.json() as { status: string; worker: string };
		expect(body.status).toBe("healthy");
		expect(body.worker).toBe("yt-studio-worker");
	});

	it("videos endpoint returns demo data when no API key (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/api/videos");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = await response.json() as { isDemo: boolean; videos: unknown[]; count: number };
		expect(body.isDemo).toBe(true);
		expect(Array.isArray(body.videos)).toBe(true);
		expect(body.count).toBeGreaterThan(0);
	});

	it("channel endpoint returns demo data when no API key (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/api/channel");
		expect(response.status).toBe(200);
		const body = await response.json() as { isDemo: boolean; channel: { id: string } };
		expect(body.isDemo).toBe(true);
		expect(body.channel.id).toBe("UCrjJP_SHUeCmqpTSHJCXkdA");
	});

	it("unknown route returns 404", async () => {
		const response = await SELF.fetch("https://example.com/api/unknown");
		expect(response.status).toBe(404);
	});

	it("search without query returns 400", async () => {
		const response = await SELF.fetch("https://example.com/api/search");
		expect(response.status).toBe(400);
	});
});
