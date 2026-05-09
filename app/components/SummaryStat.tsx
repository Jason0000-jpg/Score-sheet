type SummaryStatProps = {
  detail?: string;
  label: string;
  value: number | string;
};

export function SummaryStat({ detail, label, value }: SummaryStatProps) {
  return (
    <div className="grid min-w-0 gap-1 rounded-[1.4rem] bg-[#17243a] p-5">
      <span className="font-bold leading-tight text-[#95a3b8]">{label}</span>
      <strong className="min-w-0 wrap-break-word text-[clamp(1.45rem,3vw,1.95rem)] leading-tight text-[#ffcc66]">
        {value}
      </strong>
      {detail ? (
        <span className="mt-1 block text-sm font-bold text-[#95a3b8]">
          Value: {detail}
        </span>
      ) : null}
    </div>
  );
}
