/**
 * Citation scorer using term frequency analysis
 */
export function suggestFromSupports(
  text: string,
  supports: Array<{ id: string; quote: string }>
) {
  if (!supports.length) return [];

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);

  const uniq = Array.from(new Set(words));
  const N = supports.length || 1;

  const scored = supports.map(s => {
    const q = s.quote.toLowerCase();
    let match = 0, idf = 0;

    for (const w of uniq) {
      if (q.includes(w)) {
        match++;
        idf += Math.log(1 + N / 3);
      }
    }

    const base = uniq.length ? match / uniq.length : 0;
    const rel = Math.min(1, base * (1 + idf / (10 + uniq.length)));

    return {
      supportId: s.id,
      quote: s.quote.length > 240 ? s.quote.slice(0, 237) + '...' : s.quote,
      relevance: Number(rel.toFixed(3)),
      reason: match ? `Matched ${match} key terms` : undefined
    };
  });

  return scored
    .filter(s => s.relevance > 0.1)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);
}
