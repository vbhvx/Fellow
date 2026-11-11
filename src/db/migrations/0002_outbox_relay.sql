-- Global, monotonically increasing sequence for every collaboration event.
-- It doubles as the SSE event id so reconnecting clients can resume with Last-Event-ID.
ALTER TABLE collaboration_events ADD COLUMN IF NOT EXISTS seq BIGSERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS outbox_seq_idx ON collaboration_events(seq);
CREATE INDEX IF NOT EXISTS outbox_org_seq_idx ON collaboration_events(organization_id, seq);

-- Retry bookkeeping for the relay worker.
ALTER TABLE collaboration_events ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE collaboration_events ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE collaboration_events ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

-- Partial index: the relay only ever scans the (small) undelivered set.
DROP INDEX IF EXISTS outbox_publish_idx;
CREATE INDEX IF NOT EXISTS outbox_pending_idx
  ON collaboration_events(next_attempt_at, seq)
  WHERE published_at IS NULL AND failed_at IS NULL;
