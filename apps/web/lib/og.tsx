import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { experienceBand, WORK_MODE_LABEL, type PublicJob } from "@/lib/api";

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#15140f";
const PAPER = "#fffdf8";
const SAND = "#f9f6ee";
const ORANGE = "#ff8a1e";
const MID = "#6b665c";

// The image renderer ships a single regular weight and cannot read variable
// fonts, so the site's own typeface is bundled as two static weights. Loaded
// once per server instance, not per image.
let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 800; style: "normal" }[]> | undefined;
function loadFonts() {
  fonts ??= Promise.all(
    ([500, 800] as const).map(async (weight) => ({
      name: "Hanken Grotesk",
      data: await readFile(join(process.cwd(), `assets/HankenGrotesk-${weight}.ttf`)),
      weight,
      style: "normal" as const,
    })),
  );
  return fonts;
}

/**
 * The card WhatsApp, LinkedIn and others show when a link is pasted. This is
 * the first thing a candidate sees in a busy group, so it carries the facts
 * that decide whether they tap: role, place, experience.
 *
 * No logo exists yet, so the FINCLUST wordmark stands in.
 */
export async function renderOgCard(job?: PublicJob) {
  const facts = job
    ? [
        job.location && `${job.location}${job.workMode ? ` · ${WORK_MODE_LABEL[job.workMode]}` : ""}`,
        experienceBand(job),
      ].filter(Boolean)
    : [];

  const title = job ? job.title : "Find your next role";
  const titleSize = title.length > 44 ? 52 : title.length > 26 ? 62 : 74;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: SAND,
          padding: 48,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: PAPER,
            border: `6px solid ${INK}`,
            borderRadius: 32,
            boxShadow: `0 12px 0 ${INK}`,
            padding: "44px 56px 40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                background: ORANGE,
                border: `5px solid ${INK}`,
                borderRadius: 16,
                fontSize: 38,
                fontWeight: 800,
                color: INK,
              }}
            >
              F
            </div>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 800, letterSpacing: 5, color: INK }}>
              FINCLUST CAREERS
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {job?.profile.name && (
              <div style={{ display: "flex", fontSize: 24, fontWeight: 800, letterSpacing: 2, color: MID }}>
                {job.profile.name.toUpperCase()}
              </div>
            )}
            <div
              style={{
                display: "flex",
                fontSize: titleSize,
                fontWeight: 800,
                color: INK,
                lineHeight: 1.04,
                letterSpacing: -2,
                maxWidth: 1000,
              }}
            >
              {title}
            </div>
            {facts.length > 0 && (
              <div style={{ display: "flex", gap: 16 }}>
                {facts.map((fact) => (
                  <div
                    key={fact as string}
                    style={{
                      display: "flex",
                      fontSize: 26,
                      fontWeight: 500,
                      color: INK,
                      background: SAND,
                      border: `3px solid ${INK}`,
                      borderRadius: 999,
                      padding: "8px 22px",
                    }}
                  >
                    {fact}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: MID }}>
              careers.finclust.ai
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 800,
                color: INK,
                background: ORANGE,
                border: `5px solid ${INK}`,
                borderRadius: 16,
                boxShadow: `0 6px 0 ${INK}`,
                padding: "12px 30px",
              }}
            >
              Apply now →
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
