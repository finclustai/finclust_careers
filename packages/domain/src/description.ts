export type DescriptionBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

// A bullet needs a marker followed by a space, so "Self-starter" is not a list.
const UNORDERED = /^[-*•]\s+(.*)$/;
// A number needs "." or ")" then a space, so "2026 hiring plan" is not a list.
const ORDERED = /^\d+[.)]\s+(.*)$/;

/**
 * Turns a plain-text job description into paragraphs and lists, so text a
 * recruiter pasted from WhatsApp, Word or email reads properly on a phone
 * instead of arriving as one block.
 *
 * Returns structure, not HTML: the caller renders it with React, so nothing a
 * recruiter types can ever be injected into the page as markup.
 */
export function parseDescription(input: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };

  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    const unordered = UNORDERED.exec(line);
    const ordered = unordered ? null : ORDERED.exec(line);
    const item = (unordered ?? ordered)?.[1]?.trim();

    if (item !== undefined) {
      flushParagraph();
      const isOrdered = ordered !== null;
      const last = blocks[blocks.length - 1];
      if (last?.type === "list" && last.ordered === isOrdered) last.items.push(item);
      else blocks.push({ type: "list", ordered: isOrdered, items: [item] });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}
