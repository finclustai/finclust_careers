import { parseDescription } from "@finclust/domain";

/**
 * Renders a job description as real paragraphs and lists. Built from structure
 * rather than HTML, so nothing a recruiter pastes can inject markup.
 */
export function Description({ text }: { text: string }) {
  const blocks = parseDescription(text);
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-3 text-sm leading-relaxed text-body">
      {blocks.map((block, i) =>
        block.type === "paragraph" ? (
          <p key={i}>{block.text}</p>
        ) : block.ordered ? (
          <ol key={i} className="list-decimal space-y-1 pl-5 marker:font-bold marker:text-ink">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ol>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-orange">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
