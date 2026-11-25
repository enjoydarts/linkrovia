CREATE TABLE ai_settings (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  monthly_budget_microusd INTEGER NOT NULL DEFAULT 0 CHECK (
    typeof(monthly_budget_microusd) = 'integer' AND monthly_budget_microusd BETWEEN 0 AND 1000000000
  ),
  revision INTEGER NOT NULL DEFAULT 0
);

INSERT INTO ai_settings (singleton) VALUES (1);

CREATE TABLE ai_usage (
  id TEXT PRIMARY KEY NOT NULL,
  feature TEXT NOT NULL CHECK (feature IN ('smart-create', 'insights')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'succeeded', 'failed', 'unknown_charge')),
  input_tokens INTEGER NOT NULL CHECK (input_tokens BETWEEN 0 AND 4096),
  output_tokens INTEGER NOT NULL CHECK (output_tokens BETWEEN 0 AND 512),
  neurons INTEGER NOT NULL CHECK (neurons BETWEEN 0 AND 2000),
  cost_microusd INTEGER NOT NULL CHECK (cost_microusd BETWEEN 0 AND 1000000000)
);

CREATE INDEX ai_usage_started ON ai_usage (started_at);
CREATE INDEX ai_usage_completed ON ai_usage (started_at)
  WHERE status IN ('succeeded', 'failed');
CREATE UNIQUE INDEX ai_usage_active ON ai_usage ((1))
  WHERE status IN ('reserved', 'unknown_charge');

CREATE TABLE ai_cache (
  cache_key TEXT PRIMARY KEY NOT NULL,
  result_json TEXT NOT NULL CHECK (length(CAST(result_json AS BLOB)) <= 16384),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX ai_cache_expiration ON ai_cache (expires_at);
CREATE INDEX ai_cache_created ON ai_cache (created_at, cache_key);
