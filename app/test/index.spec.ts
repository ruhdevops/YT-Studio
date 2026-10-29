import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("YouTube API v3 worker", () => {
	it("health endpoint returns valid JSON (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/json");
		const body = await response.json() as Record<string, unknown>;
		expect(body.status).toBe("healthy");
		expect(body.worker).toBe("ytstudio");
		expect(body.channel).toBe("UCrjJP_SHUeCmqpTSHJCXkdA");
	});

	it("health endpoint returns valid JSON (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/");
		expect(response.status).toBe(200);
		const body = await response.json() as Record<string, unknown>;
		expect(body.status).toBe("healthy");
	});

	it("returns 404 for unknown paths", async () => {
		const response = await SELF.fetch("https://example.com/unknown-path");
		expect(response.status).toBe(404);
	});

	it("demo videos returned when no API key is set", async () => {
		const response = await SELF.fetch("https://example.com/api/videos");
		expect(response.status).toBe(200);
		const body = await response.json() as Record<string, unknown>;
		expect(body.isDemo).toBe(true);
		expect(Array.isArray(body.videos)).toBe(true);
	});

	it("handles OPTIONS preflight with CORS headers", async () => {
		const request = new IncomingRequest("https://example.com/api/videos", { method: "OPTIONS" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});
});
