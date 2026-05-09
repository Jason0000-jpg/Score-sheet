"use client";

import { Fragment, useMemo, useSyncExternalStore } from "react";
import { AppNav } from "../components/AppNav";
import { EmptyState } from "../components/EmptyState";
import { HostLogoDivider } from "../components/HostLogoDivider";
import { SavedRaidCard } from "../components/SavedRaidCard";
import {
  EMPTY_STATE_SNAPSHOT,
  STORAGE_EVENT,
  STORAGE_KEY,
  getStateSnapshot,
  parseState,
  subscribeToState,
} from "../lib/score-state";

const clearSavedRaids = () => {
  const currentState = JSON.parse(
    window.localStorage.getItem(STORAGE_KEY) ?? EMPTY_STATE_SNAPSHOT,
  ) as Record<string, unknown>;

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...currentState,
      savedRaids: [],
    }),
  );
  window.dispatchEvent(new Event(STORAGE_EVENT));
};

export default function SavedRaidsPage() {
  const stateSnapshot = useSyncExternalStore(
    subscribeToState,
    getStateSnapshot,
    () => EMPTY_STATE_SNAPSHOT,
  );
  const { savedRaids, hostLogos } = useMemo(
    () => parseState(stateSnapshot),
    [stateSnapshot],
  );

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-0 max-sm:px-2.5 max-sm:pb-5">
      <AppNav hostLogos={hostLogos} />

      {savedRaids.length === 0 ? (
        <EmptyState
          text="Save a raid from the tracking page to add it to this grid."
          title="No saved raids yet"
        />
      ) : (
        <>
          <section className="grid gap-5">
            {savedRaids.map((raid, raidIndex) => (
              <Fragment key={raid.id}>
                <SavedRaidCard hostLogos={hostLogos} raid={raid} />

                {hostLogos.length > 0 && raidIndex < savedRaids.length - 1 ? (
                  <HostLogoDivider hostLogos={hostLogos} />
                ) : null}
              </Fragment>
            ))}
          </section>

          <button
            className="mt-8 w-full rounded-2xl border border-red-400/40 bg-red-500 px-5 py-4 font-black text-white transition hover:-translate-y-0.5 hover:brightness-110"
            onClick={clearSavedRaids}
            type="button"
          >
            Clear All Saved Raids
          </button>
        </>
      )}
    </main>
  );
}
