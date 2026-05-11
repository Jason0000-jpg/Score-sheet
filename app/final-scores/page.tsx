"use client";

import Image from "next/image";
import { Fragment, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toPng } from "html-to-image";
import { AppNav } from "../components/AppNav";
import { EmptyState } from "../components/EmptyState";
import {
  EMPTY_SCORE,
  EMPTY_STATE_SNAPSHOT,
  currencyFormatter,
  getScoreTotal,
  getStateSnapshot,
  getTeamKills,
  parseState,
  subscribeToState,
  type SavedRaid,
  type SavedRaidScore,
  type TeamScore,
} from "../lib/score-state";

type TeamFinalScore = {
  teamId: string;
  teamName: string;
  totalValue: number;
};

type PlayerKillTotal = {
  kills: number;
  playerName: string;
};

type TeamKillLeaderboard = {
  players: PlayerKillTotal[];
  totalKills: number;
  teamId: string;
  teamName: string;
};

const getTeamScore = (raid: SavedRaid, teamId: string): SavedRaidScore => {
  const savedTeamScore = raid.teamScores.find(
    (teamScore) => teamScore.teamId === teamId,
  );

  return (
    savedTeamScore ?? {
      teamId,
      teamName: "",
      score: EMPTY_SCORE,
    }
  );
};

const getTeamRaidTotal = (raid: SavedRaid, teamId: string) =>
  getScoreTotal(getTeamScore(raid, teamId).score, raid.scoringValues);

const sumScores = (scores: TeamScore[]) =>
  scores.reduce(
    (totals, score) => ({
      kills: totals.kills + getTeamKills(score),
      playerKills: {},
      reds: totals.reds + score.reds,
      dogTags: totals.dogTags + score.dogTags,
      extractedLoot: totals.extractedLoot + score.extractedLoot,
    }),
    { ...EMPTY_SCORE },
  );

const formatOrdinal = (rank: number) => {
  const rankMod100 = rank % 100;

  if (rankMod100 >= 11 && rankMod100 <= 13) {
    return `${rank}th`;
  }

  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
};

