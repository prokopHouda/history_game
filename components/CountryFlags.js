const MAX_FLAGS = 5;

function flagEmoji(code) {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '';
  return String.fromCodePoint(
    upper.charCodeAt(0) - 65 + 0x1f1e6,
    upper.charCodeAt(1) - 65 + 0x1f1e6,
  );
}

function countryName(code, lang) {
  try {
    const dn = new Intl.DisplayNames([lang], { type: 'region' });
    const name = dn.of(upper(code));
    return name || code;
  } catch (e) {
    return code;
  }
}

function upper(code) {
  return code.trim().toUpperCase();
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
        <span
          key={code}
          className="country-flag"
          title={countryName(code, lang)}
          aria-label={countryName(code, lang)}
        >
          {flagEmoji(code)}
        </span>
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
                <span className="country-flag">{flagEmoji(code)}</span>
                <span className="country-flags-tooltip-name">{countryName(code, lang)}</span>
              </span>
            ))}
          </span>
        </span>
      )}
    </div>
  );
}