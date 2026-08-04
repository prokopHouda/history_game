-- 14_normalize_regions.sql
-- Replaces the `events.region` column (currently a mix of continents, custom
-- sub-regions, and one trailing-comma typo) with strict UN M49 sub-regions.
--
-- The new value is derived from each event's `countries` column: every country
-- code is mapped to its UN M49 sub-region, the sub-regions are de-duplicated,
-- and the result is stored as a comma-separated string (mirroring `countries`).
--
-- Examples:
--   countries = 'CZ'              -> region = 'Eastern Europe'
--   countries = 'CZ,SK'           -> region = 'Eastern Europe'
--   countries = 'CZ,DE'           -> region = 'Eastern Europe, Western Europe'
--   countries = 'PL,RU,GB,US'     -> region = 'Eastern Europe, Northern Europe, Northern America'
--   countries = 'RS,ME'           -> region = 'Southern Europe'  (fixes prior trailing-comma typo)
--
-- Run once in the Supabase SQL Editor. Safe to re-run (idempotent: same input -> same output).

CREATE OR REPLACE FUNCTION _map_country_to_subregion(code text) RETURNS text AS $$
BEGIN
  RETURN CASE code
    -- Eastern Europe
    WHEN 'CZ' THEN 'Eastern Europe'
    WHEN 'HU' THEN 'Eastern Europe'
    WHEN 'PL' THEN 'Eastern Europe'
    WHEN 'RU' THEN 'Eastern Europe'
    WHEN 'SK' THEN 'Eastern Europe'
    -- Western Europe
    WHEN 'AT' THEN 'Western Europe'
    WHEN 'BE' THEN 'Western Europe'
    WHEN 'CH' THEN 'Western Europe'
    WHEN 'DE' THEN 'Western Europe'
    WHEN 'FR' THEN 'Western Europe'
    WHEN 'NL' THEN 'Western Europe'
    -- Northern Europe
    WHEN 'DK' THEN 'Northern Europe'
    WHEN 'FI' THEN 'Northern Europe'
    WHEN 'GB' THEN 'Northern Europe'
    WHEN 'IE' THEN 'Northern Europe'
    WHEN 'LT' THEN 'Northern Europe'
    WHEN 'SE' THEN 'Northern Europe'
    -- Southern Europe
    WHEN 'BA' THEN 'Southern Europe'
    WHEN 'ES' THEN 'Southern Europe'
    WHEN 'GR' THEN 'Southern Europe'
    WHEN 'HR' THEN 'Southern Europe'
    WHEN 'IT' THEN 'Southern Europe'
    WHEN 'ME' THEN 'Southern Europe'
    WHEN 'RS' THEN 'Southern Europe'
    WHEN 'SI' THEN 'Southern Europe'
    -- Northern America
    WHEN 'CA' THEN 'Northern America'
    WHEN 'US' THEN 'Northern America'
    -- South America
    WHEN 'AR' THEN 'South America'
    WHEN 'UY' THEN 'South America'
    -- Central America
    WHEN 'MX' THEN 'Central America'
    -- Caribbean
    WHEN 'JM' THEN 'Caribbean'
    -- Eastern Asia
    WHEN 'CN' THEN 'Eastern Asia'
    WHEN 'JP' THEN 'Eastern Asia'
    WHEN 'KR' THEN 'Eastern Asia'
    WHEN 'MN' THEN 'Eastern Asia'
    -- South-Eastern Asia
    WHEN 'BN' THEN 'South-Eastern Asia'
    WHEN 'ID' THEN 'South-Eastern Asia'
    WHEN 'KH' THEN 'South-Eastern Asia'
    WHEN 'LA' THEN 'South-Eastern Asia'
    WHEN 'MM' THEN 'South-Eastern Asia'
    WHEN 'MY' THEN 'South-Eastern Asia'
    WHEN 'PH' THEN 'South-Eastern Asia'
    WHEN 'SG' THEN 'South-Eastern Asia'
    WHEN 'TH' THEN 'South-Eastern Asia'
    WHEN 'TL' THEN 'South-Eastern Asia'
    WHEN 'VN' THEN 'South-Eastern Asia'
    -- Southern Asia
    WHEN 'IN' THEN 'Southern Asia'
    WHEN 'IR' THEN 'Southern Asia'
    -- Western Asia
    WHEN 'IQ' THEN 'Western Asia'
    WHEN 'TR' THEN 'Western Asia'
    -- Northern Africa
    WHEN 'EG' THEN 'Northern Africa'
    WHEN 'SD' THEN 'Northern Africa'
    -- Eastern Africa
    WHEN 'ET' THEN 'Eastern Africa'
    -- Southern Africa
    WHEN 'ZA' THEN 'Southern Africa'
    -- Australia & New Zealand
    WHEN 'AU' THEN 'Australia & New Zealand'
    WHEN 'NZ' THEN 'Australia & New Zealand'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Normalize every row: split countries, map each code, dedupe, rejoin.
UPDATE events
SET region = sub.new_region
FROM (
  SELECT
    e.id,
    (
      SELECT string_agg(DISTINCT sr, ', ' ORDER BY sr)
      FROM (
        SELECT _map_country_to_subregion(trim(part)) AS sr
        FROM unnest(string_to_array(e.countries, ',')) AS part
        WHERE trim(part) <> ''
      ) mapped
      WHERE sr IS NOT NULL
    ) AS new_region
  FROM events e
) sub
WHERE events.id = sub.id
  AND COALESCE(sub.new_region, '') <> COALESCE(events.region, '');

-- Report the new distribution for verification.
SELECT region, count(*) AS n
FROM events
GROUP BY region
ORDER BY n DESC, region ASC;

-- Cleanup helper function.
DROP FUNCTION _map_country_to_subregion(text);