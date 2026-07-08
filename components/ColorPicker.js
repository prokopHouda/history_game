export default function ColorPicker({ colors, takenColors, selectedColor, onSelect }) {
  return (
    <div id="mp-color-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {colors.map((c) => {
        const isTaken = takenColors.has(c) && c !== selectedColor;
        const isSelected = c === selectedColor;
        return (
          <button
            key={c}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: isSelected ? '2px solid #fff' : '2px solid transparent',
              background: c, padding: 0, margin: 2,
              cursor: isTaken ? 'not-allowed' : 'pointer',
              opacity: isTaken ? 0.3 : 1,
              transition: 'opacity 0.15s',
            }}
            disabled={isTaken}
            onClick={() => !isTaken && onSelect(c)}
          />
        );
      })}
    </div>
  );
}