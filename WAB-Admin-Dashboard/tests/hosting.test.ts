import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  buildCsp,
  connectSources,
  headerRules,
  hostingFiles,
  httpsOrigin,
  netlifyHeaders,
  NETLIFY_REDIRECTS,
  originsFromEnv,
  securityHeaders,
  vercelConfig,
} from '../scripts/lib/hosting.ts';

const origins = {
  api: 'https://api.wab.example/v1',
  socket: 'https://api.wab.example',
  extraConnect: ['https://files.wab.example'],
};

describe('httpsOrigin', () => {
  it('keeps only the origin and refuses anything but https', () => {
    expect(httpsOrigin('https://api.wab.example/v1/x?y=1')).toBe('https://api.wab.example');
    expect(() => httpsOrigin('http://api.wab.example')).toThrow();
    expect(() => httpsOrigin('not a url')).toThrow();
  });
});

describe('content security policy', () => {
  it('lets the page connect to itself, the API, the socket (https and wss) and the extras', () => {
    expect(connectSources(origins)).toEqual([
      "'self'",
      'https://api.wab.example',
      'https://files.wab.example',
      'wss://api.wab.example',
    ]);
  });

  it('allows only itself for a mock-only build', () => {
    expect(connectSources({ api: '', socket: '', extraConnect: [] })).toEqual(["'self'"]);
  });

  it('forbids framing, plugins, other scripts and other bases', () => {
    const csp = buildCsp(origins);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("font-src 'self' data:");
    expect(csp).toContain("form-action 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe/);
  });

  it('refuses a non-https origin', () => {
    expect(() => buildCsp({ ...origins, api: 'http://api.wab.example' })).toThrow();
  });
});

describe('header list', () => {
  const names = securityHeaders(origins).map(([k]) => k);

  it('carries the security headers of the spec', () => {
    expect(names).toEqual([
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
    ]);
    const value = (name: string) => securityHeaders(origins).find(([k]) => k === name)?.[1];
    expect(value('X-Content-Type-Options')).toBe('nosniff');
    expect(value('X-Frame-Options')).toBe('DENY');
    expect(value('Strict-Transport-Security')).toMatch(/^max-age=\d+; includeSubDomains$/);
  });

  it('caches hashed assets for good and never the page', () => {
    const rules = headerRules(origins);
    expect(rules.find((r) => r.path === '/assets/*')?.headers[0]?.[1]).toContain('immutable');
    expect(rules.find((r) => r.path === '/index.html')?.headers[0]?.[1]).toBe('no-cache');
  });
});

describe('host files', () => {
  it('writes Netlify _headers and the single-page redirect', () => {
    const files = hostingFiles('netlify', origins);
    expect(Object.keys(files)).toEqual(['_headers', '_redirects']);
    expect(files['_redirects']).toBe(NETLIFY_REDIRECTS);
    expect(netlifyHeaders(origins)).toMatch(/^\/\*\n {2}Content-Security-Policy: /);
    expect(netlifyHeaders(origins)).toContain('\n\n/assets/*\n');
  });

  it('writes a Vercel config with the same headers and a rewrite to the page', () => {
    const json = JSON.parse(hostingFiles('vercel', origins)['vercel.json'] ?? '') as {
      rewrites: { source: string; destination: string }[];
      headers: { source: string; headers: { key: string }[] }[];
    };
    expect(json.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }]);
    expect(json.headers[0]?.source).toBe('/(.*)');
    expect(json.headers[0]?.headers.map((h) => h.key)).toEqual(
      securityHeaders(origins).map(([k]) => k),
    );
    expect(vercelConfig(origins).endsWith('\n')).toBe(true);
  });
});

describe('originsFromEnv', () => {
  it('requires both origins for a prod build and splits the extras', () => {
    expect(() => originsFromEnv({}, true)).toThrow(/required/);
    expect(() => originsFromEnv({ VITE_API_BASE_URL: 'https://a.example' }, true)).toThrow();
    expect(
      originsFromEnv(
        {
          VITE_API_BASE_URL: 'https://a.example',
          VITE_SOCKET_URL: 'https://a.example',
          CSP_CONNECT_EXTRA: ' https://f.example , ',
        },
        true,
      ),
    ).toEqual({
      api: 'https://a.example',
      socket: 'https://a.example',
      extraConnect: ['https://f.example'],
    });
  });

  it('allows nothing for a dev build', () => {
    expect(originsFromEnv({}, false)).toEqual({ api: '', socket: '', extraConnect: [] });
  });
});

describe('write-hosting script', () => {
  const run = (args: string[], env: Record<string, string>) => {
    const out = mkdtempSync(join(tmpdir(), 'wab-hosting-'));
    const result = spawnSync(
      process.execPath,
      ['scripts/write-hosting.ts', ...args, '--out', out],
      {
        env: { ...process.env, ...env },
        encoding: 'utf8',
      },
    );
    return { out, result };
  };

  it('writes the files for a prod variant', () => {
    const { out, result } = run(['prod-release'], {
      VITE_API_BASE_URL: 'https://api.wab.example',
      VITE_SOCKET_URL: 'https://api.wab.example',
    });
    expect(result.status).toBe(0);
    expect(readFileSync(join(out, '_headers'), 'utf8')).toContain('connect-src');
    expect(readFileSync(join(out, '_redirects'), 'utf8')).toBe(NETLIFY_REDIRECTS);
    rmSync(out, { recursive: true });
  });

  it('fails for a prod variant without the origins', () => {
    const { out, result } = run(['prod-release'], { VITE_API_BASE_URL: '', VITE_SOCKET_URL: '' });
    expect(result.status).not.toBe(0);
    rmSync(out, { recursive: true, force: true });
  });
});
