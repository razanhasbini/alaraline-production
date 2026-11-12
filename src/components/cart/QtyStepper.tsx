'use client';

/** The theme's quantity box: − 1 + */
export default function QtyStepper({ value, onChange, max = 99, disabled, small }: { value: number; onChange: (q: number) => void; max?: number; disabled?: boolean; small?: boolean }) {
  return (
    <div className={`qty${small ? ' qty-sm' : ''}`}>
      <button type="button" aria-label="Decrease quantity" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}>−</button>
      <input type="number" min={1} max={max} value={value} aria-label="Quantity" disabled={disabled}
        onChange={e => { const q = Math.min(max, Math.max(1, Number(e.target.value) || 1)); if (q !== value) onChange(q); }} />
      <button type="button" aria-label="Increase quantity" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
