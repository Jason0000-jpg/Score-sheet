import { parseAmountInput } from "../lib/score-state";

type ValueInputProps = {
  label: string;
  onChange: (value: number) => void;
  value: number;
};

type ScoreInputProps = ValueInputProps & {
  onAdjust: (amount: number) => void;
};

export function ValueInput({ label, onChange, value }: ValueInputProps) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-extrabold uppercase tracking-[0.08em] text-[#95a3b8]">
        {label}
      </label>
      <input
        className="w-full min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-white placeholder:text-white/45"
        inputMode="numeric"
        onChange={(event) => onChange(parseAmountInput(event.target.value))}
        pattern="[0-9]*"
        placeholder="0"
        type="text"
        value={value}
      />
    </div>
  );
}

export function ScoreInput({
  label,
  onAdjust,
  onChange,
  value,
}: ScoreInputProps) {
  return (
    <div className="min-w-0 rounded-[1.25rem] bg-white/5.5 p-4">
      <label className="mb-2 block text-sm font-extrabold uppercase tracking-[0.08em] text-[#95a3b8]">
        {label}
      </label>
      <div className="grid grid-cols-[44px_minmax(64px,1fr)_44px] gap-2.5">
        <button
          className="min-h-12 rounded-2xl bg-[#f6b23f] text-2xl font-black text-[#211406] transition hover:-translate-y-0.5 hover:brightness-110"
          onClick={() => onAdjust(-1)}
          type="button"
        >
          -
        </button>
        <input
          className="min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-center text-white"
          inputMode="numeric"
          onChange={(event) => onChange(parseAmountInput(event.target.value))}
          pattern="[0-9]*"
          type="text"
          value={value}
        />
        <button
          className="min-h-12 rounded-2xl bg-[#f6b23f] text-2xl font-black text-[#211406] transition hover:-translate-y-0.5 hover:brightness-110"
          onClick={() => onAdjust(1)}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function LootInput({ onChange, value }: Omit<ValueInputProps, "label">) {
  return (
    <div className="min-w-0 rounded-[1.25rem] bg-white/5.5 p-4">
      <label className="mb-2 block text-sm font-extrabold uppercase tracking-[0.08em] text-[#95a3b8]">
        Extracted Loot
      </label>
      <input
        className="w-full min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-white placeholder:text-white/45"
        inputMode="numeric"
        onChange={(event) => onChange(parseAmountInput(event.target.value))}
        pattern="[0-9]*"
        placeholder="0"
        type="text"
        value={value}
      />
    </div>
  );
}
