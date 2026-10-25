import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DOC_NAMES, type DocName } from '../constants/docs';
import { contractFingerprint, nextMinor } from './contract';
import { CONTRACT_VERSIONS } from './contractVersions';
import { buildOpenApiDocuments } from './index';

/**
 * `npm run contract:bump -- <name> "<client impact>"`: after an API change, records the new
 * fingerprint, bumps the namespace's minor version and stores which client tasks must re-sync.
 * Then run `npm run docs` so `openapi.<name>.json` carries the new version.
 */
const main = (): void => {
  const [name, note] = process.argv.slice(2);
  if (!(DOC_NAMES as readonly string[]).includes(name ?? '') || note === undefined || note.trim() === '') {
    process.stderr.write(`usage: contract:bump <${DOC_NAMES.join('|')}> "<client impact>"\n`);
    process.exit(1);
  }
  const doc = name as DocName;
  const current = CONTRACT_VERSIONS[doc];
  const sha256 = contractFingerprint(buildOpenApiDocuments()[doc]);
  if (sha256 === current.sha256) {
    process.stdout.write(`${doc}: contract unchanged (${current.version})\n`);
    return;
  }
  const version = nextMinor(current.version);
  const file = resolve(__dirname, '..', '..', 'src', 'docs', 'contractVersions.ts');
  const source = readFileSync(file, 'utf8');
  const entry = new RegExp(`  ${doc}: \\{[^}]*\\},`);
  const escaped = note.trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const next = source.replace(
    entry,
    `  ${doc}: {\n    version: '${version}',\n    sha256: '${sha256}',\n    note: '${escaped}',\n  },`,
  );
  writeFileSync(file, next);
  process.stdout.write(`${doc}: ${current.version} -> ${version}; now run npm run docs\n`);
};

if (require.main === module) main();
