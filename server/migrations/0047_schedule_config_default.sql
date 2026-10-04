ALTER TABLE groups
    ALTER COLUMN schedule_config
        SET DEFAULT '{"breaks": {}, "startTime": "08:00", "totalSlots": 8, "lessonDurationMins": 45}'::jsonb;
