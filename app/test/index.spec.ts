import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('YouTube API v3 Worker', () => {
	it('health endpoint returns healthy status (unit style)', async () => {
		const request = new IncomingRequest('http://example.com/health');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const body = (await response.json()) as { status: string; worker: string };
		expect(body.status).toBe('healthy');
		expect(body.worker).toBe('yt-studio-app');
	});

	it('health endpoint returns healthy status (integration style)', async () => {
		const response = await SELF.fetch('https://example.com/health');
		expect(response.status).toBe(200);
		const body = (await response.json()) as {
			status: string;
			endpoints: { channel: string; videos: string };
		};
		expect(body.status).toBe('healthy');
		expect(body.endpoints).toHaveProperty('channel');
		expect(body.endpoints).toHaveProperty('videos');
	});

	it('root path returns health info', async () => {
		const response = await SELF.fetch('https://example.com/');
		expect(response.status).toBe(200);
		const body = (await response.json()) as { status: string };
		expect(body.status).toBe('healthy');
	});

	it('OPTIONS preflight returns 204', async () => {
		const request = new IncomingRequest('http://example.com/api/channel', { method: 'OPTIONS' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('unknown path returns 404', async () => {
		const response = await SELF.fetch('https://example.com/nonexistent');
		expect(response.status).toBe(404);
	});

	it('/api/videos returns demo data when no API key configured', async () => {
		const response = await SELF.fetch('https://example.com/api/videos');
		const body = (await response.json()) as { isDemo: boolean; videos: unknown[] };
		expect(body.isDemo).toBe(true);
		expect(Array.isArray(body.videos)).toBe(true);
		expect(body.videos.length).toBeGreaterThan(0);
	});

	it('/api/channel returns demo data when no API key configured', async () => {
		const response = await SELF.fetch('https://example.com/api/channel');
		const body = (await response.json()) as { isDemo: boolean };
		expect(body.isDemo).toBe(true);
	});

	it('/api/search without query returns 400', async () => {
		const response = await SELF.fetch('https://example.com/api/search');
		expect(response.status).toBe(400);
	});

	it('response includes CORS headers', async () => {
		const response = await SELF.fetch('https://example.com/health');
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});
});
