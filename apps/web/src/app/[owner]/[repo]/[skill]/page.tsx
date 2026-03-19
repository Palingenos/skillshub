import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { skills, repos, users, stars } from "@skillshub/db/schema";
import { eq, and, ne, desc, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LikeButton } from "@/components/star-button";
import { DonateButton } from "@/components/donate-button";
import { CopyButton } from "@/components/copy-button";
import { SkillSidebar } from "@/components/skill-sidebar";
import { getUser } from "@/lib/session";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { stripFrontmatter } from "@/lib/utils";
import { getRepoStars } from "@/lib/ungh";
import { JsonLd } from "@/components/json-ld";

interface Props {
  params: Promise<{ owner: string; repo: string; skill: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, repo, skill: skillSlug } = await params;
  const db = getDb();

  const [result] = await db
    .select({
      name: skills.name,
      description: skills.description,
    })
    .from(skills)
    .innerJoin(repos, eq(skills.repoId, repos.id))
    .where(
      and(
        eq(repos.githubOwner, owner),
        eq(repos.githubRepoName, repo),
        eq(skills.slug, skillSlug)
      )
    )
    .limit(1);

  if (!result) {
    return { title: "Skill not found | SkillsHub" };
  }

  const title = `${result.name} — ${owner}/${repo} | SkillsHub`;
  const description = result.description
    ? result.description.slice(0, 160)
    : `${result.name} skill from ${owner}/${repo} on SkillsHub`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://skillshub.wtf/${owner}/${repo}/${skillSlug}`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function SkillDetailPage({ params }: Props) {
  const { owner, repo, skill: skillSlug } = await params;
  const db = getDb();
  const currentUser = await getUser();

