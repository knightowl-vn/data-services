-- Schema for the Postgres store (database: data_quality).
CREATE TABLE IF NOT EXISTS checks (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT        NOT NULL,
    dataset     TEXT        NOT NULL,
    rule        TEXT        NOT NULL,
    "column"    TEXT,
    threshold   DOUBLE PRECISION,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runs (
    id          BIGSERIAL PRIMARY KEY,
    check_id    BIGINT      NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
    status      TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS runs_check_id_idx ON runs (check_id);
