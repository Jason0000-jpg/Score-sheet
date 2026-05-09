import Image from "next/image";
import {
  currencyFormatter,
  getScoreTotal,
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
  const raidTotals = raid.teamScores.reduce(
    (totals, teamScore) => ({
      kills: totals.kills + teamScore.score.kills,
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

  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-[#101b2d]/85 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-base font-extrabold text-[#95a3b8]">
            Saved {formatSavedDate(raid.savedAt)}
          </p>
          <h2 className="mb-0 text-3xl font-black tracking-[-0.04em]">
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
          const killValue = teamScore.score.kills * raid.scoringValues.killValue;
          const redValue = teamScore.score.reds * raid.scoringValues.redValue;
          const dogTagValue =
            (teamScore.score.dogTags ?? 0) * raid.scoringValues.dogTagValue;
          const total = getScoreTotal(teamScore.score, raid.scoringValues);

          return (
            <div
              className="rounded-[1.25rem] bg-white/5.5 p-4"
              key={`${raid.id}-${teamScore.teamId}`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="mb-0 text-lg font-black">{teamScore.teamName}</h3>
                <strong className="text-xl text-[#ffcc66]">
                  {currencyFormatter.format(total)}
                </strong>
              </div>
              <div className="grid grid-cols-4 gap-3 text-base font-semibold text-[#95a3b8] max-sm:grid-cols-2">
                <span>
                  Kills: {teamScore.score.kills} (
                  {currencyFormatter.format(killValue)})
                </span>
                <span>
                  Reds: {teamScore.score.reds} ({currencyFormatter.format(redValue)}
                  )
                </span>
                <span>
                  Dog Tags: {teamScore.score.dogTags ?? 0} (
                  {currencyFormatter.format(dogTagValue)})
                </span>
                <span>
                  Loot: {currencyFormatter.format(teamScore.score.extractedLoot)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function formatSavedDate(savedAt: string) {
  const savedDate = new Date(savedAt);

  return Number.isNaN(savedDate.getTime())
    ? "unknown date"
    : dateFormatter.format(savedDate);
}
