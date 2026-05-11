export type Player = {
  id: string;
  name: string;
};

export type Team = {
  id: string;
  name: string;
  players: Player[];
};

export type TeamScore = {
  kills: number;
  playerKills: Record<string, number>;
  reds: number;
  dogTags: number;
  extractedLoot: number;
};

export type Raid = {
  id: string;
  name: string;
  scores: Record<string, TeamScore>;
};

export type ScoringValues = {
  killValue: number;
  redValue: number;
  dogTagValue: number;
};

export type SavedRaidScore = {
  teamId: string;
  teamName: string;
  score: TeamScore;
};

export type SavedRaid = {
  id: string;
  sourceRaidId?: string;
  raidName: string;
  savedAt: string;
  scoringValues: ScoringValues;
  teamScores: SavedRaidScore[];
};

export type AppState = {
  teams: Team[];
  raids: Raid[];
  scoringValues: ScoringValues;
  savedRaids: SavedRaid[];
  hostLogos: string[];
};

export type ScoreField = Exclude<keyof TeamScore, "playerKills">;
export type ScoringValueField = keyof ScoringValues;

export const EMPTY_SCORE: TeamScore = {
  kills: 0,
  playerKills: {},
  reds: 0,
  dogTags: 0,
  extractedLoot: 0,
};

export const DEFAULT_SCORING_VALUES: ScoringValues = {
  killValue: 0,
  redValue: 0,
  dogTagValue: 0,
};

export const EMPTY_STATE: AppState = {
  teams: [],
  raids: [],
  scoringValues: DEFAULT_SCORING_VALUES,
  savedRaids: [],
  hostLogos: [],
};

export const EMPTY_STATE_SNAPSHOT = JSON.stringify(EMPTY_STATE);
export const STORAGE_KEY = "abi-score-sheet-state";
export const LEGACY_STORAGE_KEY = "abi-score-sheet-teams";
export const STORAGE_EVENT = "abi-score-sheet-state-change";

export const currencyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export const createTeam = (name: string): Team => ({
  id: crypto.randomUUID(),
  name,
  players: [],
});

export const createRaid = (name: string, teams: Team[]): Raid => ({
  id: crypto.randomUUID(),
  name,
  scores: Object.fromEntries(
    teams.map((team) => [
      team.id,
      {
        ...EMPTY_SCORE,
        playerKills: Object.fromEntries(
          team.players.map((player) => [player.id, 0]),
        ),
      },
    ]),
  ),
});

export const getRaidScore = (raid: Raid, teamId: string) => ({
  ...EMPTY_SCORE,
  ...raid.scores[teamId],
  playerKills: {
    ...EMPTY_SCORE.playerKills,
    ...raid.scores[teamId]?.playerKills,
  },
});

export const getTeamKills = (score: TeamScore) => {
  const playerKillValues = Object.values(score.playerKills ?? {});

  return playerKillValues.length > 0
    ? playerKillValues.reduce((totalKills, kills) => totalKills + kills, 0)
    : score.kills;
};

export const getScoreTotal = (
  score: TeamScore,
  scoringValues: ScoringValues,
) =>
  score.extractedLoot +
  getTeamKills(score) * scoringValues.killValue +
  score.reds * scoringValues.redValue +
  score.dogTags * scoringValues.dogTagValue;

export const parseAmountInput = (value: string) => {
  const digitsOnly = value.replace(/\D/g, "");

  return digitsOnly ? Number(digitsOnly) : 0;
};

const normalizePlayer = (player: Partial<Player>, index: number): Player => ({
  id: typeof player.id === "string" && player.id ? player.id : `player-${index}`,
  name: typeof player.name === "string" ? player.name : "",
});

const normalizeTeam = (team: Partial<Team>, index: number): Team => ({
  id: typeof team.id === "string" && team.id ? team.id : `team-${index}`,
  name: typeof team.name === "string" ? team.name : "",
  players: Array.isArray(team.players)
    ? team.players.map((player, playerIndex) =>
        typeof player === "string"
          ? normalizePlayer({ name: player }, playerIndex)
          : normalizePlayer(player as Partial<Player>, playerIndex),
      )
    : [],
});

const normalizeScore = (score: Partial<TeamScore> | undefined): TeamScore => ({
  kills: score?.kills ?? 0,
  playerKills:
    score?.playerKills && typeof score.playerKills === "object"
      ? score.playerKills
      : {},
  reds: score?.reds ?? 0,
  dogTags: score?.dogTags ?? 0,
  extractedLoot: score?.extractedLoot ?? 0,
});

const normalizeRaid = (raid: Partial<Raid>, index: number): Raid => ({
  id: typeof raid.id === "string" && raid.id ? raid.id : `raid-${index}`,
  name: typeof raid.name === "string" ? raid.name : `Raid ${index + 1}`,
  scores:
    raid.scores && typeof raid.scores === "object"
      ? Object.fromEntries(
          Object.entries(raid.scores).map(([teamId, score]) => [
            teamId,
            normalizeScore(score as Partial<TeamScore>),
          ]),
        )
      : {},
});

const normalizeSavedRaidScore = (
  teamScore: Partial<SavedRaidScore>,
  index: number,
): SavedRaidScore => ({
  teamId:
    typeof teamScore.teamId === "string" && teamScore.teamId
      ? teamScore.teamId
      : `team-${index}`,
  teamName: typeof teamScore.teamName === "string" ? teamScore.teamName : "",
  score: normalizeScore(teamScore.score),
});

