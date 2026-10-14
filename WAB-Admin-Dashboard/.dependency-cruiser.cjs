/** Layer rules mirror CLAUDE.md §2, ESLint `no-restricted-imports` and tests/architecture.test.ts. */
const LAYER_RULES = {
  domain: ['data', 'presentation', 'infrastructure', 'app', 'design'],
  infrastructure: ['data', 'presentation', 'app', 'design'],
  data: ['presentation', 'app', 'design'],
  design: ['data', 'presentation', 'app', 'domain'],
  presentation: ['data'],
};

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular imports hide layering mistakes.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    ...Object.entries(LAYER_RULES).map(([layer, forbidden]) => ({
      name: `layer-${layer}`,
      severity: 'error',
      comment: `"${layer}" must not depend on: ${forbidden.join(', ')}.`,
      from: { path: `^src/${layer}/` },
      to: { path: `^src/(${forbidden.join('|')})/` },
    })),
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.d\\.ts$' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
