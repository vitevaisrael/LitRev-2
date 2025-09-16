import { flags } from "../config/features";
import { HomeCreateProjectCard } from "./HomeCreateProjectCard";
import { HomeExplorerCard } from "./HomeExplorerCard";
import { HomeRecentsCard } from "./HomeRecentsCard";
import { HomeActivityCard } from "./HomeActivityCard";

export function HomeBlocks() {
  return (
    <>
      {/* Quick actions / explorer row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(flags as any).HOME_BLOCK_CREATE ? (
          <HomeCreateProjectCard />
        ) : (
          <>
            <div className="border rounded-xl p-4">
              <div className="font-medium">Create Review</div>
              <p className="text-sm text-gray-500">Start a new project</p>
            </div>
            <div className="border rounded-xl p-4">
              <div className="font-medium">Search Literature</div>
              <p className="text-sm text-gray-500">PubMed and more</p>
            </div>
          </>
        )}
        {(flags as any).HOME_BLOCK_EXPLORER && <HomeExplorerCard />}
      </section>

      {/* Recents */}
      {(flags as any).HOME_BLOCK_RECENTS && (
        <section>
          <HomeRecentsCard />
        </section>
      )}

      {/* Activity */}
      {(flags as any).HOME_BLOCK_ACTIVITY && (
        <section>
          <HomeActivityCard />
        </section>
      )}
    </>
  );
}
