type EmptyStateProps = {
  text: string;
  title: string;
};

export function EmptyState({ text, title }: EmptyStateProps) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-[#101b2d]/85 p-11 text-center shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl max-sm:p-5">
      <h3 className="mb-2 text-xl font-black">{title}</h3>
      <p className="mb-0 leading-7 text-[#95a3b8]">{text}</p>
    </div>
  );
}
