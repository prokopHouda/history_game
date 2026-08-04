const MAX_FLAGS = 5;

function upper(code) {
  return code.trim().toUpperCase();
}

function flagSrc(code, size = 40) {
  const u = upper(code);
  if (!/^[A-Z]{2}$/.test(u)) return '';
  return `https://flagcdn.com/w${size}/${u.toLowerCase()}.png`;
}

function countryName(code, lang) {
  const u = upper(code);
  try {
    const dn = new Intl.DisplayNames([lang], { type: 'region' });
    const name = dn.of(u);
    return name || u;
  } catch (e) {
    return u;
  }
}

export default function CountryFlags({ countries, lang, t }) {
  const codes = (countries || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .map(upper);

  if (codes.length === 0) return null;

  const visible = codes.slice(0, MAX_FLAGS);
  const extra = codes.length - MAX_FLAGS;
  const moreLabel = t ? t('countries') : 'countries';
  const tooltipLabel = t ? t('countriesTooltip') : 'All countries';

  return (
    <div className="country-flags" aria-label={tooltipLabel}>
      {visible.map((code) => (
        <img
          key={code}
          className="country-flag"
          src={flagSrc(code)}
          alt={countryName(code, lang)}
          title={countryName(code, lang)}
          loading="lazy"
          draggable={false}
        />
      ))}
      {extra > 0 && (
        <span
          className="country-flags-more"
          role="button"
          tabIndex={0}
          aria-label={`${extra} ${moreLabel}`}
          title={`${extra} ${moreLabel}`}
        >
          +{extra} {moreLabel}
          <span className="country-flags-tooltip">
            {codes.map((code) => (
              <span key={code} className="country-flags-tooltip-item">
                <img
                  className="country-flag"
                  src={flagSrc(code)}
                  alt={countryName(code, lang)}
                  title={countryName(code, lang)}
                  loading="lazy"
                  draggable={false}
                />
                <span className="country-flags-tooltip-name">{countryName(code, lang)}</span>
              </span>
            ))}
          </span>
        </span>
      )}
    </div>
  );
}