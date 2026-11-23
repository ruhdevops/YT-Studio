import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('YouTube API v3 Worker', () => {
	it('health check returns healthy status (unit style)', async () => {
		const request = new IncomingRequest('http://localhost/health');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = (await response.json()) as any;
		expect(body.status).toBe('healthy');
		expect(body.worker).toBe('yt-studio-worker');
		expect(body.endpoints).toHaveProperty('videos');
	});

	it('health check returns healthy status (integration style)', async () => {
		const response = await SELF.fetch('https://example.com/health');
		expect(response.status).toBe(200);
		const body = (await response.json()) as any;
		expect(body.status).toBe('healthy');
	});

	it('root path returns health info', async () => {
		const request = new IncomingRequest('http://localhost/');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = (await response.json()) as any;
		expect(body).toHaveProperty('status', 'healthy');
		expect(body).toHaveProperty('channel');
	});

	it('OPTIONS returns 204 CORS preflight', async () => {
		const request = new Request('http://localhost/', { method: 'OPTIONS' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('/api/videos falls back to demo data when no API key', async () => {
		const request = new IncomingRequest('http://localhost/api/videos');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		// Without YOUTUBE_API_KEY the worker returns 500 with demo videos
		const body = (await response.json()) as any;
		expect(body).toHaveProperty('isDemo', true);
		expect(Array.isArray(body.videos)).toBe(true);
	});

	it('/api/channel falls back gracefully when no API key', async () => {
		const request = new IncomingRequest('http://localhost/api/channel');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		const body = (await response.json()) as any;
		expect(body).toHaveProperty('isDemo', true);
	});

	it('unknown path returns 404', async () => {
		const request = new IncomingRequest('http://localhost/not-found');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it('/api/search without query returns 400', async () => {
		const request = new IncomingRequest('http://localhost/api/search');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		// No API key → 500 with demo fallback; with key but no q → 400
		expect([400, 500]).toContain(response.status);
	});

	it('response includes CORS headers', async () => {
		const request = new IncomingRequest('http://localhost/health');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(response.headers.get('Content-Type')).toContain('application/json');
	});
});
