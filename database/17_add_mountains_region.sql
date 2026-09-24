-- Add UN M49 sub-region column to mountains, mirroring events.region.
-- Backfilled from the first ISO-2 country code of each row (the peak's
-- primary country). Run AFTER 15_create_mountains.sql.

alter table mountains
  add column if not exists region text;

-- Backfill: region = UN M49 sub-region of the FIRST country code in `countries`
-- (first element has no leading space). Matches lib/countries.js COUNTRY_TO_SUBREGION.
update mountains
set region = case
  when left(countries, 2) in ('CN', 'JP', 'KP', 'KR', 'TW') then 'Eastern Asia'
  when left(countries, 2) in ('KZ', 'KG', 'TJ', 'TM', 'UZ') then 'Central Asia'
  when left(countries, 2) in ('BT', 'IN', 'IR', 'LK', 'NP', 'PK', 'AF', 'BD', 'MV') then 'Southern Asia'
  when left(countries, 2) in ('ID', 'MY', 'PH', 'SG', 'TH', 'VN', 'BN', 'KH', 'LA', 'MM') then 'South-Eastern Asia'
  when left(countries, 2) in ('TR', 'SY', 'LB', 'IL', 'SA', 'AE', 'YE', 'JO', 'IQ', 'OM', 'QA', 'KW', 'BH', 'AM', 'AZ') then 'Western Asia'
  when left(countries, 2) in ('CZ', 'SK', 'PL', 'HU', 'RO', 'BG', 'UA', 'BY', 'MD', 'RU') then 'Eastern Europe'
  when left(countries, 2) in ('GB', 'IE', 'NO', 'SE', 'DK', 'FI', 'IS', 'EE', 'LV', 'LT') then 'Northern Europe'
  when left(countries, 2) in ('IT', 'SI', 'HR', 'GR', 'ES', 'PT', 'MT', 'CY', 'RS') then 'Southern Europe'
  when left(countries, 2) in ('FR', 'CH', 'DE', 'AT', 'BE', 'NL', 'LU') then 'Western Europe'
  when left(countries, 2) in ('US', 'CA', 'MX', 'GL') then 'Northern America'
  when left(countries, 2) in ('AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'PE', 'PY', 'UY', 'VE', 'GF') then 'South America'
  when left(countries, 2) in ('CR', 'PA', 'GT', 'CU', 'JM', 'DO') then 'Central America'
  when left(countries, 2) in ('ET', 'KE', 'TZ', 'UG', 'ZM', 'RW', 'BI', 'SO') then 'Eastern Africa'
  when left(countries, 2) in ('CD', 'AO', 'CM', 'GA') then 'Middle Africa'
  when left(countries, 2) in ('MA', 'DZ', 'TN', 'LY', 'EG', 'EH') then 'Northern Africa'
  when left(countries, 2) in ('ZA', 'LS', 'NA', 'BW', 'SZ') then 'Southern Africa'
  when left(countries, 2) in ('AU', 'NZ') then 'Australia & New Zealand'
  when left(countries, 2) in ('PG', 'FJ', 'SB', 'VU') then 'Melanesia'
  when left(countries, 2) in ('AQ') then 'Antarctica'
  else null
end
where region is null
  and countries is not null
  and length(countries) >= 2;

-- Rows with null region after backfill fall back to no region (they simply
-- don't match any region filter, only "All regions"). Expected: zero rows
-- for the current dataset. Verify with:
--   select id, short_name, countries from mountains where region is null;