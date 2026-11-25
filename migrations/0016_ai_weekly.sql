ALTER TABLE ai_settings ADD COLUMN weekly_enabled INTEGER NOT NULL DEFAULT 0
  CHECK (weekly_enabled IN (0, 1));

ALTER TABLE ai_usage ADD COLUMN automatic INTEGER NOT NULL DEFAULT 0
  CHECK (automatic IN (0, 1));

CREATE TABLE ai_weekly_report (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  headline TEXT NOT NULL CHECK (length(headline) BETWEEN 1 AND 120),
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 1 AND 600),
  created_at INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  locale TEXT NOT NULL
);
