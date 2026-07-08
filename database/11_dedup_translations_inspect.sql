-- Inspection: check for duplicates and orphans before adding constraints
-- Run this FIRST to see if there's cleanup needed.
-- This script is read-only — it produces no changes.

-- 1. Duplicate (event_id, lang) pairs
SELECT event_id, lang, count(*) AS dup_count
FROM event_translations
GROUP BY event_id, lang
HAVING count(*) > 1
ORDER BY event_id, lang;

-- 2. Orphaned translations (event_id not in events table)
SELECT et.event_id, et.lang
FROM event_translations et
LEFT JOIN events e ON et.event_id = e.id
WHERE e.id IS NULL;

-- 3. Rows with null short_name (already treated as cache miss by code)
SELECT event_id, lang
FROM event_translations
WHERE short_name IS NULL;