import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { routes } from './index';

describe.skip('Rate Limiting', () => {
  let app: any;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(routes, { prefix: '/api/v1' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should include rate limit headers in response', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('should return 429 when rate limit is exceeded', async () => {
    // Make multiple requests to exceed rate limit
    const requests = Array(101).fill(null).map(() =>
      app.inject({
        method: 'GET',
        url: '/api/v1/health'
      })
    );

    const responses = await Promise.all(requests);
    
    // Find the response that should be rate limited
    const rateLimitedResponse = responses.find(r => r.statusCode === 429);
    
    expect(rateLimitedResponse).toBeDefined();
    expect(rateLimitedResponse?.json()).toMatchObject({
      ok: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED'
      }
    });
  });

  it('should include retry information in rate limit error', async () => {
    // Make requests to trigger rate limiting
    const requests = Array(101).fill(null).map(() =>
      app.inject({
        method: 'GET',
        url: '/api/v1/health'
      })
    );

    const responses = await Promise.all(requests);
    const rateLimitedResponse = responses.find(r => r.statusCode === 429);
    
    expect(rateLimitedResponse?.json().error.message).toContain('retry in');
  });

  it('should include request ID in rate limit error', async () => {
    // Make requests to trigger rate limiting
    const requests = Array(101).fill(null).map(() =>
      app.inject({
        method: 'GET',
        url: '/api/v1/health'
      })
    );

    const responses = await Promise.all(requests);
    const rateLimitedResponse = responses.find(r => r.statusCode === 429);
    
    expect(rateLimitedResponse?.json().error.requestId).toBeDefined();
  });
});
