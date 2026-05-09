import Image from "next/image";

type HostLogoDividerProps = {
  hostLogos: string[];
};

export function HostLogoDivider({ hostLogos }: HostLogoDividerProps) {
  return (
    <div className="flex items-center justify-center gap-6 py-2">
      <div className="h-px flex-1 bg-white/10" />
      <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-[#101b2d]/85 px-6 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl">
        {hostLogos.slice(0, 2).map((logo, index) => (
          <Image
            alt={`Host logo divider ${index + 1}`}
            className="max-h-24 w-auto max-w-40 rounded-2xl object-contain"
            height={96}
            key={logo}
            src={logo}
            unoptimized
            width={160}
          />
        ))}
      </div>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
