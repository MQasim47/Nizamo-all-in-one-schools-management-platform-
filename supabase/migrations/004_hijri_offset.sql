-- Per-school Hijri date adjustment (days), because Pakistan follows moon sighting and can differ
-- from the calendar tables by a day. Default -1 (typical for Pakistan). Editable in school settings.
-- Run in the Supabase SQL editor. Safe to run twice.
ALTER TABLE school_settings
  ADD COLUMN IF NOT EXISTS hijri_offset SMALLINT NOT NULL DEFAULT -1
  CONSTRAINT school_settings_hijri_offset_range CHECK (hijri_offset BETWEEN -2 AND 2);