  const [result] = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      description: skills.description,
      readme: skills.readme,
      manifest: skills.manifest,
      tags: skills.tags,
      isPublished: skills.isPublished,
      createdAt: skills.createdAt,
      updatedAt: skills.updatedAt,
      ownerId: skills.ownerId,
      repo: {
        id: repos.id,
        starCount: repos.starCount,
        downloadCount: repos.downloadCount,
        githubRepoUrl: repos.githubRepoUrl,
        githubOwner: repos.githubOwner,
        githubRepoName: repos.githubRepoName,
        weeklyInstalls: repos.weeklyInstalls,
      },
      owner: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isVerified: users.isVerified,
        bscAddress: users.bscAddress,
      },
    })
    .from(skills)
    .innerJoin(repos, eq(skills.repoId, repos.id))
    .innerJoin(users, eq(skills.ownerId, users.id))
    .where(
      and(
        eq(repos.githubOwner, owner),
        eq(repos.githubRepoName, repo),
        eq(skills.slug, skillSlug)
      )
    )
    .limit(1);

  if (!result) notFound();

  // Only show GitHub stars if the repo owner matches the GitHub repo owner
  const isOriginalOwner = result.owner.username === result.repo.githubOwner;
  const githubStars = isOriginalOwner
    ? await getRepoStars(result.repo.githubOwner ?? owner, result.repo.githubRepoName ?? repo)
    : 0;

  let hasStarred = false;
  if (currentUser) {
    const [star] = await db
      .select()
      .from(stars)
      .where(
        and(eq(stars.userId, currentUser.userId), eq(stars.repoId, result.repo.id))
      )
      .limit(1);
    hasStarred = !!star;
  }

  // Related skills from the same repo
  const relatedSkills = await db
    .select({
      slug: skills.slug,
      name: skills.name,
      description: skills.description,
    })
    .from(skills)
    .where(
      and(
        eq(skills.repoId, result.repo.id),
        ne(skills.id, result.id),
        eq(skills.isPublished, true)
      )
    )
    .orderBy(desc(skills.createdAt))
    .limit(4);

  const fetchUrl = `https://skillshub.wtf/${owner}/${repo}/${skillSlug}?format=md`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-fade-in">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareSourceCode",
          name: result.name,
          description: result.description ?? `${result.name} skill on SkillsHub`,
          author: {
            "@type": "Person",
            name: result.owner.username,
            url: `https://skillshub.wtf/${owner}`,
          },
          dateCreated: result.createdAt.toISOString(),
          url: `https://skillshub.wtf/${owner}/${repo}/${result.slug}`,
          codeRepository: result.repo.githubRepoUrl ?? `https://github.com/${owner}/${repo}`,
        }}
      />
      {/* Breadcrumbs as file path */}
      <nav className="mb-6 font-mono text-xs text-neutral-600">
        <Link href="/" className="hover:text-neon-cyan transition-colors">
          ~
        </Link>
        <span className="mx-1 text-neutral-700">/</span>
        <Link
          href={`/${owner}`}
          className="hover:text-neon-cyan transition-colors"
        >
          {owner}
        </Link>
        <span className="mx-1 text-neutral-700">/</span>
        <Link
          href={`/${owner}/${repo}`}
          className="hover:text-neon-cyan transition-colors"
        >
          {repo}
        </Link>
        <span className="mx-1 text-neutral-700">/</span>
        <span className="text-neutral-300">{result.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left column */}
        <div className="lg:col-span-9">
          {/* Skill name & description */}
          <h1 className="font-mono text-2xl md:text-3xl font-bold text-neutral-100">
            <span className="text-neon-cyan/40">&gt;</span> {result.name}
          </h1>
          {result.description && (
            <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
              {result.description}
            </p>
          )}

          {/* Fetch skill — terminal style */}
          <div className="mt-6 rounded border border-neutral-800/60 bg-[#0a0a0a] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800/40">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500/50" />
                <span className="h-2 w-2 rounded-full bg-yellow-500/50" />
                <span className="h-2 w-2 rounded-full bg-green-500/50" />
              </div>
              <span className="font-mono text-[10px] text-neutral-700">fetch</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-3">
              <span className="font-mono text-xs text-neon-cyan/50 select-none">$</span>
              <code className="flex-1 font-mono text-xs text-terminal-green truncate">
                curl &quot;{fetchUrl}&quot;
              </code>
              <CopyButton text={`curl "${fetchUrl}"`} />
            </div>
          </div>

          {/* README */}
          {result.readme && (
            <div className="prose prose-invert mt-8 max-w-none rounded border border-neutral-800/40 bg-neutral-900/20 p-6 md:p-8 overflow-hidden [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-words [&_pre_code]:break-normal [&_table]:overflow-x-auto [&_table]:block">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800/40 not-prose">
                <span className="font-mono text-xs text-neon-cyan/60">SKILL.md</span>
                <span className="font-mono text-[10px] text-neutral-600">&bull;</span>
                <span className="font-mono text-xs text-neutral-600">{result.name}</span>
              </div>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result.readme}
              </ReactMarkdown>
            </div>
          )}

          {/* Manifest */}
          {result.manifest != null && (
            <div className="mt-8">
              <h2 className="mb-3 font-mono text-sm text-neutral-400">
                <span className="text-neon-cyan/40">&gt;</span> manifest.json
              </h2>
              <pre className="overflow-x-auto rounded border border-neutral-800/40 bg-[#0a0a0a] p-4 font-mono text-xs text-neutral-400">
                {JSON.stringify(result.manifest, null, 2)}
              </pre>
            </div>
          )}

          {/* Related Skills */}
          {relatedSkills.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 font-mono text-sm text-neutral-400">
                <span className="text-neon-cyan/40">&gt;</span> related_skills <span className="text-neutral-600">--same-repo</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedSkills.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/${owner}/${repo}/${s.slug}`}
                    className="group block rounded border border-neutral-800/50 bg-neutral-900/20 p-4 transition-all hover:border-neon-cyan/30 hover:bg-neutral-900/40"
                  >
                    <h3 className="font-mono text-sm font-medium text-neutral-200 group-hover:text-neon-cyan transition-colors truncate">
                      <span className="text-neutral-600 group-hover:text-neon-cyan/50">&gt;</span>{" "}
                      {s.name}
                    </h3>
                    {s.description && (
                      <p className="mt-1 text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                        {s.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column sidebar */}
        <div className="lg:col-span-3">
          <SkillSidebar
            weeklyInstalls={result.repo.weeklyInstalls}
            githubStars={githubStars}
            createdAt={result.createdAt}
            githubRepoUrl={result.repo.githubRepoUrl}
            githubOwner={result.repo.githubOwner}
            githubRepoName={result.repo.githubRepoName}
            tags={result.tags}
            owner={{
              username: result.owner.username,
              isVerified: result.owner.isVerified,
            }}
            skillId={result.id}
            likeButton={
              <LikeButton
                repoId={result.repo.id}
                initialCount={result.repo.starCount}
                initialLiked={hasStarred}
              />
            }
            donateButton={
              <DonateButton
                authorBscAddress={result.owner.bscAddress}
                authorName={result.owner.username}
                repoId={result.repo.id}
                toUserId={result.owner.id}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
