-- =============================================================
-- Cares listings geocode columns
-- 作成日: 2026-05-08
-- 目的: 住所から取得した緯度経度を保存し、Google Mapsのピン位置を正確化する。
-- =============================================================

ALTER TABLE cares_listings
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS geocode_status TEXT,
    ADD COLUMN IF NOT EXISTS geocode_error TEXT;

CREATE INDEX IF NOT EXISTS idx_cares_listings_geocoded
    ON cares_listings (geocoded_at)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cares_listings_geocode_pending
    ON cares_listings (id)
    WHERE address IS NOT NULL AND latitude IS NULL AND longitude IS NULL;
