-- ============================================================
-- Migration 001 — khởi tạo schema hệ thống đăng bài tự động
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS ----------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    plan            VARCHAR(20)  NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free','pro','business','enterprise')),
    timezone        VARCHAR(64)  NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','deleted')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. SOCIAL_ACCOUNTS -----------------------------------------
CREATE TABLE IF NOT EXISTS social_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform            VARCHAR(20) NOT NULL
                        CHECK (platform IN ('facebook','linkedin','twitter','instagram','threads','tiktok','mock')),
    platform_user_id    VARCHAR(128) NOT NULL,
    display_name        VARCHAR(255),
    avatar_url          TEXT,
    access_token_enc    TEXT NOT NULL,
    refresh_token_enc   TEXT,
    token_expires_at    TIMESTAMPTZ,
    scopes              TEXT[],
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','needs_reauth','revoked','expired')),
    last_checked_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, platform, platform_user_id)
);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user   ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_reauth ON social_accounts(status)
       WHERE status = 'needs_reauth';

-- 3. TARGETS (group / page / profile) ------------------------
CREATE TABLE IF NOT EXISTS targets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    social_account_id   UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
    target_type         VARCHAR(20) NOT NULL
                        CHECK (target_type IN ('group','page','profile','channel')),
    platform_target_id  VARCHAR(128) NOT NULL,
    name                VARCHAR(255),
    member_count        INTEGER,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    metadata            JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (social_account_id, platform_target_id)
);
CREATE INDEX IF NOT EXISTS idx_targets_account ON targets(social_account_id);

-- 4. CAMPAIGNS ------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    content_template TEXT,
    media_urls       TEXT[],
    hashtags         TEXT[],
    schedule_type    VARCHAR(20) NOT NULL DEFAULT 'once'
                     CHECK (schedule_type IN ('once','recurring','optimal_ai')),
    schedule_config  JSONB DEFAULT '{}'::jsonb,
    ai_spin_enabled  BOOLEAN NOT NULL DEFAULT false,
    status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','scheduled','running','completed','paused','cancelled')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_user   ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- 5. POSTS (đơn vị công việc mà worker xử lý) ----------------
CREATE TABLE IF NOT EXISTS posts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id      UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    target_id        UUID NOT NULL REFERENCES targets(id)   ON DELETE CASCADE,
    content          TEXT NOT NULL,
    media_urls       TEXT[],
    scheduled_at     TIMESTAMPTZ NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled','queued','processing','success','failed','cancelled')),
    platform_post_id VARCHAR(128),
    permalink        TEXT,
    retry_count      SMALLINT NOT NULL DEFAULT 0,
    idempotency_key  VARCHAR(64) NOT NULL UNIQUE,
    published_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_due ON posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_posts_campaign ON posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_posts_status   ON posts(status);

-- 6. POST_LOGS (partition theo tháng) ------------------------
CREATE TABLE IF NOT EXISTS post_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY,
    post_id         UUID NOT NULL,
    user_id         UUID NOT NULL,
    platform        VARCHAR(20) NOT NULL,
    attempt_number  SMALLINT NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL
                    CHECK (status IN ('success','failed','retrying','skipped')),
    error_code      VARCHAR(40),
    error_message   TEXT,
    request_payload JSONB,
    response_body   JSONB,
    http_status     SMALLINT,
    duration_ms     INTEGER,
    worker_id       VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partition mặc định (an toàn) + vài partition tháng mẫu.
-- Thực tế nên dùng pg_partman/cron để tự tạo partition tháng mới.
CREATE TABLE IF NOT EXISTS post_logs_default PARTITION OF post_logs DEFAULT;

CREATE INDEX IF NOT EXISTS idx_post_logs_user_time ON post_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_logs_status    ON post_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_logs_post      ON post_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_post_logs_platform  ON post_logs(platform, created_at DESC);
