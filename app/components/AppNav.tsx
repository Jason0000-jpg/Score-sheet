"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavProps = {
  hostLogos: string[];
};

export function AppNav({ hostLogos }: AppNavProps) {
  const pathname = usePathname();
  const isSetupActive = pathname === "/";
  const isScoresActive = pathname === "/saved-raids";
  const getLinkClassName = (isActive: boolean) =>
    isActive
      ? "rounded-2xl bg-white px-4 py-2 text-center font-black text-[#211406] transition hover:-translate-y-0.5 hover:brightness-110"
      : "rounded-2xl px-4 py-2 text-center font-bold text-[#95a3b8] transition hover:bg-white/10 hover:text-white";

  return (
    <nav className="mb-6 grid items-center gap-3 rounded-b-3xl border border-t-0 border-white/10 bg-[#101b2d]/85 p-3 text-center shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:grid-cols-[1fr_auto_1fr]">
      <HostLogoNavSlot logo={hostLogos[0]} position="left" />
      <div className="flex justify-center gap-2 max-sm:w-full max-sm:flex-col">
        <Link
          className={getLinkClassName(isSetupActive)}
          href="/#setup"
        >
          Setup
        </Link>
        <Link
          className={getLinkClassName(isScoresActive)}
          href="/saved-raids"
        >
          Scores
        </Link>
      </div>
      <HostLogoNavSlot logo={hostLogos[1]} position="right" />
    </nav>
  );
}

function HostLogoNavSlot({
  logo,
  position,
}: {
  logo?: string;
  position: "left" | "right";
}) {
  return (
    <div
      className={
        position === "left"
          ? "hidden min-h-12 items-center sm:flex sm:justify-self-start"
          : "hidden min-h-12 items-center sm:flex sm:justify-self-end"
      }
    >
      {logo ? (
        <Image
          alt={`Host logo ${position}`}
          className="max-h-12 w-auto max-w-24 rounded-xl object-contain"
          height={48}
          src={logo}
          unoptimized
          width={96}
        />
      ) : null}
    </div>
  );
}
