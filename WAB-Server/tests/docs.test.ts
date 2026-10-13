import express, { Router } from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app';
import { DOC_NAMES, DOCS_ROUTE, MAX_EXAMPLE_DEPTH } from '../src/constants/docs';
import { buildOpenApiDocuments } from '../src/docs';
import { generateDocFiles } from '../src/docs/generate';
import { buildPostmanCollection, exampleFromSchema } from '../src/docs/postman';
import { createRootRouter } from '../src/routes';
import { mount } from '../src/routes/mount';
import { createLogger } from '../src/utils/logger';
import { diffRoutesAndDocs, walkRoutes } from './helpers/routeDocs';

const root = join(__dirname, '..');
const logger = createLogger({ level: 'silent' });
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

describe('generated Swagger and Postman files (WAB-Server/CLAUDE.md §11)', () => {
  const files = generateDocFiles();

  it('generates an OpenAPI file and a Postman collection per document, plus the environment', () => {
    const paths = Object.keys(files);
    for (const name of DOC_NAMES) {
      expect(paths).toContain(`docs/api/openapi.${name}.json`);
      expect(
        paths.some((p) =>
          p.includes(`WAB-${name.charAt(0).toUpperCase()}${name.slice(1)}.postman_collection`),
        ),
      ).toBe(true);
    }
    expect(paths).toContain('docs/api/postman/WAB.postman_environment.json');
  });

  it.each(Object.keys(files))('%s is committed and up to date (run `npm run docs`)', (path) => {
    const committed = readFileSync(join(root, path), 'utf8');
    expect(committed).toBe(files[path]);
  });

  it('is deterministic', () => {
    expect(generateDocFiles()).toEqual(files);
  });

  it('never contains tokens, hosts other than the local default, or secrets', () => {
    const all = Object.values(files).join('\n');
    expect(all).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
    expect(all).not.toMatch(/https?:\/\/(?!localhost|schema\.getpostman\.com)/);
  });
});

describe('route ↔ OpenAPI coverage', () => {
  const documented = (): Set<string> => {
    const set = new Set<string>();
    for (const document of Object.values(buildOpenApiDocuments())) {
      for (const [path, item] of Object.entries(document.paths ?? {})) {
        for (const method of HTTP_METHODS) if (method in item) set.add(`${method} ${path}`);
      }
    }
    return set;
  };

  it('documents every route and every documented path has a route', () => {
    const walk = walkRoutes(createRootRouter());
    expect(walk.unmounted).toBe(0);
    expect(walk.routes.size).toBeGreaterThan(0);
    expect(diffRoutesAndDocs(walk.routes, documented())).toEqual({
      undocumented: [],
      withoutRoute: [],
    });
  });

  it('detects a route that has no OpenAPI entry', () => {
    const router = Router();
    router.get('/customer/v1/salons/:id', (_req, res) => res.end());
    const found = walkRoutes(router);
    expect(diffRoutesAndDocs(found.routes, documented()).undocumented).toEqual([
      'get /customer/v1/salons/{id}',
    ]);
  });

  it('detects a documented path that has no route', () => {
    expect(diffRoutesAndDocs(new Set(), new Set(['get /ghost'])).withoutRoute).toEqual([
      'get /ghost',
    ]);
  });

  it('follows routers attached with mount() and flags bare router.use()', () => {
    const child = Router();
    child.get('/items/:id', (_req, res) => res.end());
    const parent = Router();
    mount(parent, '/v9', child);
    expect(walkRoutes(parent).routes).toEqual(new Set(['get /v9/items/{id}']));

    const sneaky = Router();
    const hidden = Router();
    hidden.get('/x', (_req, res) => res.end());
    sneaky.use('/hidden', hidden);
    expect(walkRoutes(sneaky).unmounted).toBe(1);
  });
});

describe('OpenAPI documents', () => {
  const documents = buildOpenApiDocuments();

  it('are OpenAPI 3.1 and describe health, readiness and gateway callbacks once, in common', () => {
    for (const name of DOC_NAMES) expect(documents[name].openapi).toBe('3.1.0');
    expect(Object.keys(documents.common.paths ?? {})).toEqual([
      '/health',
      '/ready',
      '/webhooks/payments',
    ]);
  });

  it('use the shared error envelope and error codes', () => {
    const schema = documents.common.components?.schemas?.['ErrorResponse'] as {
      properties: { error: { properties: { code: { enum: string[] } } } };
    };
    expect(schema.properties.error.properties.code.enum).toContain('SLOT_TAKEN');
    const ready: unknown = documents.common.paths?.['/ready']?.get?.responses?.['503'];
    expect(JSON.stringify(ready)).toContain('ErrorResponse');
  });

  it('require a bearer token in the client namespaces but not in common', () => {
    expect(documents.common.security).toBeUndefined();
    for (const name of ['customer', 'merchant', 'admin'] as const) {
      expect(documents[name].security).toEqual([{ bearerAuth: [] }]);
      expect(documents[name].components?.securitySchemes).toHaveProperty('bearerAuth');
    }
  });
});

