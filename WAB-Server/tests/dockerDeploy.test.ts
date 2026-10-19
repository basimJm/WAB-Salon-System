import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const file = readFileSync(join(__dirname, '..', 'docker-compose.deploy.yml'), 'utf8');

interface Service {
  profiles?: string[];
  ports?: string[];
  env_file?: string[];
  build?: { context: string; dockerfile: string };
  restart?: string;
  environment?: Record<string, string>;
}
const compose = parse(file) as { services: Record<string, Service> };

describe('docker-compose.deploy.yml', () => {
  it('runs one API per environment and keeps Redis optional', () => {
    expect(Object.keys(compose.services).sort()).toEqual(['api', 'redis']);
    expect(compose.services['redis']?.profiles).toEqual(['redis']);
    expect(compose.services['api']?.profiles).toBeUndefined();
  });

  it('reads configuration only from a required environment file', () => {
    expect(compose.services['api']?.env_file).toEqual([
      '${ENV_FILE:?set ENV_FILE to the environment file}',
    ]);
  });

  it('builds from the repository root like the Dockerfile expects and restarts on failure', () => {
    expect(compose.services['api']?.build).toEqual({
      context: '..',
      dockerfile: 'WAB-Server/Dockerfile',
    });
    expect(compose.services['api']?.restart).toBe('unless-stopped');
  });

  it('publishes the API on localhost unless the host opts in', () => {
    expect(compose.services['api']?.ports).toEqual([
      '${API_BIND:-127.0.0.1}:${API_PORT:-3000}:3000',
    ]);
  });

  it('pins the container port so the published mapping always matches', () => {
    expect(compose.services['api']?.environment?.['PORT']).toBe('3000');
  });

  it('requires a Redis password and never writes a credential into the file', () => {
    expect(file).toContain('${REDIS_PASSWORD:?set REDIS_PASSWORD}');
    const withoutReferences = file.replace(/\$\{[^}]*\}/g, '').replace(/\$\$\w+/g, '');
    expect(withoutReferences).not.toMatch(/(password|secret|token)[ \t]*[:=][ \t]*[^\s"'{]/i);
  });
});
