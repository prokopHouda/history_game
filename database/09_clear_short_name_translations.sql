-- Clear stale translations to force re-translation with new context-aware logic.
-- Deleting rows makes them true cache misses so fresh translations are fetched.
DELETE FROM event_translations WHERE lang != 'en';

-- If you ever need to clear only one language:
-- DELETE FROM event_translations WHERE lang = 'cs';
-- DELETE FROM event_translations WHERE lang = 'it';
