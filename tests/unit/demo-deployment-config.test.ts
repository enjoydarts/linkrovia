import { describe, expect, it } from 'vitest';
import { createDemoConfig } from '../../scripts/demo-deployment-config.mjs';

const productionId = '2b8114dc-774b-41d7-81ac-fa70d055bcc1';
const demoId = '2d6998af-6f01-4219-be93-bc1c288dc019';
const source = {
  name: 'production',
  main: 'linkrovia.js',
  assets: { directory: '../client', binding: 'ASSETS' },
  compatibility_date: '2026-11-22',
  compatibility_flags: ['nodejs_compat'],
  no_bundle: true,
  upload_source_maps: true,
  rules: [{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }],
  d1_databases: [
    {
      binding: 'DB',
      database_name: 'production',
      database_id: productionId,
      migrations_dir: '../../../migrations',
      preview_database_id: productionId,
      remote: true,
    },
  ],
  version_metadata: { binding: 'CF_VERSION_METADATA' },
  triggers: { crons: ['15,45 * * * *'] },
  ai: { binding: 'AI', remote: true, staging: true },
  analytics: { binding: 'ANALYTICS_SQL', remote: true },
  analytics_engine_datasets: [
    { binding: 'CLICKS', dataset: 'production_clicks' },
  ],
  vars: {
    LINKROVIA_CLICKS_DATASET: 'production_clicks',
    SETUP_TOKEN: 'private',
  },
  secrets_store_secrets: [
    { binding: 'SECRET', store_id: 'store', secret_name: 'secret' },
  ],
  observability: { enabled: true, traces: { enabled: true } },
  routes: [{ pattern: 'production.example', custom_domain: true }],
  containers: [{ class_name: 'Container', image: 'Dockerfile' }],
  services: [{ binding: 'PAGE_METADATA', service: 'production' }],
};

describe('createDemoConfig', () => {
  it('targets only the demo domain, D1 database, and click dataset', () => {
    expect(createDemoConfig(source, demoId)).toMatchObject({
      name: 'linkrovia-demo',
      routes: [{ pattern: 'demo.linkrovia.com', custom_domain: true }],
      workers_dev: false,
      preview_urls: false,
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'linkrovia-demo-db',
          database_id: demoId,
          migrations_dir: '../../../migrations',
        },
      ],
      ratelimits: [
        {
          name: 'AUTH_LIMIT',
          namespace_id: '729642104',
          simple: { limit: 10, period: 60 },
        },
      ],
      analytics_engine_datasets: [
        {
          binding: 'CLICKS',
          dataset: 'linkrovia_demo_clicks_2d6998af6f014219be93bc1c288dc019',
        },
      ],
      vars: {
        LINKROVIA_CLICKS_DATASET:
          'linkrovia_demo_clicks_2d6998af6f014219be93bc1c288dc019',
      },
    });
  });

  it('preserves the generated Worker build and existing schedule', () => {
    expect(createDemoConfig(source, demoId)).toMatchObject({
      main: 'linkrovia.js',
      assets: { directory: '../client', binding: 'ASSETS' },
      compatibility_date: '2026-11-22',
      compatibility_flags: ['nodejs_compat'],
      no_bundle: true,
      upload_source_maps: true,
      rules: [{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }],
      version_metadata: { binding: 'CF_VERSION_METADATA' },
      triggers: { crons: ['15,45 * * * *'] },
    });
  });

  it('omits source deployments, variables, secrets, and optional paid services', () => {
    const config = createDemoConfig(source, demoId);
    expect(config.ai).toEqual({ binding: 'AI' });
    expect(config.analytics).toEqual({ binding: 'ANALYTICS_SQL' });
    expect(config.observability).toEqual({ enabled: false });
    expect(Object.keys(config.vars)).toEqual(['LINKROVIA_CLICKS_DATASET']);
    expect(config).not.toHaveProperty('containers');
    expect(config).not.toHaveProperty('services');
    expect(config).not.toHaveProperty('secrets_store_secrets');
    expect(config.d1_databases[0]).not.toHaveProperty('preview_database_id');
    expect(config.d1_databases[0]).not.toHaveProperty('remote');
    expect(source.d1_databases[0].database_id).toBe(productionId);
    expect(source.vars.LINKROVIA_CLICKS_DATASET).toBe('production_clicks');
  });

  it.each([
    '',
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000001',
    productionId,
    `${demoId}\n`,
    demoId.toUpperCase(),
    '--config=production.json',
  ])('rejects an invalid, placeholder, or production database ID %j', (id) => {
    expect(() => createDemoConfig(source, id)).toThrow(/D1 database ID/);
  });

  it('rejects the production ID even if the source uses uppercase', () => {
    const database = {
      ...source.d1_databases[0],
      database_id: productionId.toUpperCase(),
    };
    expect(() =>
      createDemoConfig({ ...source, d1_databases: [database] }, productionId),
    ).toThrow(/D1 database ID/);
  });

  it.each([
    { main: 'other.js' },
    { assets: { directory: '../client', binding: 'OTHER' } },
    { d1_databases: [] },
    { d1_databases: [...source.d1_databases, ...source.d1_databases] },
    { d1_databases: [{ ...source.d1_databases[0], binding: 'OTHER' }] },
  ])(
    'rejects artifacts without the Linkrovia Worker, assets, and one DB binding %j',
    (change) => {
      expect(() => createDemoConfig({ ...source, ...change }, demoId)).toThrow(
        /Linkrovia Worker/,
      );
    },
  );
});
