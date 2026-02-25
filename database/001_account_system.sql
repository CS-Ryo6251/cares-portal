-- =============================================================
-- Cares Portal アカウント機能 マイグレーション
-- 作成日: 2026-02-25
-- 対象: cares.carespace.jp
-- 前提: auth.users (Supabase Auth) は既存。変更しない。
-- =============================================================

-- -----------------------------------------------------------
-- 1. cares_user_profiles: Cares Portal 専用ユーザープロフィール
-- -----------------------------------------------------------
CREATE TABLE cares_user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    profession TEXT NOT NULL
        CHECK (profession IN (
            'care_manager',
            'msw',
            'care_worker',
            'nurse',
            'therapist',
            'family',
            'other'
        )),
    notify_vacancy_change BOOLEAN NOT NULL DEFAULT true,
    notify_comment_reply BOOLEAN NOT NULL DEFAULT true,
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 50)
);

COMMENT ON TABLE cares_user_profiles IS 'Cares Portal専用のユーザープロフィール。auth.usersと1:1。';

-- -----------------------------------------------------------
-- 2. cares_favorites: お気に入り施設
-- -----------------------------------------------------------
CREATE TABLE cares_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES cares_listings(id) ON DELETE CASCADE,
    notify_vacancy BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cares_favorites_unique UNIQUE (user_id, listing_id)
);

COMMENT ON TABLE cares_favorites IS 'ユーザーのお気に入り施設。比較機能・通知のベース。';

-- -----------------------------------------------------------
-- 3. cares_likes: 投稿へのいいね
-- -----------------------------------------------------------
CREATE TABLE cares_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES facility_portal_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cares_likes_unique UNIQUE (user_id, post_id)
);

COMMENT ON TABLE cares_likes IS '投稿へのいいね。1ユーザー1投稿1いいね。';

-- -----------------------------------------------------------
-- 4. cares_notifications: アプリ内通知
-- -----------------------------------------------------------
CREATE TABLE cares_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL
        CHECK (type IN (
            'vacancy_change',
            'new_note',
            'comment_reply',
            'like_received',
            'owner_claim_approved',
            'owner_claim_rejected',
            'system'
        )),
    title TEXT NOT NULL,
    body TEXT,
    resource_type TEXT,
    resource_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    email_sent BOOLEAN NOT NULL DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE cares_notifications IS 'アプリ内通知。メール送信状態も管理。';

-- -----------------------------------------------------------
-- 5. cares_note_view_logs: 専門職メモ閲覧ログ
-- -----------------------------------------------------------
CREATE TABLE cares_note_view_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    listing_id UUID NOT NULL REFERENCES cares_listings(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    viewed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT has_identifier CHECK (ip_hash IS NOT NULL OR user_id IS NOT NULL)
);

COMMENT ON TABLE cares_note_view_logs IS '専門職メモ閲覧ログ。未登録ユーザーの日次閲覧制限に使用。';

-- =============================================================
-- 既存テーブル変更（後方互換性を維持）
-- =============================================================

ALTER TABLE facility_portal_post_comments
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE facility_portal_posts
    ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE cares_professional_notes
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE cares_owner_claims
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- =============================================================
-- Row Level Security
-- =============================================================

-- cares_user_profiles
ALTER TABLE cares_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cares_user_profiles_select_public"
    ON cares_user_profiles FOR SELECT USING (true);

CREATE POLICY "cares_user_profiles_insert_own"
    ON cares_user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cares_user_profiles_update_own"
    ON cares_user_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cares_user_profiles_delete_own"
    ON cares_user_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- cares_favorites
ALTER TABLE cares_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cares_favorites_select_own"
    ON cares_favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "cares_favorites_insert_own"
    ON cares_favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cares_favorites_update_own"
    ON cares_favorites FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cares_favorites_delete_own"
    ON cares_favorites FOR DELETE
    USING (auth.uid() = user_id);

-- cares_likes
ALTER TABLE cares_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cares_likes_select_all"
    ON cares_likes FOR SELECT USING (true);

CREATE POLICY "cares_likes_insert_own"
    ON cares_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cares_likes_delete_own"
    ON cares_likes FOR DELETE
    USING (auth.uid() = user_id);

-- cares_notifications
ALTER TABLE cares_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cares_notifications_select_own"
    ON cares_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "cares_notifications_insert_service"
    ON cares_notifications FOR INSERT
    WITH CHECK (false);

CREATE POLICY "cares_notifications_update_own"
    ON cares_notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cares_notifications_delete_own"
    ON cares_notifications FOR DELETE
    USING (auth.uid() = user_id);

-- cares_note_view_logs
ALTER TABLE cares_note_view_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cares_note_view_logs_select_service"
    ON cares_note_view_logs FOR SELECT USING (false);

CREATE POLICY "cares_note_view_logs_insert_service"
    ON cares_note_view_logs FOR INSERT WITH CHECK (false);

-- =============================================================
-- インデックス
-- =============================================================

CREATE INDEX idx_cares_user_profiles_profession
    ON cares_user_profiles (profession);

CREATE INDEX idx_cares_favorites_user_created
    ON cares_favorites (user_id, created_at DESC);

CREATE INDEX idx_cares_favorites_listing
    ON cares_favorites (listing_id);

CREATE INDEX idx_cares_favorites_vacancy_notify
    ON cares_favorites (listing_id, user_id)
    WHERE notify_vacancy = true;

CREATE INDEX idx_cares_likes_post
    ON cares_likes (post_id);

CREATE INDEX idx_cares_likes_user
    ON cares_likes (user_id, created_at DESC);

CREATE INDEX idx_cares_notifications_user_unread
    ON cares_notifications (user_id, created_at DESC)
    WHERE is_read = false;

CREATE INDEX idx_cares_notifications_user_created
    ON cares_notifications (user_id, created_at DESC);

CREATE INDEX idx_cares_notifications_email_pending
    ON cares_notifications (created_at)
    WHERE email_sent = false AND is_read = false;

CREATE INDEX idx_cares_note_view_logs_ip_date
    ON cares_note_view_logs (ip_hash, viewed_date)
    WHERE ip_hash IS NOT NULL;

CREATE INDEX idx_cares_note_view_logs_ip_listing_date
    ON cares_note_view_logs (ip_hash, listing_id, viewed_date)
    WHERE ip_hash IS NOT NULL;

CREATE INDEX idx_cares_note_view_logs_viewed_date
    ON cares_note_view_logs (viewed_date);

CREATE INDEX idx_fpp_comments_user
    ON facility_portal_post_comments (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX idx_cares_pro_notes_user
    ON cares_professional_notes (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX idx_cares_owner_claims_user
    ON cares_owner_claims (user_id)
    WHERE user_id IS NOT NULL;

-- =============================================================
-- トリガー関数
-- =============================================================

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION update_cares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cares_user_profiles_updated_at
    BEFORE UPDATE ON cares_user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_cares_updated_at();

-- like_count 自動更新
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE facility_portal_posts
        SET like_count = like_count + 1
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE facility_portal_posts
        SET like_count = GREATEST(like_count - 1, 0)
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cares_likes_count_trigger
    AFTER INSERT OR DELETE ON cares_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_like_count();

-- 施設オーナーはCareSpace OS（app.carespace.jp）で登録。
-- Cares Portal側にオーナー昇格ロジックは不要。
