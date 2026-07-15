'use client';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxDigits?: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function NumericKeypad({ value, onChange, maxDigits = 9 }: NumericKeypadProps) {
  const handlePress = (key: string) => {
    if (key === '') return;
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= maxDigits) return;
    const next = value === '0' ? key : value + key;
    onChange(next);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
      {KEYS.map((key, i) => (
        <button
          key={i}
          type="button"
          onClick={() => handlePress(key)}
          disabled={key === ''}
          style={{
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 600,
            background: key === '' ? 'transparent' : 'var(--paper)',
            border: key === '' ? 'none' : '1px solid var(--line)',
            borderRadius: 11,
            padding: '11px 0',
            color: key === '⌫' ? 'var(--muted)' : 'var(--ink)',
            cursor: key === '' ? 'default' : 'pointer',
          }}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