const normalizeSavedRaid = (savedRaid: Partial<SavedRaid>, index: number): SavedRaid => ({
  id:
    typeof savedRaid.id === "string" && savedRaid.id
      ? savedRaid.id
      : `saved-raid-${index}`,
  sourceRaidId:
    typeof savedRaid.sourceRaidId === "string"
      ? savedRaid.sourceRaidId
      : undefined,
  raidName:
    typeof savedRaid.raidName === "string" ? savedRaid.raidName : `Raid ${index + 1}`,
  savedAt: typeof savedRaid.savedAt === "string" ? savedRaid.savedAt : "",
  scoringValues: {
    killValue: savedRaid.scoringValues?.killValue ?? 0,
    redValue: savedRaid.scoringValues?.redValue ?? 0,
    dogTagValue: savedRaid.scoringValues?.dogTagValue ?? 0,
  },
  teamScores: Array.isArray(savedRaid.teamScores)
    ? savedRaid.teamScores.map((teamScore, teamScoreIndex) =>
        normalizeSavedRaidScore(teamScore, teamScoreIndex),
      )
    : [],
});

const getSavedRaidTime = (savedRaid: SavedRaid) => {
  const savedTime = new Date(savedRaid.savedAt).getTime();

  return Number.isNaN(savedTime) ? 0 : savedTime;
};

export const normalizeRaidName = (raidName: string) =>
  raidName
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const getSavedRaidKey = (savedRaid: SavedRaid) =>
  normalizeRaidName(savedRaid.raidName) || savedRaid.sourceRaidId || savedRaid.id;

export const normalizeSavedRaids = (savedRaids: SavedRaid[]) => {
  const savedRaidsByName = new Map<string, SavedRaid>();

  savedRaids.forEach((savedRaid) => {
    const savedRaidKey = getSavedRaidKey(savedRaid);
    const existingSavedRaid = savedRaidsByName.get(savedRaidKey);

    if (
      !existingSavedRaid ||
      getSavedRaidTime(savedRaid) >= getSavedRaidTime(existingSavedRaid)
    ) {
      savedRaidsByName.set(savedRaidKey, savedRaid);
    }
  });

  return Array.from(savedRaidsByName.values()).sort(
    (firstSavedRaid, secondSavedRaid) =>
      getSavedRaidTime(secondSavedRaid) - getSavedRaidTime(firstSavedRaid),
  );
};

export const parseState = (snapshot: string): AppState => {
  try {
    const parsedState = JSON.parse(snapshot) as Partial<AppState>;

    return {
      teams: Array.isArray(parsedState.teams)
        ? parsedState.teams.map((team, index) => normalizeTeam(team, index))
        : [],
      raids: Array.isArray(parsedState.raids)
        ? parsedState.raids.map((raid, index) => normalizeRaid(raid, index))
        : [],
      scoringValues: {
        killValue: parsedState.scoringValues?.killValue ?? 0,
        redValue: parsedState.scoringValues?.redValue ?? 0,
        dogTagValue: parsedState.scoringValues?.dogTagValue ?? 0,
      },
      savedRaids: Array.isArray(parsedState.savedRaids)
        ? normalizeSavedRaids(
            parsedState.savedRaids.map((savedRaid, index) =>
              normalizeSavedRaid(savedRaid, index),
            ),
          )
        : [],
      hostLogos: Array.isArray(parsedState.hostLogos) ? parsedState.hostLogos : [],
    };
  } catch {
    return EMPTY_STATE;
  }
};

export const migrateLegacyTeams = (snapshot: string) => {
  try {
    const legacyTeams = JSON.parse(snapshot) as Array<
      Team & Partial<TeamScore>
    >;

    if (!Array.isArray(legacyTeams)) {
      return EMPTY_STATE_SNAPSHOT;
    }

    const teams = legacyTeams.map((team) => ({
      id: team.id,
      name: team.name,
      players: [],
    }));
    const hasScores = legacyTeams.some(
      (team) => team.kills || team.reds || team.dogTags || team.extractedLoot,
    );
    const raids = hasScores
      ? [
          {
            id: "legacy-raid-1",
            name: "Raid 1",
            scores: Object.fromEntries(
              legacyTeams.map((team) => [
                team.id,
                {
                  kills: team.kills ?? 0,
                  playerKills: {},
                  reds: team.reds ?? 0,
                  dogTags: team.dogTags ?? 0,
                  extractedLoot: team.extractedLoot ?? 0,
                },
              ]),
            ),
          },
        ]
      : [];

    return JSON.stringify({
      teams,
      raids,
      scoringValues: DEFAULT_SCORING_VALUES,
      savedRaids: [],
      hostLogos: [],
    });
  } catch {
    return EMPTY_STATE_SNAPSHOT;
  }
};

export const getStateSnapshot = () => {
  if (typeof window === "undefined") {
    return EMPTY_STATE_SNAPSHOT;
  }

  const savedState = window.localStorage.getItem(STORAGE_KEY);

  if (savedState) {
    return savedState;
  }

  const legacyTeams = window.localStorage.getItem(LEGACY_STORAGE_KEY);

  if (legacyTeams) {
    return migrateLegacyTeams(legacyTeams);
  }

  return EMPTY_STATE_SNAPSHOT;
};

export const subscribeToState = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
  };
};

export const saveState = (state: AppState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(STORAGE_EVENT));
};
