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
	it("responds with health check on / (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toContain("application/json");
		const data = await response.json() as { status: string; worker: string };
		expect(data.status).toBe("healthy");
		expect(data.worker).toBe("ytstudio");
	});

	it("responds with health check on /health (unit style)", async () => {
		const request = new IncomingRequest("http://example.com/health");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const data = await response.json() as { status: string };
		expect(data.status).toBe("healthy");
	});

	it("responds with health check (integration style)", async () => {
		const response = await SELF.fetch("https://example.com/");
		expect(response.status).toBe(200);
		const data = await response.json() as { status: string; worker: string };
		expect(data.status).toBe("healthy");
		expect(data.worker).toBe("ytstudio");
	});

	it("returns 404 for unknown routes", async () => {
		const request = new IncomingRequest("http://example.com/unknown-path");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it("handles CORS preflight OPTIONS request", async () => {
		const request = new IncomingRequest("http://example.com/", { method: "OPTIONS" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
	});

	it("returns demo videos when no API key is configured", async () => {
		const request = new IncomingRequest("http://example.com/api/videos");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBeDefined();
		const data = await response.json() as { isDemo?: boolean; error?: string };
		expect(data.isDemo).toBe(true);
	});
});