export default function FinalScoresPage() {
  const finalScoresRef = useRef<HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const stateSnapshot = useSyncExternalStore(
    subscribeToState,
    getStateSnapshot,
    () => EMPTY_STATE_SNAPSHOT,
  );
  const { teams, savedRaids, hostLogos } = useMemo(
    () => parseState(stateSnapshot),
    [stateSnapshot],
  );
  const raids = useMemo(() => [...savedRaids].reverse(), [savedRaids]);
  const finalTeams = useMemo<TeamFinalScore[]>(() => {
    const teamsById = new Map<string, TeamFinalScore>();

    teams.forEach((team) => {
      teamsById.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        totalValue: 0,
      });
    });

    raids.forEach((raid) => {
      raid.teamScores.forEach((teamScore) => {
        const existingTeam = teamsById.get(teamScore.teamId);

        teamsById.set(teamScore.teamId, {
          teamId: teamScore.teamId,
          teamName: existingTeam?.teamName || teamScore.teamName,
          totalValue:
            (existingTeam?.totalValue ?? 0) +
            getScoreTotal(teamScore.score, raid.scoringValues),
        });
      });
    });

    return Array.from(teamsById.values())
      .filter((team) =>
        raids.some((raid) =>
          raid.teamScores.some((score) => score.teamId === team.teamId),
        ),
      )
      .sort(
        (firstTeam, secondTeam) =>
          secondTeam.totalValue - firstTeam.totalValue ||
          firstTeam.teamName.localeCompare(secondTeam.teamName),
      );
  }, [raids, teams]);
  const grandTotal = finalTeams.reduce(
    (totalValue, team) => totalValue + team.totalValue,
    0,
  );
  const highestTeamTotal = finalTeams.reduce(
    (highestTotal, team) => Math.max(highestTotal, team.totalValue),
    0,
  );
  const teamRanks = useMemo(() => {
    const sortedTotals = Array.from(
      new Set(finalTeams.map((team) => team.totalValue)),
    ).sort((firstTotal, secondTotal) => secondTotal - firstTotal);

    return new Map(
      finalTeams.map((team) => [
        team.teamId,
        sortedTotals.findIndex((totalValue) => totalValue === team.totalValue) + 1,
      ]),
    );
  }, [finalTeams]);
  const killLeaderboards = useMemo<TeamKillLeaderboard[]>(() => {
    const playerNamesByTeamId = new Map<string, Map<string, string>>();

    teams.forEach((team) => {
      playerNamesByTeamId.set(
        team.id,
        new Map(team.players.map((player) => [player.id, player.name])),
      );
    });

    return finalTeams.map((team) => {
      const playerKills = new Map<string, number>();

      raids.forEach((raid) => {
        const score = getTeamScore(raid, team.teamId).score;

        Object.entries(score.playerKills ?? {}).forEach(([playerId, kills]) => {
          playerKills.set(playerId, (playerKills.get(playerId) ?? 0) + kills);
        });
      });

      const players = Array.from(playerKills.entries())
        .map(([playerId, kills]) => ({
          kills,
          playerName:
            playerNamesByTeamId.get(team.teamId)?.get(playerId) || "Unknown player",
        }))
        .sort(
          (firstPlayer, secondPlayer) =>
            secondPlayer.kills - firstPlayer.kills ||
            firstPlayer.playerName.localeCompare(secondPlayer.playerName),
        );

      return {
        players,
        totalKills: players.reduce(
          (totalKills, player) => totalKills + player.kills,
          0,
        ),
        teamId: team.teamId,
        teamName: team.teamName,
      };
    });
  }, [finalTeams, raids, teams]);
  const overallKillLeaders = useMemo(() => {
    const allPlayers = killLeaderboards.flatMap((leaderboard) =>
      leaderboard.players.map((player) => ({
        ...player,
        teamName: leaderboard.teamName,
      })),
    );
    const highestKills = Math.max(...allPlayers.map((player) => player.kills), 0);

    return allPlayers
      .filter((player) => player.kills === highestKills && highestKills > 0)
      .sort(
        (firstPlayer, secondPlayer) =>
          firstPlayer.playerName.localeCompare(secondPlayer.playerName) ||
          firstPlayer.teamName.localeCompare(secondPlayer.teamName),
      );
  }, [killLeaderboards]);
  const handleSaveImage = async () => {
    const finalScoresElement = finalScoresRef.current;

    if (!finalScoresElement || isExporting) {
      return;
    }

    setIsExporting(true);

    const exportExpandElements = Array.from(
      finalScoresElement.querySelectorAll<HTMLElement>("[data-export-expand]"),
    );
    const originalFinalScoresWidth = finalScoresElement.style.width;
    const originalFinalScoresMaxWidth = finalScoresElement.style.maxWidth;
    const originalExpandStyles = exportExpandElements.map((element) => ({
      element,
      overflow: element.style.overflow,
      overflowX: element.style.overflowX,
    }));

    try {
      exportExpandElements.forEach((element) => {
        element.style.overflow = "visible";
        element.style.overflowX = "visible";
      });

      const finalScoresStyles = window.getComputedStyle(finalScoresElement);
      const horizontalInset =
        parseFloat(finalScoresStyles.paddingLeft) +
        parseFloat(finalScoresStyles.paddingRight) +
        parseFloat(finalScoresStyles.borderLeftWidth) +
        parseFloat(finalScoresStyles.borderRightWidth);
      const exportWidth = Math.max(
        finalScoresElement.offsetWidth,
        finalScoresElement.scrollWidth,
        ...exportExpandElements.map((element) => element.scrollWidth + horizontalInset),
      );

      finalScoresElement.style.width = `${Math.ceil(exportWidth)}px`;
      finalScoresElement.style.maxWidth = "none";

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const exportBounds = finalScoresElement.getBoundingClientRect();
      const imageDataUrl = await toPng(finalScoresElement, {
        backgroundColor: "#050505",
        cacheBust: true,
        height: Math.ceil(exportBounds.height),
        pixelRatio: 2,
        style: {
          margin: "0",
        },
        width: Math.ceil(exportBounds.width),
      });
      const downloadLink = document.createElement("a");

      downloadLink.download = "final-scores.png";
      downloadLink.href = imageDataUrl;
      downloadLink.click();
    } finally {
      finalScoresElement.style.width = originalFinalScoresWidth;
      finalScoresElement.style.maxWidth = originalFinalScoresMaxWidth;
      originalExpandStyles.forEach(({ element, overflow, overflowX }) => {
        element.style.overflow = overflow;
        element.style.overflowX = overflowX;
      });
      setIsExporting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[2200px] px-4 pb-12 pt-0 max-sm:px-2.5 max-sm:pb-5">
      <AppNav hostLogos={hostLogos} />


      {raids.length === 0 ? (
        <EmptyState
          text="Save raids from the tracking page before viewing final scores."
          title="No saved raids yet"
        />
      ) : (
        <>
        <div className="mt-16">
          <section
            className="rounded-[1.75rem] border border-white/10 bg-[#101b2d]/85 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl"
            ref={finalScoresRef}
          >
          <div className="mb-4 grid gap-2 rounded-2xl bg-white/5 p-4 text-sm font-bold text-[#95a3b8] sm:grid-cols-3">
            <span>Total raids: {raids.length}</span>
            <span>Total Teams: {finalTeams.length}</span>
          </div>

          <div
            className="overflow-x-auto rounded-2xl border border-white/10"
            data-export-expand
          >
            <table className="w-full min-w-[1600px] table-fixed border-separate border-spacing-0 text-left text-xs">
              <colgroup>
                <col className="w-[118px]" />
                {raids.map((raid) => (
                  <Fragment key={`columns-${raid.id}`}>
                    <col className="w-[30px]" />
                    <col className="w-[30px]" />
                    <col className="w-[30px]" />
                    <col className="w-[92px]" />
                    <col className="w-[92px]" />
                  </Fragment>
                ))}
                <col className="w-[110px]" />
              </colgroup>
              <thead>
                <tr>
                  <th
                    className="sticky left-0 z-20 border-b border-r border-white/10 bg-[#111111] px-2 py-2.5 text-sm font-black text-white"
                    rowSpan={2}
                  >
                    Team
                  </th>
                  {raids.map((raid) => (
                    <th
                      className="border-b border-r border-white/10 bg-white/10 px-2 py-2.5 text-center text-sm font-black text-white"
                      colSpan={5}
                      key={raid.id}
                    >
                      {raid.raidName}
                    </th>
                  ))}
                  <th
                    className="border-b border-white/10 bg-green-400/20 px-2 py-2.5 text-center text-sm font-black text-green-200"
                    rowSpan={2}
                  >
                    Final Total
                  </th>
                </tr>
                <tr>
                  {raids.flatMap((raid) =>
                    ["K", "R", "T", "Loot", "Total"].map((label) => (
                      <th
                        className="border-b border-r border-white/10 bg-white/5 px-1 py-1.5 text-center text-[0.65rem] font-extrabold text-[#95a3b8]"
                        key={`${raid.id}-${label}`}
                      >
                        {label}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {finalTeams.map((team) => {
                  const isWinningTeam =
                    highestTeamTotal > 0 && team.totalValue === highestTeamTotal;
                  const teamRank = teamRanks.get(team.teamId) ?? finalTeams.length;

                  return (
                  <tr key={team.teamId}>
                    <th
                      className={
                        isWinningTeam
                          ? "sticky left-0 z-10 border-b border-r border-green-400/50 bg-green-400/20 px-2 py-2 text-[0.72rem] font-black text-green-100"
                          : "sticky left-0 z-10 border-b border-r border-white/10 bg-[#111111] px-2 py-2 text-[0.72rem] font-black text-white"
                      }
                    >
                      {team.teamName}
                      <span
                        className={
                          isWinningTeam
                            ? "ml-1.5 rounded-full bg-green-400 px-1.5 py-0.5 text-[0.65rem] font-black text-[#071507]"
                            : "ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[0.65rem] font-black text-[#95a3b8]"
                        }
                      >
                        {formatOrdinal(teamRank)}
                      </span>
                    </th>
                    {raids.map((raid) => {
                      const teamScore = getTeamScore(raid, team.teamId).score;
                      const scoreTotal = getScoreTotal(teamScore, raid.scoringValues);

                      return (
                        <Fragment key={`${team.teamId}-${raid.id}`}>
                          <ScoreCell value={getTeamKills(teamScore)} />
                          <ScoreCell value={teamScore.reds} />
                          <ScoreCell value={teamScore.dogTags} />
                          <ScoreCell
                            value={currencyFormatter.format(teamScore.extractedLoot)}
                          />
                          <ScoreCell
                            isTotal
                            value={currencyFormatter.format(scoreTotal)}
                          />
                        </Fragment>
                      );
                    })}
                    <td
                      className={
                        isWinningTeam
                          ? "border-b border-green-400/50 bg-green-400/25 px-2 py-2 text-right text-[0.72rem] font-black text-green-100 shadow-[inset_0_0_0_1px_rgba(74,222,128,0.25)]"
                          : "border-b border-white/10 bg-green-400/10 px-2 py-2 text-right text-[0.72rem] font-black text-green-300"
                      }
                    >
                      {currencyFormatter.format(team.totalValue)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
            

            {overallKillLeaders.length > 0 ? (
              <article className="mb-5 rounded-3xl border border-green-400/40 bg-green-400/10 p-6">
                <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-green-200">
                  {overallKillLeaders.length > 1
                    ? "Overall Kill Leaders"
                    : "Overall Kill Leader"}
                </p>
                <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(160px,auto)_minmax(0,1fr)]">
                  <div>
                    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                      {overallKillLeaders.map((leader, leaderIndex) => (
                        <div
                          className="flex items-end gap-6"
                          key={`${leader.teamName}-${leader.playerName}`}
                        >
                        {leaderIndex > 0 ? (
                          <span className="pb-8 text-[clamp(2.2rem,5vw,4.5rem)] font-black leading-none text-green-400/60">
                            /
                          </span>
                        ) : null}
                        <div>
                          <h3 className="mb-1 text-[clamp(2.2rem,5vw,4.5rem)] font-black leading-none tracking-[-0.06em] text-white">
                            {leader.playerName}
                          </h3>
                          <p className="mb-0 text-lg font-bold text-[#95a3b8]">
                            {leader.teamName}
                          </p>
                        </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    {hostLogos.length > 0 ? (
                      <>
                      {hostLogos.slice(0, 2).map((logo, index) => (
                        <div
                          className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#080f1f] p-2 shadow-[0_14px_40px_rgba(0,0,0,0.28)]"
                          key={logo}
                        >
                          <Image
                            alt={`Host logo ${index + 1}`}
                            className="max-h-16 w-auto max-w-full rounded-xl object-contain"
                            height={64}
                            unoptimized
                            src={logo}
                            width={128}
                          />
                        </div>
                      ))}
                      </>
                    ) : null}
                  </div>
                  <div className="justify-self-end text-right max-sm:justify-self-start max-sm:text-left">
                    <strong className="block text-[clamp(3rem,7vw,6rem)] font-black leading-none text-green-400">
                      {overallKillLeaders[0].kills}
                    </strong>
                    <span className="text-sm font-extrabold uppercase tracking-[0.14em] text-green-200">
                      {overallKillLeaders.length > 1 ? "Kills Each" : "Kills"}
                    </span>
                  </div>
                </div>
              </article>
            ) : null}
            <div className="mb-4">
              <h2 className="mb-0 text-2xl font-black tracking-[-0.04em]">
                Player kill totals by team
              </h2>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {killLeaderboards.map((leaderboard) => (
                <article
                  className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]"
                  key={leaderboard.teamId}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_72px] border-b border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white">
                    <span>{leaderboard.teamName}</span>
                    <span className="text-right">Kills</span>
                  </div>

                  {leaderboard.players.length === 0 ? (
                    <p className="mb-0 px-4 py-3 text-sm font-bold text-[#95a3b8]">
                      No player kills captured.
                    </p>
                  ) : (
                    <div>
                      {leaderboard.players.map((player) => (
                        <div
                          className="grid grid-cols-[minmax(0,1fr)_72px] border-b border-white/5 px-4 py-2 text-sm"
                          key={player.playerName}
                        >
                          <span className="font-bold text-white">
                            {player.playerName}
                          </span>
                          <span className="text-right font-black text-green-400">
                            {player.kills}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-[minmax(0,1fr)_72px] bg-green-400/10 px-4 py-3 text-sm font-black text-green-300">
                    <span>Total</span>
                    <span className="text-right">{leaderboard.totalKills}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
          </section>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="rounded-2xl bg-white px-5 py-3 font-black text-[#211406] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
            disabled={isExporting}
            onClick={handleSaveImage}
            type="button"
          >
            {isExporting ? "Saving..." : "Save Final Scores as Image"}
          </button>
        </div>
        </>
      )}
    </main>
  );
}

function ScoreCell({
  isTotal = false,
  value,
}: {
  isTotal?: boolean;
  value: number | string;
}) {
  return (
    <td
      className={
        isTotal
          ? "border-b border-r border-white/10 bg-white/10 px-1 py-2 text-right text-[0.68rem] font-black tabular-nums text-green-400"
          : "border-b border-r border-white/10 bg-white/5 px-1 py-2 text-right text-[0.68rem] font-semibold tabular-nums text-white"
      }
    >
      {value}
    </td>
  );
}
