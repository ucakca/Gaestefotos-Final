-- Add permissions JSONB to event_members
ALTER TABLE "event_members" ADD COLUMN "permissions" JSONB NOT NULL DEFAULT '{}'::jsonb;
