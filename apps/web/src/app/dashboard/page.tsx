export const dynamic = "force-dynamic";
import { getUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { skills, repos, donations, users } from "@skillshub/db/schema";
import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Package, DollarSign, LogOut, Wallet, Plus, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const db = getDb();

  const [userDataArr, repoCount, skillCount, donationStats] = await Promise.all([
    db
      .select({
        bscAddress: users.bscAddress,
        totalDonationsReceived: users.totalDonationsReceived,
      })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(repos)
      .where(eq(repos.ownerId, user.userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(skills)
      .where(eq(skills.ownerId, user.userId)),
    db
      .select({
        total: sql<string>`COALESCE(SUM(${donations.amount}::numeric), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(donations)
      .where(eq(donations.toUserId, user.userId)),
  ]);

  const userData = userDataArr[0];
  const hasBscAddress = !!userData?.bscAddress;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-neutral-100">
            <span className="text-neon-cyan/40">&gt;</span> {user.displayName ?? user.username}
          </h1>
          <p className="font-mono text-xs text-neutral-600">@{user.username}</p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 rounded border border-neutral-800/40 px-3 py-2 font-mono text-xs text-neutral-600 hover:text-red-400 hover:border-red-500/30 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            logout
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded border border-neutral-800/50 bg-neutral-900/20 p-4">
          <div className="font-mono text-2xl font-bold text-neon-cyan">{repoCount[0]?.count ?? 0}</div>
          <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider mt-0.5">repos</div>
        </div>
        <div className="rounded border border-neutral-800/50 bg-neutral-900/20 p-4">
          <div className="font-mono text-2xl font-bold text-neon-lime">{skillCount[0]?.count ?? 0}</div>
          <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider mt-0.5">skills</div>
        </div>
        <div className="rounded border border-neutral-800/50 bg-neutral-900/20 p-4">
          <div className="font-mono text-2xl font-bold text-neon-yellow">{donationStats[0]?.count ?? 0}</div>
          <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider mt-0.5">donations</div>
        </div>
        <div className="rounded border border-neutral-800/50 bg-neutral-900/20 p-4">
          <div className="font-mono text-2xl font-bold text-neon-magenta">{hasBscAddress ? "✓" : "—"}</div>
          <div className="font-mono text-[10px] text-neutral-600 uppercase tracking-wider mt-0.5">wallet</div>
        </div>
      </div>

      {/* Navigation — ordered: Repos, Publish, Wallet, Donations */}
      <div className="space-y-3">
        {/* 1. Repos & Skills */}
        <Link
          href="/dashboard/skills"
          className="group flex items-center justify-between rounded border border-neutral-800/50 bg-neutral-900/10 p-5 hover:border-neon-cyan/30 transition-all"
        >
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-neon-cyan/60" />
            <div>
              <p className="font-mono text-sm font-semibold text-neutral-200 group-hover:text-neon-cyan transition-colors">
                repos & skills
              </p>
              <p className="font-mono text-[10px] text-neutral-600">
                manage your repos, add/edit/delete skills
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-neutral-700 group-hover:text-neon-cyan transition-colors" />
        </Link>

        {/* 2. Publish / Import Skills */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/skills/import"
            className="group flex items-center gap-3 rounded border border-neon-cyan/20 bg-neon-cyan/5 p-5 hover:bg-neon-cyan/10 transition-all"
          >
            <span className="font-mono text-lg">⇣</span>
            <div>
              <p className="font-mono text-sm font-semibold text-neon-cyan">
                import from github
              </p>
              <p className="font-mono text-[10px] text-neutral-600">
                scan & import SKILL.md files
              </p>
            </div>
          </Link>
          <Link
            href="/skills/publish"
            className="group flex items-center gap-3 rounded border border-neutral-800/50 bg-neutral-900/10 p-5 hover:border-neon-magenta/30 transition-all"
          >
            <Plus className="h-5 w-5 text-neon-magenta/60" />
            <div>
              <p className="font-mono text-sm font-semibold text-neutral-200 group-hover:text-neon-magenta transition-colors">
                publish skill
              </p>
              <p className="font-mono text-[10px] text-neutral-600">
                create a skill manually
              </p>
            </div>
          </Link>
        </div>

        {/* 3. Wallet Setup */}
        <Link
          href="/dashboard/wallet"
          className="group flex items-center justify-between rounded border border-neutral-800/50 bg-neutral-900/10 p-5 hover:border-neon-yellow/30 transition-all"
        >
          <div className="flex items-center gap-3">
            <Wallet className={`h-5 w-5 ${hasBscAddress ? "text-neon-lime/60" : "text-neon-yellow/60"}`} />
            <div>
              <p className="font-mono text-sm font-semibold text-neutral-200 group-hover:text-neon-yellow transition-colors">
                wallet setup
              </p>
              <p className="font-mono text-[10px] text-neutral-600">
                {hasBscAddress
                  ? "BSC receiving address configured ✓"
                  : "set up your BSC address to receive donations"}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-neutral-700 group-hover:text-neon-yellow transition-colors" />
        </Link>

        {/* 4. Donations Received */}
        <Link
          href="/dashboard/earnings"
          className="group flex items-center justify-between rounded border border-neutral-800/50 bg-neutral-900/10 p-5 hover:border-neon-lime/30 transition-all"
        >
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-neon-lime/60" />
            <div>
              <p className="font-mono text-sm font-semibold text-neutral-200 group-hover:text-neon-lime transition-colors">
                donations received
              </p>
              <p className="font-mono text-[10px] text-neutral-600">
                {donationStats[0]?.count ?? 0} donations received
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-neutral-700 group-hover:text-neon-lime transition-colors" />
        </Link>

        {/* 5. API Keys (smaller, secondary) */}
        <Link
          href="/dashboard/api-keys"
          className="group flex items-center justify-between rounded border border-neutral-800/30 bg-neutral-900/5 p-4 hover:border-neutral-700/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-neutral-700">🔑</span>
            <p className="font-mono text-xs text-neutral-500 group-hover:text-neutral-300 transition-colors">
              api keys
            </p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-neutral-800 group-hover:text-neutral-500 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