describe('Postman generation', () => {
  const documents = buildOpenApiDocuments();

  it('puts health requests in a folder with variables, no token needed', () => {
    const collection = buildPostmanCollection('common', documents.common) as {
      item: { name: string; item: { request: { url: { raw: string }; auth?: unknown } }[] }[];
      variable: { key: string }[];
    };
    expect(collection.item[0]?.name).toBe('Health');
    expect(collection.item[0]?.item.map((i) => i.request.url.raw)).toEqual([
      '{{baseUrl}}/health',
      '{{baseUrl}}/ready',
    ]);
    expect(collection.item[0]?.item[0]?.request.auth).toBeUndefined();
    expect(collection.variable.map((v) => v.key)).toEqual(['baseUrl', 'language']);
  });

  it('adds a bearer token variable, path variables, query and a JSON body for secured operations', () => {
    const fake = {
      openapi: '3.1.0',
      info: { title: 't', version: '1' },
      security: [{ bearerAuth: [] }],
      paths: {
        '/customer/v1/salons/{id}': {
          post: {
            tags: ['Salons'],
            summary: 'Update salon',
            parameters: [
              { name: 'id', in: 'path', required: true },
              { name: 'page', in: 'query', required: false },
            ],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { name: { type: 'string' }, count: { type: 'integer' } },
                  },
                },
              },
            },
          },
        },
      },
    };
    const collection = buildPostmanCollection('customer', fake as never) as {
      item: { item: { request: Record<string, unknown> }[] }[];
      variable: { key: string }[];
    };
    const request = collection.item[0]?.item[0]?.request as {
      url: {
        raw: string;
        path: string[];
        variable: { key: string }[];
        query: { key: string; disabled?: boolean }[];
      };
      auth: { bearer: { value: string }[] };
      body: { raw: string };
      header: { key: string }[];
    };
    expect(request.url.raw).toBe('{{baseUrl}}/customer/v1/salons/:id');
    expect(request.url.path).toEqual(['customer', 'v1', 'salons', ':id']);
    expect(request.url.variable).toEqual([{ key: 'id', value: '' }]);
    expect(request.url.query).toEqual([{ key: 'page', value: '', disabled: true }]);
    expect(request.auth.bearer[0]?.value).toBe('{{customerToken}}');
    expect(JSON.parse(request.body.raw)).toEqual({ name: 'string', count: 0 });
    expect(request.header.map((h) => h.key)).toEqual(['Accept-Language', 'Content-Type']);
    expect(collection.variable.map((v) => v.key)).toContain('customerToken');
  });
});

describe('exampleFromSchema', () => {
  const doc = {
    components: { schemas: { Item: { type: 'object', properties: { id: { type: 'string' } } } } },
  };

  it('builds examples from types, enums, consts, refs, arrays and compositions', () => {
    expect(exampleFromSchema({ type: 'integer' }, doc)).toBe(0);
    expect(exampleFromSchema({ type: 'boolean' }, doc)).toBe(false);
    expect(exampleFromSchema({ type: ['string', 'null'] }, doc)).toBe('string');
    expect(exampleFromSchema({ enum: ['a', 'b'] }, doc)).toBe('a');
    expect(exampleFromSchema({ const: 'fixed' }, doc)).toBe('fixed');
    expect(exampleFromSchema({ example: 7, type: 'string' }, doc)).toBe(7);
    expect(exampleFromSchema({ $ref: '#/components/schemas/Item' }, doc)).toEqual({ id: 'string' });
    expect(exampleFromSchema({ type: 'array', items: { type: 'number' } }, doc)).toEqual([0]);
    expect(exampleFromSchema({ anyOf: [{ type: 'integer' }, { type: 'string' }] }, doc)).toBe(0);
    expect(
      exampleFromSchema(
        {
          allOf: [
            { type: 'object', properties: { a: { type: 'integer' } } },
            { type: 'object', properties: { b: { type: 'boolean' } } },
          ],
        },
        doc,
      ),
    ).toEqual({ a: 0, b: false });
  });

  it('stops on self-referencing schemas', () => {
    const loop = {
      components: {
        schemas: {
          Node: { type: 'object', properties: { next: { $ref: '#/components/schemas/Node' } } },
        },
      },
    };
    expect(() => exampleFromSchema({ $ref: '#/components/schemas/Node' }, loop)).not.toThrow();
    let depth = 0;
    let cursor: unknown = exampleFromSchema({ $ref: '#/components/schemas/Node' }, loop);
    while (typeof cursor === 'object' && cursor !== null && 'next' in cursor) {
      cursor = cursor.next;
      depth += 1;
    }
    expect(depth).toBeLessThanOrEqual(MAX_EXAMPLE_DEPTH);
  });
});

describe('Swagger UI (outside production)', () => {
  it('serves the UI and the raw documents at /docs when enabled', async () => {
    const app = createApp({ logger, docs: true });
    const ui = await request(app).get(`${DOCS_ROUTE}/`);
    expect(ui.status).toBe(200);
    expect(ui.headers['content-type']).toContain('text/html');
    const json = await request(app).get(`${DOCS_ROUTE}/common.json`);
    expect(json.status).toBe(200);
    expect((json.body as { openapi: string }).openapi).toBe('3.1.0');
    expect(Object.keys((json.body as { paths: object }).paths)).toEqual([
      '/health',
      '/ready',
      '/webhooks/payments',
    ]);
  });

  it('answers an unknown document with the standard 404', async () => {
    const res = await request(createApp({ logger, docs: true })).get(`${DOCS_ROUTE}/nope.json`);
    expect(res.status).toBe(404);
  });

  it('is not served by default (production)', async () => {
    const app = createApp({ logger });
    expect((await request(app).get(`${DOCS_ROUTE}/common.json`)).status).toBe(404);
    expect((await request(app).get(`${DOCS_ROUTE}/`)).status).toBe(404);
  });

  it('does not interfere with express app built without docs', () => {
    expect(express()).toBeDefined();
  });
});
