-- ============================================================
-- 🔥 EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 🧵 TABLE: conversations (polymorphique)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  admin_id UUID NOT NULL,

  -- 🔥 polymorphisme
  institution_id UUID NOT NULL,
  institution_type VARCHAR(50) NOT NULL
    CHECK (institution_type IN ('universite', 'centre_formation')),

  name VARCHAR(255) NOT NULL,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 🔥 unicité correcte
  UNIQUE(admin_id, institution_id, institution_type)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_conversations_admin_id 
ON conversations(admin_id);

CREATE INDEX IF NOT EXISTS idx_conversations_institution_id 
ON conversations(institution_id);

CREATE INDEX IF NOT EXISTS idx_conversations_type 
ON conversations(institution_type);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
ON conversations(updated_at DESC);

-- ============================================================
-- 💬 TABLE: messages
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  conversation_id UUID NOT NULL 
    REFERENCES conversations(id) ON DELETE CASCADE,

  sender_id UUID NOT NULL,

  -- 🔥 plus précis
  sender_type VARCHAR(50) NOT NULL
    CHECK (sender_type IN ('admin', 'universite', 'centre_formation')),

  -- 🔥 utile pour cohérence
  sender_institution_type VARCHAR(50)
    CHECK (sender_institution_type IN ('universite', 'centre_formation')),

  text TEXT NOT NULL,

  file_name VARCHAR(255),
  file_url VARCHAR(2048),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

-- ============================================================
-- 👁️ TABLE: conversation_reads
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  conversation_id UUID NOT NULL 
    REFERENCES conversations(id) ON DELETE CASCADE,

  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL,

  UNIQUE(conversation_id, user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_conversation_reads_user_id 
ON conversation_reads(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_reads_conversation_id 
ON conversation_reads(conversation_id);

-- ============================================================
-- 🔐 RLS: conversations
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Admin voit tout
CREATE POLICY "admins_see_all_conversations"
ON conversations
FOR SELECT
USING (
  (current_setting('request.jwt.claims', true)::jsonb->>'is_admin')::boolean = true
);

-- Institution voit ses conversations
CREATE POLICY "institutions_see_own_conversations"
ON conversations
FOR SELECT
USING (
  institution_id = (current_setting('request.jwt.claims', true)::jsonb->>'institution_id')::uuid
  AND institution_type = (current_setting('request.jwt.claims', true)::jsonb->>'institution_type')
);

-- ============================================================
-- 🔐 RLS: messages
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Lire messages
CREATE POLICY "users_see_messages"
ON messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      (current_setting('request.jwt.claims', true)::jsonb->>'is_admin')::boolean = true
      OR (
        c.institution_id = (current_setting('request.jwt.claims', true)::jsonb->>'institution_id')::uuid
        AND c.institution_type = (current_setting('request.jwt.claims', true)::jsonb->>'institution_type')
      )
    )
  )
);

-- Envoyer message
CREATE POLICY "users_insert_messages"
ON messages
FOR INSERT
WITH CHECK (
  sender_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      (current_setting('request.jwt.claims', true)::jsonb->>'is_admin')::boolean = true
      OR (
        c.institution_id = (current_setting('request.jwt.claims', true)::jsonb->>'institution_id')::uuid
        AND c.institution_type = (current_setting('request.jwt.claims', true)::jsonb->>'institution_type')
      )
    )
  )
);

-- Modifier message
CREATE POLICY "users_update_messages"
ON messages
FOR UPDATE
USING (
  sender_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid
  OR (current_setting('request.jwt.claims', true)::jsonb->>'is_admin')::boolean = true
);

-- Supprimer message
CREATE POLICY "users_delete_messages"
ON messages
FOR DELETE
USING (
  sender_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid
  OR (current_setting('request.jwt.claims', true)::jsonb->>'is_admin')::boolean = true
);

-- ============================================================
-- 🔐 RLS: conversation_reads
-- ============================================================
ALTER TABLE conversation_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_reads"
ON conversation_reads
FOR SELECT
USING (
  user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid
);

CREATE POLICY "users_insert_reads"
ON conversation_reads
FOR INSERT
WITH CHECK (
  user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid
);

CREATE POLICY "users_update_reads"
ON conversation_reads
FOR UPDATE
USING (
  user_id = (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid
);