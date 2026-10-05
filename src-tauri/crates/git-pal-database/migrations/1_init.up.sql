CREATE TABLE IF NOT EXISTS code_reviews (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    owner         TEXT    NOT NULL,
    repository    TEXT    NOT NULL,
    pr_number     INTEGER NOT NULL,
    pr_title      TEXT    NOT NULL DEFAULT '',
    branch        TEXT    NOT NULL DEFAULT '',
    head_sha      TEXT    NOT NULL DEFAULT '',
    -- head commit the review was submitted at, NULL until submitted
    submitted_head_sha TEXT,
    -- "APPROVE", "REQUEST_CHANGES" or "COMMENT", NULL until submitted
    submitted_event TEXT,
    summary       TEXT    NOT NULL DEFAULT '',
    comments      TEXT    NOT NULL DEFAULT '[]',
    reviewed_at   TEXT    NOT NULL,
    -- { "type": "template", "id": 1 } or { "type": "built-in" } or NULL when not reviewing by ai
    template      TEXT,
    harness       TEXT,
    model         TEXT,
    error         TEXT,
    -- e.g. skills the template asked for but no longer installed
    warning       TEXT,
    cancelled     INTEGER NOT NULL DEFAULT 0,
    reviewed      INTEGER NOT NULL DEFAULT 0,
    UNIQUE(owner, repository, pr_number)
);

CREATE TABLE IF NOT EXISTS review_viewed_files (
    owner         TEXT    NOT NULL,
    repository    TEXT    NOT NULL,
    pr_number     INTEGER NOT NULL,
    filename      TEXT    NOT NULL,
    -- content hash from gh api
    sha           TEXT    NOT NULL,
    PRIMARY KEY (owner, repository, pr_number, filename)
);

CREATE TABLE IF NOT EXISTS review_templates (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    content       TEXT    NOT NULL,
    -- regex tested against "owner/repo"
    matcher       TEXT,
    is_default    INTEGER NOT NULL DEFAULT 0,
    -- JSON array of skill names the review must use
    skills        TEXT    NOT NULL DEFAULT '[]',
    -- first matching template in this order wins
    position      INTEGER NOT NULL,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_conversations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    owner         TEXT    NOT NULL,
    repository    TEXT    NOT NULL,
    pr_number     INTEGER NOT NULL,
    title         TEXT    NOT NULL,
    session_id    TEXT,
    harness       TEXT    NOT NULL DEFAULT 'claude',
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
    role            TEXT    NOT NULL,
    blocks          TEXT    NOT NULL DEFAULT '[]',
    created_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_pr ON agent_conversations(owner, repository, pr_number);
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON agent_messages(conversation_id);
