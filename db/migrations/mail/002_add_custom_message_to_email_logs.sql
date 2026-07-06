-- Add custom_message column to email_logs if table already exists (backward compatibility)
ALTER TABLE public.email_logs
ADD COLUMN IF NOT EXISTS custom_message TEXT NULL;

-- Add comment to document the new column
COMMENT ON COLUMN public.email_logs.custom_message IS 'Custom message complementaire added during email send';
