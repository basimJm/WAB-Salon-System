import { DOC_NAMES } from '../src/constants/docs';
import { contractFingerprint, nextMinor } from '../src/docs/contract';
import { CONTRACT_VERSIONS } from '../src/docs/contractVersions';
import { buildOpenApiDocuments } from '../src/docs/index';

const SEMVER = /^\d+\.\d+\.\d+$/;

describe('contract snapshot guard (SRV-111)', () => {
  const documents = buildOpenApiDocuments();

  it.each(DOC_NAMES)(
    '%s: the generated contract matches its recorded fingerprint (else run contract:bump with the client impact)',
    (name) => {
      const recorded = CONTRACT_VERSIONS[name];
      // On failure: `npm run contract:bump -- <name> "<client tasks to re-sync>"`, then `npm run docs`.
      expect({ name, sha256: contractFingerprint(documents[name]) }).toEqual({
        name,
        sha256: recorded.sha256,
      });
    },
  );

  it.each(DOC_NAMES)('%s: publishes its version and a client-impact note', (name) => {
    const recorded = CONTRACT_VERSIONS[name];
    expect(recorded.version).toMatch(SEMVER);
    expect(recorded.note.trim().length).toBeGreaterThan(0);
    expect((documents[name] as { info: { version: string } }).info.version).toBe(recorded.version);
  });

  it('the fingerprint ignores the version and sees any other change', () => {
    const doc = { openapi: '3.1.0', info: { title: 'x', version: '1.0.0' }, paths: {} };
    const sameButVersion = { ...doc, info: { ...doc.info, version: '9.9.9' } };
    const changed = { ...doc, paths: { '/a': {} } };
    expect(contractFingerprint(sameButVersion)).toBe(contractFingerprint(doc));
    expect(contractFingerprint(changed)).not.toBe(contractFingerprint(doc));
    expect(nextMinor('1.4.2')).toBe('1.5.0');
  });
});
