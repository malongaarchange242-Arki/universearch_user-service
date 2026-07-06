-- Create email_logs table to track all sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Candidate information
  nom TEXT NULL,
  prenom TEXT NULL,
  email TEXT NOT NULL,
  telephone TEXT NULL,
  quartier TEXT NULL,
  user_type TEXT NULL,
  
  -- Email details
  raison TEXT NULL,
  custom_message TEXT NULL,
  institution_name TEXT NOT NULL,
  institution_id TEXT NULL,
  institution_type TEXT NULL,
  
  -- Tracking
  status TEXT NOT NULL DEFAULT 'sent', -- sent, delivered, bounced, failed
  message_id TEXT NULL,
  brevo_response TEXT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  admin_email TEXT NULL,
  admin_name TEXT NULL,
  
  CONSTRAINT email_logs_status_check CHECK (
    status = ANY (ARRAY['sent'::text, 'delivered'::text, 'bounced'::text, 'failed'::text])
  )
) TABLESPACE pg_default;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_logs_email 
  ON public.email_logs USING btree (email) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_email_logs_institution 
  ON public.email_logs USING btree (institution_name) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_email_logs_created_at 
  ON public.email_logs USING btree (created_at) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_email_logs_status 
  ON public.email_logs USING btree (status) 
  TABLESPACE pg_default;

-- Enable RLS (Row Level Security) if needed
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Add custom_message column if it doesn't exist (for existing tables)
ALTER TABLE public.email_logs
ADD COLUMN IF NOT EXISTS custom_message TEXT NULL;

-- Create a policy to allow authenticated users to read
CREATE POLICY "Allow authenticated users to read email_logs" 
  ON public.email_logs 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create a policy to allow service role to write
CREATE POLICY "Allow service role to write email_logs" 
  ON public.email_logs 
  FOR INSERT 
  TO service_role 
  WITH CHECK (true);
