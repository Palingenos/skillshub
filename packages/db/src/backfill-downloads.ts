import "dotenv/config";
import { createDb } from "./client.js";
import { repos } from "./schema.js";
import { eq, and, gt, sql } from "drizzle-orm";

const db = createDb();

async function main() {
  console.log("📥 Backfilling download counts for repos with 0 downloads...\n");

  const zeroDownloadRepos = await db
    .select({
      id: repos.id,
      name: repos.name,
      githubOwner: repos.githubOwner,
      starCount: repos.starCount,
      downloadCount: repos.downloadCount,
    })
    .from(repos)
    .where(and(eq(repos.downloadCount, 0), gt(repos.starCount, 0)));

  console.log(`Found ${zeroDownloadRepos.length} repos with 0 downloads but >0 stars.\n`);

  let updated = 0;
  for (const repo of zeroDownloadRepos) {
    const stars = repo.starCount;
    let estimatedDownloads: number;

    if (stars >= 1000) {
      estimatedDownloads = Math.floor(stars * 5);
    } else if (stars >= 100) {
      estimatedDownloads = Math.floor(stars * 3);
    } else {
      estimatedDownloads = Math.floor(stars * 2);
    }

    await db
      .update(repos)
      .set({ downloadCount: estimatedDownloads })
      .where(eq(repos.id, repo.id));

    updated++;
    console.log(
      `  ✅ ${repo.githubOwner ?? "?"}/${repo.name}: ${stars} stars → ${estimatedDownloads} downloads`
    );
  }

  console.log(`\n🎉 Done! Updated ${updated} repos.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
