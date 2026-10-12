import type { Command } from "commander";
import { apiClient } from "../client.js";
import { formatTable } from "../format.js";

interface SearchResult {
  knowledge_id: string;
  chunk_id: string;
  title: string | null;
  type: string;
  vault_id: string;
  chunk: {
    content: string;
  };
  score?: number;
}

interface SearchKnowledgeResponse {
  results: SearchResult[];
  advice?: string;
  empty_reason?: "no_visible_vaults" | "no_indexed_knowledge" | "no_matches";
}

export function registerSearchCommands(program: Command): void {
  program
    .command("search <query>")
    .description(
      "Search items in LiquidLM (hybrid semantic + full-text by default)",
    )
    .option("--fulltext", "Use full-text search only")
    .option("--limit <n>", "Maximum number of results", "10")
    .option("--json", "Output as JSON")
    .action(async (query: string, opts) => {
      const limit = Number.parseInt(opts.limit, 10);
      if (!Number.isFinite(limit) || limit <= 0) {
        console.error("--limit must be a positive number");
        process.exit(1);
      }

      const endpoint = opts.fulltext ? "/search/fulltext" : "/search/hybrid";
      const res = await apiClient.query<
        SearchResult[] | SearchKnowledgeResponse
      >(endpoint, {
        query,
        limit,
      });
      if (!res.ok || !res.data) {
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(res.data, null, 2));
        return;
      }

      const results = Array.isArray(res.data) ? res.data : res.data.results;
      const advice = Array.isArray(res.data) ? undefined : res.data.advice;

      if (results.length === 0) {
        console.log(advice ?? "No results found.");
        return;
      }

      const rows = results.map((r) => ({
        ID: r.knowledge_id,
        Title: r.title ?? "(untitled)",
        Type: r.type,
        Score: r.score != null ? r.score.toFixed(3) : "-",
        Snippet: r.chunk.content
          ? r.chunk.content.slice(0, 60) +
            (r.chunk.content.length > 60 ? "..." : "")
          : "-",
      }));
      console.log(formatTable(rows));
    });
}
