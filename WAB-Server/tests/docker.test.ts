import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const root = join(__dirname, '..');
const read = (file: string): string => readFileSync(join(root, file), 'utf8');

interface ComposeService {
  image?: string;
  ports?: string[];
  environment?: Record<string, string>;
  profiles?: string[];
  depends_on?: Record<string, { condition: string }>;
  healthcheck?: unknown;
  build?: unknown;
}
interface Compose {
  services: Record<string, ComposeService>;
  volumes: Record<string, unknown>;
}

const compose = parse(read('docker-compose.yml')) as Compose;

describe('docker-compose.yml', () => {
  it('defines the local infrastructure and the optional API', () => {
    expect(Object.keys(compose.services).sort()).toEqual([
      'api',
      'mailpit',
      'minio',
      'mongo',
      'redis',
    ]);
  });

  it('keeps the API behind the "app" profile so infrastructure can run alone', () => {
    expect(compose.services['api']?.profiles).toEqual(['app']);
    for (const name of ['mongo', 'redis', 'minio', 'mailpit']) {
      expect(compose.services[name]?.profiles).toBeUndefined();
    }
  });

  it('binds every published port to localhost only', () => {
    for (const service of Object.values(compose.services)) {
      for (const port of service.ports ?? []) expect(port.startsWith('127.0.0.1:')).toBe(true);
    }
  });

  it('never writes credentials into the file: secrets are required variables', () => {
    const env = compose.services['minio']?.environment ?? {};
    expect(env['MINIO_ROOT_USER']).toMatch(/^\$\{MINIO_ROOT_USER:\?/);
    expect(env['MINIO_ROOT_PASSWORD']).toMatch(/^\$\{MINIO_ROOT_PASSWORD:\?/);
    const withoutReferences = read('docker-compose.yml').replace(/\$\{[^}]*\}/g, '');
    expect(withoutReferences).not.toMatch(/(password|secret|token)[ \t]*[:=][ \t]*[^\s"'{]/i);
  });

  it('runs MongoDB as a replica set (transactions) and waits for health before the API starts', () => {
    expect(read('docker-compose.yml')).toContain('--replSet');
    const dependsOn = compose.services['api']?.depends_on ?? {};
    expect(dependsOn['mongo']?.condition).toBe('service_healthy');
    expect(dependsOn['redis']?.condition).toBe('service_healthy');
    expect(compose.services['mongo']?.healthcheck).toBeDefined();
    expect(compose.services['redis']?.healthcheck).toBeDefined();
  });

  it('points the API at the compose service names, not localhost', () => {
    const env = compose.services['api']?.environment ?? {};
    expect(env['MONGODB_URI']).toContain('mongo');
    expect(env['MONGODB_URI']).toContain('replicaSet=rs0');
    expect(env['REDIS_URL']).toContain('redis');
  });

  it('persists data in named volumes', () => {
    expect(Object.keys(compose.volumes).sort()).toEqual(['minio-data', 'mongo-data', 'redis-data']);
  });

  it('every variable used by the file is documented in docker/compose.env.example', () => {
    const used = new Set(
      [...read('docker-compose.yml').matchAll(/\$\{([A-Z_]+)[:}?-]/g)].map((m) => m[1] ?? ''),
    );
    const documented = new Set(
      read('docker/compose.env.example')
        .split('\n')
        .filter((line) => /^[A-Z_]+=/.test(line))
        .map((line) => line.split('=')[0] ?? ''),
    );
    expect([...used].sort()).toEqual([...documented].sort());
  });

  it('keeps compose values empty in the example file', () => {
    for (const line of read('docker/compose.env.example').split('\n')) {
      if (/^[A-Z_]+=/.test(line)) expect(line.endsWith('=')).toBe(true);
    }
  });
});

describe('Dockerfile', () => {
  const dockerfile = read('Dockerfile');

  it('uses a multi-stage Node 22 build', () => {
    expect(dockerfile.match(/^FROM node:22-alpine/gm)).toHaveLength(2);
    expect(dockerfile).toContain('AS build');
    expect(dockerfile).toContain('COPY --from=build /app/dist ./dist');
  });

  it('installs reproducibly and ships production dependencies only', () => {
    expect(dockerfile).toContain('RUN npm ci\n');
    expect(dockerfile).toContain('npm ci --omit=dev');
    expect(dockerfile).toContain('ENV NODE_ENV=production');
  });

  it('runs unprivileged, with a healthcheck on /health, and starts the compiled server', () => {
    expect(dockerfile).toMatch(/^USER node$/m);
    expect(dockerfile).toContain('HEALTHCHECK');
    expect(dockerfile).toContain('/health');
    expect(dockerfile).toContain('CMD ["node", "dist/server.js"]');
  });

  it('copies no environment files or secrets into the image', () => {
    expect(dockerfile).not.toMatch(/COPY[^\n]*\.env/);
    expect(dockerfile).not.toMatch(/(password|secret|token|api[_-]?key)\s*=/i);
  });
});

describe('.dockerignore', () => {
  const lines = read('.dockerignore').split('\n');

  it('keeps environment files, dependencies and VCS data out of the build context', () => {
    for (const entry of ['.env', '.env.*', 'node_modules', '.git', 'dist']) {
      expect(lines).toContain(entry);
    }
  });

  it('still allows .env.example', () => {
    expect(lines).toContain('!.env.example');
  });
});
