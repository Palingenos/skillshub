import { getUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { skills, repos } from "@skillshub/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Plus, Heart, Download, Package } from "lucide-react";
import { RepoActions } from "./repo-actions";
import { SkillRow } from "./skill-row";

export default async function MySkillsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const db = getDb();

  // Get repos with skill counts (LEFT JOIN to properly count skills)
  const myRepos = await db
    .select({
      id: repos.id,
      name: repos.name,
      displayName: repos.displayName,
      description: repos.description,
      githubOwner: repos.githubOwner,
      githubRepoName: repos.githubRepoName,
      githubRepoUrl: repos.githubRepoUrl,
      starCount: repos.starCount,
      downloadCount: repos.downloadCount,
      skillCount: sql<number>`count(${skills.id})::int`,
      createdAt: repos.createdAt,
    })
    .from(repos)
    .leftJoin(skills, eq(skills.repoId, repos.id))
    .where(eq(repos.ownerId, user.userId))
    .groupBy(repos.id)
    .orderBy(desc(repos.createdAt));

  // Get skills grouped by repo
  const mySkills = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      description: skills.description,
      isPublished: skills.isPublished,
      repoId: skills.repoId,
      createdAt: skills.createdAt,
    })
    .from(skills)
    .where(eq(skills.ownerId, user.userId))
    .orderBy(skills.name);

  // Group skills by repoId
  const skillsByRepo = new Map<string, typeof mySkills>();
  for (const skill of mySkills) {
    const existing = skillsByRepo.get(skill.repoId) ?? [];
    existing.push(skill);
    skillsByRepo.set(skill.repoId, existing);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-mono text-2xl font-bold text-neutral-100">
          <span className="text-neon-cyan/40">&gt;</span> my repos & skills
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/skills/import"
            className="inline-flex items-center gap-2 rounded border border-neon-cyan/30 bg-neon-cyan/5 px-4 py-2 font-mono text-xs text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
          >
            ⇣ import from github
          </Link>
          <Link
            href="/skills/publish"
            className="inline-flex items-center gap-2 rounded border border-neutral-800/50 px-4 py-2 font-mono text-xs text-neutral-400 hover:border-neon-magenta/30 hover:text-neon-magenta transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            new skill
          </Link>
        </div>
      </div>

      {myRepos.length === 0 ? (
        <div className="rounded border border-neutral-800/50 bg-neutral-900/20 p-16 text-center">
          <p className="mb-2 font-mono text-sm text-neutral-500">
            <span className="text-neon-cyan/40">$</span> ls repos/
          </p>
          <p className="mb-6 font-mono text-xs text-neutral-600">
            {'// no repos yet — import from github or create one'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/skills/import"
              className="inline-flex items-center gap-2 rounded border border-neon-cyan/30 bg-neon-cyan/5 px-5 py-3 font-mono text-xs text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
            >
              ⇣ import from github
            </Link>
            <Link
              href="/skills/publish"
              className="inline-flex items-center gap-2 rounded border border-neutral-800/50 px-5 py-3 font-mono text-xs text-neutral-400 hover:text-neon-magenta transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              create manually
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {myRepos.map((repo) => {
            const repoSkills = skillsByRepo.get(repo.id) ?? [];
            const repoHref = repo.githubOwner && repo.githubRepoName
              ? `/${repo.githubOwner}/${repo.githubRepoName}`
              : "#";

            return (
              <div
                key={repo.id}
                className="rounded border border-neutral-800/50 bg-neutral-900/10 overflow-hidden"
              >
                {/* Repo header */}
                <div className="flex items-center justify-between border-b border-neutral-800/30 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={repoHref}
                        className="font-mono text-sm font-semibold text-neutral-200 hover:text-neon-cyan transition-colors"
                      >
                        <span className="text-neutral-600">{repo.githubOwner ?? user.username}/</span>
                        {repo.githubRepoName ?? repo.name}
                      </Link>
                      {repo.githubRepoUrl && (
                        <a
                          href={repo.githubRepoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-neutral-700 hover:text-neon-cyan transition-colors"
                        >
                          github →
                        </a>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-neutral-600">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {repoSkills.length} skills
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {repo.starCount} likes
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {repo.downloadCount}
                      </span>
                    </div>
                  </div>
                  <RepoActions
                    repoId={repo.id}
                    repoName={repo.displayName ?? repo.name}
                  />
                </div>

                {/* Skills list */}
                <div className="divide-y divide-neutral-800/20">
                  {repoSkills.length === 0 ? (
                    <div className="px-5 py-6 text-center font-mono text-xs text-neutral-600">
                      no skills in this repo
                    </div>
                  ) : (
                    repoSkills.map((skill) => (
                      <SkillRow
                        key={skill.id}
                        skillId={skill.id}
                        name={skill.name}
                        slug={skill.slug}
                        description={skill.description}
                        isPublished={skill.isPublished}
                        editHref={`/dashboard/skills/${skill.id}/edit`}
                        viewHref={
                          repo.githubOwner && repo.githubRepoName
                            ? `/${repo.githubOwner}/${repo.githubRepoName}/${skill.slug}`
                            : `/skills/${user.username}/${skill.slug}`
                        }
                      />
                    ))
                  )}
                </div>

                {/* Add skill to repo */}
                <div className="border-t border-neutral-800/30 px-5 py-3">
                  <Link
                    href={`/skills/publish?repoId=${repo.id}`}
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] text-neutral-600 hover:text-neon-cyan transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    add skill to this repo
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
