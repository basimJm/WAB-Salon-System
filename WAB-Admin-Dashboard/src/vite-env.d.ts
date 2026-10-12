/// <reference types="vite/client" />

/** Public env values (`VITE_*`) resolved at build time by vite.config.ts. */
declare const __WAB_ENV__: Readonly<Record<string, string | undefined>>;
/** Build variant name: dev-debug | dev-release | prod-debug | prod-release. */
declare const __BUILD_VARIANT__: string;
/** False in prod builds so the mock data source is tree-shaken out. */
declare const __ALLOW_MOCK__: boolean;
