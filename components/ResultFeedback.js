export default function ResultFeedback({ result, t, tf, getLabel }) {
  if (!result) return null;

  const { earlier, later, isCorrect, gap } = result;

  const outcomeText = isCorrect
    ? `${t('correct')} ${earlier.short_name}`
    : `${t('wrong')} ${earlier.short_name} (${getLabel(earlier)}) ${t('earlierThan')} ${later.short_name} (${getLabel(later)}).`;

  return (
    <div className="result-feedback">
      <div className="outcome-line">{outcomeText}</div>
      <div className="gap-line">{tf('yearsApart', { n: gap })}</div>
      <div className="timeline" role="img" aria-label={tf('yearsApart', { n: gap })}>
        <div className="marker earlier" />
        <div className="marker later" />
        <div className="marker-label earlier-label">{getLabel(earlier)}</div>
        <div className="marker-label later-label">{getLabel(later)}</div>
      </div>
    </div>
  );
}