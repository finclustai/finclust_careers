import { OG_SIZE, renderOgCard } from "@/lib/og";

export const alt = "FINCLUST Careers — open roles";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return await renderOgCard();
}
