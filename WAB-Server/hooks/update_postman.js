/**
 * update_postman — Hook: Regenerate the Postman collection from the API manifest.
 *
 * Usage:  node hooks/update_postman.js
 * Effect: Reads hooks/config/api-manifest.json → writes postman/wab-server.postman_collection.json
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.resolve(__dirname, 'config', 'api-manifest.json');
const collectionPath = path.resolve(__dirname, '..', 'postman', 'wab-server.postman_collection.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const endpoints = manifest.endpoints;

const folders = {};
for (const ep of endpoints) {
  if (!folders[ep.folder]) {
    folders[ep.folder] = [];
  }
  folders[ep.folder].push(ep);
}

const buildItem = (ep) => {
  const body = ep.method !== 'GET' && ep.bodyParams && ep.bodyParams.length > 0
    ? {
        mode: 'raw',
        raw: JSON.stringify(
          ep.bodyParams.reduce((acc, p) => {
            acc[p.name] = p.type === 'file' ? null : p.type === 'number' ? 0 : '';
            return acc;
          }, {}),
          null,
          2
        ),
        options: { raw: { language: 'json' } },
      }
    : undefined;

  const descriptionLines = [
    `# ${ep.name}`,
    '',
    ep.description,
    '',
    '---',
    '## Body Parameters',
    '',
    ...ep.bodyParams.map(
      (p) => `| **${p.name}** | ${p.type} | ${p.required ? 'Required' : 'Optional'} | ${p.description} |`
    ),
    '',
    '---',
    '## Responses',
    '',
    ...ep.responses.map((r) => `### ${r.statusCode}\n\`\`\`json\n${r.body}\n\`\`\``),
  ];

  const item = {
    name: ep.name,
    request: {
      method: ep.method,
      header: ep.headers || [],
      url: {
        raw: `${manifest.baseUrl}${ep.path}`,
        host: [manifest.baseUrl],
        path: ep.path.split('/').filter(Boolean),
      },
      description: descriptionLines.join('\n'),
    },
    response: ep.responses.map((r) => ({
      name: `${r.statusCode}`,
      status: String(r.statusCode),
      code: r.statusCode,
      header: [],
      body: r.body,
    })),
  };

  if (body) {
    item.request.body = body;
  }

  return item;
};

const collection = {
  info: {
    name: 'WAB-Server API',
    description: 'WAB (Wedding & Beauty) Server — Node.js Express MongoDB API\n\nSet `base_url` variable in your Postman environment before sending requests.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    _exporter_id: 'wab-server',
  },
  variable: [
    { key: 'base_url', value: 'http://localhost:5000/api', type: 'string' },
  ],
  item: Object.entries(folders).map(([folderName, items]) => ({
    name: folderName,
    item: items.map(buildItem),
  })),
};

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf-8');
console.log(`[update_postman] ✓ Collection updated — ${endpoints.length} endpoints in ${Object.keys(folders).length} folders`);
console.log(`[update_postman]   Path: ${collectionPath}`);
