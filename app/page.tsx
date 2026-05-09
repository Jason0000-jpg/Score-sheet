"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { AppNav } from "./components/AppNav";
import { EmptyState } from "./components/EmptyState";
import { LootInput, ScoreInput, ValueInput } from "./components/ScoreInputs";
import { SummaryStat } from "./components/SummaryStat";
import {
  EMPTY_SCORE,
  EMPTY_STATE_SNAPSHOT,
  createRaid,
  createTeam,
  currencyFormatter,
  getRaidScore,
  getScoreTotal,
  getStateSnapshot,
  parseState,
  saveState,
  subscribeToState,
  type AppState,
  type SavedRaid,
  type ScoreField,
  type ScoringValueField,
} from "./lib/score-state";

const readImageAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });

export default function Home() {
  const [teamName, setTeamName] = useState("");
  const [savedRaidIds, setSavedRaidIds] = useState<Record<string, boolean>>({});
  const stateSnapshot = useSyncExternalStore(
    subscribeToState,
    getStateSnapshot,
    () => EMPTY_STATE_SNAPSHOT,
  );
  const { teams, raids, scoringValues, savedRaids, hostLogos } = useMemo(
    () => parseState(stateSnapshot),
    [stateSnapshot],
  );

  const totals = useMemo(
    () =>
      raids.reduce(
        (matchTotals, raid) =>
          teams.reduce((raidTotals, team) => {
            const score = getRaidScore(raid, team.id);

            return {
              kills: raidTotals.kills + score.kills,
              reds: raidTotals.reds + score.reds,
              dogTags: raidTotals.dogTags + score.dogTags,
              extractedLoot: raidTotals.extractedLoot + score.extractedLoot,
              totalValue:
                raidTotals.totalValue + getScoreTotal(score, scoringValues),
            };
          }, matchTotals),
        { kills: 0, reds: 0, dogTags: 0, extractedLoot: 0, totalValue: 0 },
      ),
    [raids, scoringValues, teams],
  );

  const saveNextState = (updater: (state: AppState) => AppState) => {
    saveState(updater({ teams, raids, scoringValues, savedRaids, hostLogos }));
  };

  const markRaidUnsaved = (raidId: string) => {
    setSavedRaidIds((currentSavedRaidIds) =>
      currentSavedRaidIds[raidId]
        ? { ...currentSavedRaidIds, [raidId]: false }
        : currentSavedRaidIds,
    );
  };

  const handleAddTeam = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = teamName.trim();

    if (!trimmedName) {
      return;
    }

    const team = createTeam(trimmedName);

    saveNextState((currentState) => ({
      ...currentState,
      teams: [...currentState.teams, team],
      raids: currentState.raids.map((raid) => ({
        ...raid,
        scores: {
          ...raid.scores,
          [team.id]: { ...EMPTY_SCORE },
        },
      })),
    }));
    setSavedRaidIds({});
    setTeamName("");
  };

  const updateTeamName = (teamId: string, name: string) => {
    setSavedRaidIds({});
    saveNextState((currentState) => ({
      ...currentState,
      teams: currentState.teams.map((team) =>
        team.id === teamId ? { ...team, name } : team,
      ),
    }));
  };

  const removeTeam = (teamId: string) => {
    setSavedRaidIds({});
    saveNextState((currentState) => ({
      ...currentState,
      teams: currentState.teams.filter((team) => team.id !== teamId),
      raids: currentState.raids.map((raid) => {
        const scores = { ...raid.scores };
        delete scores[teamId];

        return { ...raid, scores };
      }),
    }));
  };

  const updateScoringValue = (field: ScoringValueField, value: number) => {
    setSavedRaidIds({});
    saveNextState((currentState) => ({
      ...currentState,
      scoringValues: {
        ...currentState.scoringValues,
        [field]: Math.max(0, value),
      },
    }));
  };

  const uploadHostLogos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 2);

    if (files.length === 0) {
      return;
    }

    const logos = await Promise.all(files.map((file) => readImageAsDataUrl(file)));

    saveNextState((currentState) => ({
      ...currentState,
      hostLogos: logos,
    }));
    event.target.value = "";
  };

  const clearHostLogos = () => {
    saveNextState((currentState) => ({
      ...currentState,
      hostLogos: [],
    }));
  };

  const addRaid = () => {
    saveNextState((currentState) => ({
      ...currentState,
      raids: [
        ...currentState.raids,
        createRaid(`Raid ${currentState.raids.length + 1}`, currentState.teams),
      ],
    }));
  };

  const updateRaidName = (raidId: string, name: string) => {
    markRaidUnsaved(raidId);
    saveNextState((currentState) => ({
      ...currentState,
      raids: currentState.raids.map((raid) =>
        raid.id === raidId ? { ...raid, name } : raid,
      ),
    }));
  };

  const removeRaid = (raidId: string) => {
    setSavedRaidIds((currentSavedRaidIds) => {
      const nextSavedRaidIds = { ...currentSavedRaidIds };
      delete nextSavedRaidIds[raidId];

      return nextSavedRaidIds;
    });
    saveNextState((currentState) => ({
      ...currentState,
      raids: currentState.raids.filter((raid) => raid.id !== raidId),
    }));
  };

  const resetRaid = (raidId: string) => {
    markRaidUnsaved(raidId);
    saveNextState((currentState) => ({
      ...currentState,
      raids: currentState.raids.map((raid) =>
        raid.id === raidId
          ? {
              ...raid,
              scores: Object.fromEntries(
                currentState.teams.map((team) => [team.id, { ...EMPTY_SCORE }]),
              ),
            }
          : raid,
      ),
    }));
  };

  const saveRaidScores = (raidId: string) => {
    const raid = raids.find((currentRaid) => currentRaid.id === raidId);

    if (!raid || savedRaidIds[raidId]) {
      return;
    }

    setSavedRaidIds((currentSavedRaidIds) => ({
      ...currentSavedRaidIds,
      [raidId]: true,
    }));

    const savedRaid: SavedRaid = {
      id: crypto.randomUUID(),
      raidName: raid.name,
      savedAt: new Date().toISOString(),
      scoringValues,
      teamScores: teams.map((team) => ({
        teamId: team.id,
        teamName: team.name,
        score: getRaidScore(raid, team.id),
      })),
    };

    saveNextState((currentState) => ({
      ...currentState,
      savedRaids: [savedRaid, ...currentState.savedRaids],
    }));
  };

  const updateRaidScore = (
    raidId: string,
    teamId: string,
    field: ScoreField,
    value: number,
  ) => {
    markRaidUnsaved(raidId);
    saveNextState((currentState) => ({
      ...currentState,
      raids: currentState.raids.map((raid) => {
        if (raid.id !== raidId) {
          return raid;
        }

        const score = getRaidScore(raid, teamId);

        return {
          ...raid,
          scores: {
            ...raid.scores,
            [teamId]: {
              ...score,
              [field]: Math.max(0, value),
            },
          },
        };
      }),
    }));
  };

  const adjustRaidScore = (
    raidId: string,
    teamId: string,
    field: ScoreField,
    amount: number,
  ) => {
    markRaidUnsaved(raidId);
    saveNextState((currentState) => ({
      ...currentState,
      raids: currentState.raids.map((raid) => {
        if (raid.id !== raidId) {
          return raid;
        }

        const score = getRaidScore(raid, teamId);

        return {
          ...raid,
          scores: {
            ...raid.scores,
            [teamId]: {
              ...score,
              [field]: Math.max(0, score[field] + amount),
            },
          },
        };
      }),
    }));
  };

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-0 max-sm:px-2.5 max-sm:pb-5">
      <AppNav hostLogos={hostLogos} />

      <section className="mb-6 grid gap-6">
        <div className="rounded-4xl border border-white/10 bg-[#101b2d]/85 p-11 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl max-lg:p-8">
          {hostLogos.length > 0 ? (
            <div className="mb-7 flex min-h-12 flex-wrap items-center justify-center gap-8">
              {hostLogos.map((logo, index) => (
                <Image
                  alt={`Host logo ${index + 1}`}
                  className="max-h-56 w-auto max-w-full rounded-3xl object-contain"
                  height={224}
                  key={logo}
                  unoptimized
                  src={logo}
                  width={420}
                />
              ))}
            </div>
          ) : null}
          <p className="mb-0 max-w-[620px] text-lg leading-8 text-[#95a3b8]">
            Set up your teams once, then create a separate score sheet for each
            raid with kills, reds, and extracted loot tracked per team.
          </p>
        </div>

        <div
          className="grid grid-cols-4 gap-3.5 rounded-4xl border border-white/10 bg-[#101b2d]/85 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl max-lg:grid-cols-2 max-sm:grid-cols-1"
          aria-label="Session totals"
        >
          <SummaryStat label="Teams" value={teams.length} />
          <SummaryStat label="Raids" value={raids.length} />
          <SummaryStat label="Total Kills" value={totals.kills} />
          <SummaryStat label="Total Reds" value={totals.reds} />
          <SummaryStat label="Dog Tags" value={totals.dogTags} />
          <SummaryStat
            label="Extracted Loot"
            value={currencyFormatter.format(totals.extractedLoot)}
          />
          <SummaryStat
            label="Score Total"
            value={currencyFormatter.format(totals.totalValue)}
          />
          {savedRaids.length > 0 ? (
            <Link
              className="flex items-center justify-center rounded-[1.4rem] bg-[#f6b23f] p-5 text-center font-black text-[#211406] transition hover:-translate-y-0.5 hover:brightness-110"
              href="/saved-raids"
            >
              View Saved Raids
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="flex cursor-not-allowed items-center justify-center rounded-[1.4rem] bg-white/20 p-5 text-center font-black text-white/55"
            >
              View Saved Raids
            </span>
          )}
        </div>
      </section>

      <section
        className="mb-8 grid grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)] items-end gap-6 rounded-[1.75rem] border border-white/10 bg-[#101b2d]/85 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl max-lg:grid-cols-1 max-sm:p-5"
        aria-labelledby="setup-title"
        id="setup"
      >
        <div>
          <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#ffcc66]">
            Setup
          </p>
          <h2
            className="mb-2 text-[clamp(1.6rem,3vw,2.35rem)] font-black tracking-[-0.04em]"
            id="setup-title"
          >
            Teams and raids
          </h2>
          <p className="mb-0 leading-7 text-[#95a3b8]">
            Add the competing teams, then create one raid sheet at a time. New
            teams are automatically added to every raid. Kill, red, and dog tag
            values are added to extracted loot for the final score total.
          </p>
          <div className="mt-5 grid gap-3 text-sm leading-6 text-[#95a3b8]">
            <p className="mb-0 rounded-2xl bg-white/5 p-4">
              <strong className="text-white">Host logos:</strong> upload one or
              two event/host images. They appear on saved score cards.
            </p>
            <p className="mb-0 rounded-2xl bg-white/5 p-4">
              <strong className="text-white">Score values:</strong> set how much
              each kill, red, and dog tag adds to the final total.
            </p>
            <p className="mb-0 rounded-2xl bg-white/5 p-4">
              <strong className="text-white">Teams and raids:</strong> add teams
              first, then create a raid sheet to start tracking scores.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="rounded-[1.25rem] bg-white/5.5 p-4">
            <div className="mb-3 flex items-start justify-between gap-3 max-sm:flex-col">
              <div>
                <p className="mb-1 text-sm font-extrabold uppercase tracking-[0.08em] text-[#95a3b8]">
                  Host logos
                </p>
                <p className="mb-0 text-sm leading-6 text-[#95a3b8]">
                  Upload one or two host logos. These are used on the saved
                  Scores page, not on teams.
                </p>
              </div>
              {hostLogos.length > 0 ? (
                <button
                  className="rounded-2xl border border-red-400/40 bg-red-400/10 px-4 py-2 font-extrabold text-red-100 transition hover:-translate-y-0.5 hover:brightness-110"
                  onClick={clearHostLogos}
                  type="button"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <label className="block cursor-pointer rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-4 text-center font-bold text-[#ffcc66] transition hover:bg-white/10">
              Upload Host Logo Images
              <input
                accept="image/*"
                className="sr-only"
                multiple
                onChange={uploadHostLogos}
                type="file"
              />
            </label>

            {hostLogos.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {hostLogos.map((logo, index) => (
                  <div
                    className="flex min-h-24 items-center justify-center rounded-2xl bg-[#080f1f] p-3"
                    key={logo}
                  >
                    <Image
                      alt={`Host logo ${index + 1}`}
                      className="max-h-20 w-auto max-w-full object-contain"
                      height={80}
                      unoptimized
                      src={logo}
                      width={160}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
            <ValueInput
              label="Value per kill"
              onChange={(value) => updateScoringValue("killValue", value)}
              value={scoringValues.killValue}
            />
            <ValueInput
              label="Value per red"
              onChange={(value) => updateScoringValue("redValue", value)}
              value={scoringValues.redValue}
            />
            <ValueInput
              label="Value per dog tag"
              onChange={(value) => updateScoringValue("dogTagValue", value)}
              value={scoringValues.dogTagValue}
            />
          </div>

          <form onSubmit={handleAddTeam}>
            <label
              className="mb-2 block text-sm font-extrabold uppercase tracking-[0.08em] text-[#95a3b8]"
              htmlFor="team-name"
            >
              Team name
            </label>
            <div className="flex gap-2.5 max-sm:flex-col">
              <input
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-white placeholder:text-white/45"
                id="team-name"
                name="team-name"
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Example: Team Alpha"
                type="text"
                value={teamName}
              />
              <button
                className="shrink-0 rounded-2xl bg-[#f6b23f] px-5 font-black text-[#211406] transition hover:-translate-y-0.5 hover:brightness-110 max-sm:min-h-12"
                type="submit"
              >
                Add Team
              </button>
            </div>
          </form>

          <button
            className="min-h-12 rounded-2xl bg-[#f6b23f] px-5 font-black text-[#211406] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            disabled={teams.length === 0}
            onClick={addRaid}
            type="button"
          >
            Create New Raid
          </button>
        </div>
      </section>

      {teams.length > 0 ? (
        <section className="mb-8" aria-labelledby="teams-title">
          <div className="mb-5">
            <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#ffcc66]">
              Teams
            </p>
            <h2
              className="mb-0 text-[clamp(1.6rem,3vw,2.35rem)] font-black tracking-[-0.04em]"
              id="teams-title"
            >
              Team list
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
            {teams.map((team) => (
              <div
                className="flex gap-2.5 rounded-[1.25rem] border border-white/10 bg-[#101b2d]/85 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl max-sm:flex-col"
                key={team.id}
              >
                <input
                  aria-label={`${team.name} name`}
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-lg font-black text-white"
                  onChange={(event) => updateTeamName(team.id, event.target.value)}
                  value={team.name}
                />
                <button
                  className="rounded-2xl border border-red-400/40 bg-red-400/10 px-4 font-extrabold text-red-100 transition hover:-translate-y-0.5 hover:brightness-110 max-sm:min-h-12"
                  onClick={() => removeTeam(team.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="raids-title" id="scores">
        <div className="mb-5 flex items-center justify-between gap-5 max-sm:flex-col max-sm:items-stretch">
          <div>
            <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#ffcc66]">
              Scores
            </p>
            <h2
              className="mb-0 text-[clamp(1.6rem,3vw,2.35rem)] font-black tracking-[-0.04em]"
              id="raids-title"
            >
              Raid score sheets
            </h2>
            <p className="mt-2 max-w-2xl leading-7 text-[#95a3b8]">
              Fill out each team&apos;s raid results. Kills, reds, and dog tags
              use the values from setup, then extracted loot is added for the
              final total.
            </p>
          </div>
          <Link
            className="rounded-2xl bg-[#f6b23f] px-5 py-3 text-center font-black text-[#211406] transition hover:-translate-y-0.5 hover:brightness-110"
            href="/saved-raids"
          >
            View Saved Raids
          </Link>
        </div>

        {teams.length === 0 ? (
          <EmptyState
            title="No teams yet"
            text="Add teams above before creating raid score sheets."
          />
        ) : raids.length === 0 ? (
          <EmptyState
            title="No raids yet"
            text="Create a raid to start scoring each team separately."
          />
        ) : (
          <div className="grid gap-6">
            {raids.map((raid) => {
              const raidTotals = teams.reduce(
                (currentTotals, team) => {
                  const score = getRaidScore(raid, team.id);

                  return {
                    kills: currentTotals.kills + score.kills,
                    reds: currentTotals.reds + score.reds,
                    dogTags: currentTotals.dogTags + score.dogTags,
                    extractedLoot:
                      currentTotals.extractedLoot + score.extractedLoot,
                    totalValue:
                      currentTotals.totalValue + getScoreTotal(score, scoringValues),
                  };
                },
                { kills: 0, reds: 0, dogTags: 0, extractedLoot: 0, totalValue: 0 },
              );
              const isRaidSaved = savedRaidIds[raid.id];

              return (
                <article
                  className="rounded-[1.75rem] border border-white/10 bg-[#101b2d]/85 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl max-sm:p-4"
                  key={raid.id}
                >
                  <div className="mb-4 grid grid-cols-3 gap-3 text-sm leading-6 text-[#95a3b8] max-lg:grid-cols-1">
                    <p className="mb-0 rounded-2xl bg-white/5 p-4">
                      <strong className="text-white">Counts:</strong> enter how
                      many kills, reds, and dog tags each team earned.
                    </p>
                    <p className="mb-0 rounded-2xl bg-white/5 p-4">
                      <strong className="text-white">Loot:</strong> type the
                      extracted loot amount manually for that team.
                    </p>
                    <p className="mb-0 rounded-2xl bg-white/5 p-4">
                      <strong className="text-white">Save:</strong> save the
                      raid when it is final to send it to the Scores grid.
                    </p>
                  </div>

                  <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3 max-md:grid-cols-1">
                    <input
                      aria-label={`${raid.name} name`}
                      className="min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-2xl font-black text-white"
                      onChange={(event) =>
                        updateRaidName(raid.id, event.target.value)
                      }
                      value={raid.name}
                    />
                    <div className="flex gap-2.5 max-sm:flex-col">
                      <button
                        className="rounded-2xl bg-[#f6b23f] px-4 font-black text-[#211406] transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:bg-emerald-400 disabled:text-emerald-950 disabled:hover:translate-y-0 disabled:hover:brightness-100 max-sm:min-h-12"
                        disabled={isRaidSaved}
                        onClick={() => saveRaidScores(raid.id)}
                        type="button"
                      >
                        {isRaidSaved ? "Saved" : "Save Raid Scores"}
                      </button>
                      <button
                        className="rounded-2xl bg-[#f6b23f] px-4 font-black text-[#211406] transition hover:-translate-y-0.5 hover:brightness-110 max-sm:min-h-12"
                        onClick={() => resetRaid(raid.id)}
                        type="button"
                      >
                        Reset Raid
                      </button>
                      <button
                        className="rounded-2xl border border-red-400/40 bg-red-400/10 px-4 font-extrabold text-red-100 transition hover:-translate-y-0.5 hover:brightness-110 max-sm:min-h-12"
                        onClick={() => removeRaid(raid.id)}
                        type="button"
                      >
                        Remove Raid
                      </button>
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-3 gap-3 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(190px,1.35fr)_minmax(190px,1.35fr)] max-md:grid-cols-1">
                    <SummaryStat label="Raid Kills" value={raidTotals.kills} />
                    <SummaryStat label="Raid Reds" value={raidTotals.reds} />
                    <SummaryStat label="Dog Tags" value={raidTotals.dogTags} />
                    <SummaryStat
                      label="Raid Loot"
                      value={currencyFormatter.format(raidTotals.extractedLoot)}
                    />
                    <SummaryStat
                      label="Raid Total"
                      value={currencyFormatter.format(raidTotals.totalValue)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
                    {teams.map((team) => {
                      const score = getRaidScore(raid, team.id);
                      const scoreTotal = getScoreTotal(score, scoringValues);

                      return (
                        <div
                          className="rounded-[1.25rem] bg-white/5.5 p-4"
                          key={`${raid.id}-${team.id}`}
                        >
                          <h3 className="mb-4 text-xl font-black">{team.name}</h3>
                          <div className="grid gap-4">
                            <ScoreInput
                              label="Kills"
                              onAdjust={(amount) =>
                                adjustRaidScore(raid.id, team.id, "kills", amount)
                              }
                              onChange={(value) =>
                                updateRaidScore(raid.id, team.id, "kills", value)
                              }
                              value={score.kills}
                            />
                            <ScoreInput
                              label="Reds"
                              onAdjust={(amount) =>
                                adjustRaidScore(raid.id, team.id, "reds", amount)
                              }
                              onChange={(value) =>
                                updateRaidScore(raid.id, team.id, "reds", value)
                              }
                              value={score.reds}
                            />
                            <ScoreInput
                              label="Dog Tags"
                              onAdjust={(amount) =>
                                adjustRaidScore(
                                  raid.id,
                                  team.id,
                                  "dogTags",
                                  amount,
                                )
                              }
                              onChange={(value) =>
                                updateRaidScore(
                                  raid.id,
                                  team.id,
                                  "dogTags",
                                  value,
                                )
                              }
                              value={score.dogTags}
                            />
                            <LootInput
                              onChange={(value) =>
                                updateRaidScore(
                                  raid.id,
                                  team.id,
                                  "extractedLoot",
                                  value,
                                )
                              }
                              value={score.extractedLoot}
                            />
                            <SummaryStat
                              label="Team Total"
                              value={currencyFormatter.format(scoreTotal)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

