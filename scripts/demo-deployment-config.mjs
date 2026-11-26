const databaseIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
const placeholderDatabaseIds = new Set([
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000001',
]);

/**
 * @typedef {object} BuiltWorkerConfig
 * @property {string} [main]
 * @property {{directory?: string, binding?: string}} [assets]
 * @property {{binding?: string, database_id?: string, migrations_dir?: string}[]} [d1_databases]
 * @property {string} [compatibility_date]
 * @property {string[]} [compatibility_flags]
 * @property {boolean} [no_bundle]
 * @property {boolean} [upload_source_maps]
 * @property {{type: string, globs: string[], fallthrough?: boolean}[]} [rules]
 */

/**
 * Retarget the generated application bundle to the public demo.
 * @param {BuiltWorkerConfig} source
 * @param {unknown} databaseId
 */
export function createDemoConfig(source, databaseId) {
  const database = source?.d1_databases?.[0];
  if (
    source?.main !== 'linkrovia.js' ||
    source.assets?.binding !== 'ASSETS' ||
    typeof source.assets.directory !== 'string' ||
    !source.assets.directory ||
    !Array.isArray(source.d1_databases) ||
    source.d1_databases.length !== 1 ||
    database?.binding !== 'DB' ||
    typeof database.database_id !== 'string' ||
    typeof database.migrations_dir !== 'string' ||
    !database.migrations_dir
  ) {
    throw new Error(
      'Run npm run build to generate the Linkrovia Worker with ASSETS and a single DB binding.',
    );
  }

  if (
    typeof databaseId !== 'string' ||
    databaseId.length !== 36 ||
    !databaseIdPattern.test(databaseId) ||
    placeholderDatabaseIds.has(databaseId) ||
    databaseId === database.database_id.toLowerCase()
  ) {
    throw new Error(
      'Set the demo D1 database ID to a canonical UUID distinct from the source database ID.',
    );
  }

  const dataset = `linkrovia_demo_clicks_${databaseId.replaceAll('-', '')}`;
  return {
    name: 'linkrovia-demo',
    main: source.main,
    compatibility_date: source.compatibility_date,
    compatibility_flags: source.compatibility_flags?.slice(),
    assets: { directory: source.assets.directory, binding: 'ASSETS' },
    no_bundle: source.no_bundle,
    upload_source_maps: source.upload_source_maps,
    rules: source.rules?.map(({ type, globs, fallthrough }) => ({
      type,
      globs: globs.slice(),
      ...(fallthrough === undefined ? {} : { fallthrough }),
    })),
    workers_dev: false,
    preview_urls: false,
    routes: [{ pattern: 'demo.linkrovia.com', custom_domain: true }],
    version_metadata: { binding: 'CF_VERSION_METADATA' },
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'linkrovia-demo-db',
        database_id: databaseId,
        migrations_dir: database.migrations_dir,
      },
    ],
    ratelimits: [
      {
        name: 'AUTH_LIMIT',
        namespace_id: '729642104',
        simple: { limit: 10, period: 60 },
      },
    ],
    analytics_engine_datasets: [{ binding: 'CLICKS', dataset }],
    analytics: { binding: 'ANALYTICS_SQL' },
    vars: { LINKROVIA_CLICKS_DATASET: dataset },
    triggers: { crons: ['15,45 * * * *'] },
    ai: { binding: 'AI' },
    observability: { enabled: false },
  };
}
