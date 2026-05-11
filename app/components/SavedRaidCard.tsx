"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  currencyFormatter,
  getScoreTotal,
  getTeamKills,
  type SavedRaid,
} from "../lib/score-state";
import { SummaryStat } from "./SummaryStat";

type SavedRaidCardProps = {
  hostLogos: string[];
  raid: SavedRaid;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function SavedRaidCard({ hostLogos, raid }: SavedRaidCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const raidTotals = raid.teamScores.reduce(
    (totals, teamScore) => ({
      kills: totals.kills + getTeamKills(teamScore.score),
      reds: totals.reds + teamScore.score.reds,
      dogTags: totals.dogTags + (teamScore.score.dogTags ?? 0),
      extractedLoot: totals.extractedLoot + teamScore.score.extractedLoot,
      totalValue:
        totals.totalValue + getScoreTotal(teamScore.score, raid.scoringValues),
    }),
    { kills: 0, reds: 0, dogTags: 0, extractedLoot: 0, totalValue: 0 },
  );
  const raidKillValue = raidTotals.kills * raid.scoringValues.killValue;
  const raidRedValue = raidTotals.reds * raid.scoringValues.redValue;
  const raidDogTagValue = raidTotals.dogTags * raid.scoringValues.dogTagValue;
  const raidDetailsId = `saved-raid-details-${raid.id}`;
  const handleSaveImage = async () => {
    if (!cardRef.current || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const imageDataUrl = await toPng(cardRef.current, {
        backgroundColor: "#050505",
        cacheBust: true,
        filter: (node) =>
          !(node instanceof HTMLElement && node.dataset.exportHidden === "true"),
        pixelRatio: 2,
      });
      const downloadLink = document.createElement("a");
      const fileName =
        raid.raidName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "saved-raid";

      downloadLink.download = `${fileName}.png`;
      downloadLink.href = imageDataUrl;
      downloadLink.click();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid gap-3">
    <article
      className="rounded-[1.75rem] border border-white/10 bg-[#101b2d]/85 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl"
      ref={cardRef}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-base font-extrabold text-[#95a3b8]">
            Saved {formatSavedDate(raid.savedAt)}
          </p>
          <h2 className="mb-0 text-6xl font-black tracking-[-0.04em]">
            {raid.raidName}
          </h2>
        </div>

        {hostLogos.length > 0 ? (
          <div className="flex shrink-0 gap-2">
            {hostLogos.slice(0, 2).map((logo, index) => (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#080f1f] p-2"
                key={logo}
              >
                <Image
                  alt={`Host logo ${index + 1}`}
                  className="max-h-12 w-auto max-w-full rounded-xl object-contain"
                  height={48}
                  unoptimized
                  src={logo}
                  width={96}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <button
        aria-controls={raidDetailsId}
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? "Show saved raid details" : "Hide saved raid details"}
        className="mx-auto mb-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/65 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
        data-export-hidden="true"
        onClick={() => setIsCollapsed((currentIsCollapsed) => !currentIsCollapsed)}
        type="button"
      >
        <svg
          aria-hidden="true"
          className={
            isCollapsed
              ? "h-4 w-4 rotate-180 transition-transform"
              : "h-4 w-4 transition-transform"
          }
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M6 15l6-6 6 6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        </svg>
      </button>

      <div
        className={
          isCollapsed
            ? "grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-in-out"
            : "grid grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity] duration-300 ease-in-out"
        }
        id={raidDetailsId}
      >
        <div className="overflow-hidden">
          <div className="mb-5 grid grid-cols-2 gap-3">
            <SummaryStat
              detail={currencyFormatter.format(raidKillValue)}
              label="Total Raid Kills"
              value={raidTotals.kills}
            />
            <SummaryStat
              detail={currencyFormatter.format(raidRedValue)}
              label="Total Raid Reds"
              value={raidTotals.reds}
            />
            <SummaryStat
              detail={currencyFormatter.format(raidDogTagValue)}
              label="Total Raid Dog Tags"
              value={raidTotals.dogTags}
            />
            <SummaryStat
              label="Total Raid Loot"
              value={currencyFormatter.format(raidTotals.extractedLoot)}
            />
            <SummaryStat
              label="Total Raid Score"
              value={currencyFormatter.format(raidTotals.totalValue)}
            />
          </div>

          <div className="grid gap-3">
            {raid.teamScores.map((teamScore) => {
              const killValue =
                getTeamKills(teamScore.score) * raid.scoringValues.killValue;
              const redValue = teamScore.score.reds * raid.scoringValues.redValue;
              const dogTagValue =
                (teamScore.score.dogTags ?? 0) * raid.scoringValues.dogTagValue;
              const total = getScoreTotal(teamScore.score, raid.scoringValues);

              return (
                <div
                  className="rounded-[1.25rem] bg-white/5.5 p-4"
                  key={`${raid.id}-${teamScore.teamId}`}
                >
                  <div className="mb-10 flex items-center justify-between gap-3">
                    <h3 className="mb-0 text-3xl font-black">
                      {teamScore.teamName}
                    </h3>
                    <strong className="text-3xl text-green-400">
                      {currencyFormatter.format(total)}
                    </strong>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-base font-semibold text-[#95a3b8] max-sm:grid-cols-2">
                    <span>
                      Kills: {getTeamKills(teamScore.score)} (
                      <span className="text-green-400">
                        {currencyFormatter.format(killValue)}
                      </span>
                      )
                    </span>
                    <span>
                      Reds: {teamScore.score.reds} (
                      <span className="text-green-400">
                        {currencyFormatter.format(redValue)}
                      </span>
                      )
                    </span>
                    <span>
                      Dog Tags: {teamScore.score.dogTags ?? 0} (
                      <span className="text-green-400">
                        {currencyFormatter.format(dogTagValue)}
                      </span>
                      )
                    </span>
                    <span>
                      Loot:{" "}
                      <span className="text-green-400">
                        {currencyFormatter.format(teamScore.score.extractedLoot)}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
              </div>
      </div>
    </article>
      <button
        className="justify-self-end rounded-2xl bg-white px-5 py-3 font-black text-[#211406] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={isExporting}
        onClick={handleSaveImage}
        type="button"
      >
        {isExporting ? "Saving..." : "Save as Image"}
      </button>
    </div>
  );
}

function formatSavedDate(savedAt: string) {
  const savedDate = new Date(savedAt);

  return Number.isNaN(savedDate.getTime())
    ? "unknown date"
    : dateFormatter.format(savedDate);
}
