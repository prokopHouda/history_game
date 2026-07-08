export default function LangNav({ lang, onChange }) {
  const langs = [
    { code: 'en', label: 'EN', aria: 'English' },
    { code: 'cs', label: 'CS', aria: 'Čeština' },
    { code: 'it', label: 'IT', aria: 'Italiano' },
  ];

  return (
    <nav className="lang-nav">
      {langs.map((l) => (
        <button
          key={l.code}
          data-lang={l.code}
          className={`lang-btn${lang === l.code ? ' active' : ''}`}
          aria-label={l.aria}
          onClick={() => onChange(l.code)}
        >
          {l.label}
        </button>
      ))}
    </nav>
  );
}