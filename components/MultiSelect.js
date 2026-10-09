import { useMemo } from 'react';

// Reusable multi-select widget: a dropdown that adds values to a set,
// with selected values shown as removable pills below.
//
// Props:
//   id          - optional id for the <select>
//   values      - string[] of currently selected values
//   onChange    - (string[]) => void
//   options     - { value, label }[] all selectable options
//   allLabel    - text shown when nothing is selected ("All countries")
//   addLabel    - placeholder in the dropdown ("Add more…")
//   t           - translation function (optional, for clearAll)
export default function MultiSelect({
  id,
  values,
  onChange,
  options,
  allLabel,
  addLabel,
  t,
}) {
  const selectedSet = useMemo(() => new Set(values), [values]);

  // Options not yet selected (shown in the dropdown)
  const availableOptions = useMemo(
    () => options.filter((o) => !selectedSet.has(o.value)),
    [options, selectedSet]
  );

  function handleAdd(value) {
    if (!value) return;
    if (selectedSet.has(value)) return;
    onChange([...values, value]);
  }

  function handleRemove(value) {
    onChange(values.filter((v) => v !== value));
  }

  function handleClearAll() {
    onChange([]);
  }

  const labelForValue = useMemo(() => {
    const map = {};
    options.forEach((o) => { map[o.value] = o.label; });
    return map;
  }, [options]);

  return (
    <div className="multiselect">
      {values.length === 0 ? (
        <div className="multiselect-empty">{allLabel}</div>
      ) : (
        <div className="multiselect-pills">
          {values.map((v) => (
            <span key={v} className="multiselect-pill">
              {labelForValue[v] || v}
              <button
                type="button"
                className="multiselect-pill-remove"
                onClick={() => handleRemove(v)}
                aria-label="Remove"
              >
                ×
              </button>
            </span>
          ))}
          {values.length > 1 && (
            <button
              type="button"
              className="multiselect-clear-all"
              onClick={handleClearAll}
            >
              {t ? t('clearAll') : 'Clear all'}
            </button>
          )}
        </div>
      )}

      {availableOptions.length > 0 && (
        <select
          id={id}
          className="multiselect-add"
          value=""
          onChange={(e) => {
            handleAdd(e.target.value);
            e.target.value = '';
          }}
        >
          <option value="">{addLabel}</option>
          {availableOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}