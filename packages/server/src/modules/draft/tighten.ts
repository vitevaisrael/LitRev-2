/**
 * Text tightening with citation chip preservation
 */
const CHIP = /\[SUPPORT:[a-f0-9-]+\]/gi;

function protect(text: string) {
  const chips: string[] = [];
  const protectedText = text.replace(CHIP, m => {
    chips.push(m);
    return `<<C${chips.length - 1}>>`;
  });
  return { chips, protected: protectedText };
}

function restore(text: string, chips: string[]) {
  return text.replace(/<<C(\d+)>>/g, (_, i) => chips[Number(i)] ?? '');
}

function heuristic(s: string) {
  return s
    .replace(/\b(in order to)\b/gi, 'to')
    .replace(/\b(due to the fact that)\b/gi, 'because')
    .replace(/\b(at this point in time)\b/gi, 'now')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function tightenText(input: string, useLLM: boolean) {
  const { protected: p, chips } = protect(input);
  let out = p;

  if (useLLM) {
    try {
      const { OpenAIProvider } = await import('../llm/openai');
      const llm = new OpenAIProvider();

      if (llm?.tighten) {
        const res = await llm.tighten(p);
        out = typeof res === 'string' && res.trim() ? res.trim() : heuristic(p);
      } else {
        out = heuristic(p);
      }
    } catch {
      out = heuristic(p);
    }
  } else {
    out = heuristic(p);
  }

  return restore(out, chips);
}
