// Artwork formats are shared with the County Post ad network, so one creative runs on both.
// Placements scale artwork to fit, so sizes are recommendations; off-size files get a note, not a rejection.
export const artworkSpecs = {
  square: { label: "Square ad", sizes: [[250, 250], [300, 250]], use: "color cards, sponsor carousels and in-feed placements" },
  banner: { label: "Wide banner", sizes: [[980, 300]], use: "section-break banner carousels" },
} as const;
export type ArtworkKind = keyof typeof artworkSpecs;
export type Artwork = { file: File; url: string; width: number; height: number; note?: string };

export const artworkMaxBytes = 10 * 1024 * 1024;
export const artworkAccept = "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif";
const typesByExtension: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

export function artworkSizeLabel(kind: ArtworkKind) {
  return artworkSpecs[kind].sizes.map(([width, height]) => `${width}×${height}`).join(" or ");
}

/** Some browsers report an empty or nonstandard type, so fall back to the file extension. */
function artworkType(file: File) {
  const type = file.type === "image/jpg" || file.type === "image/pjpeg" ? "image/jpeg" : file.type;
  if (Object.values(typesByExtension).includes(type)) return type;
  return typesByExtension[file.name.split(".").pop()?.toLowerCase() ?? ""];
}

/** Decodes the image and checks type and size, then notes whether its proportions match a recommended size. */
export async function readArtwork(input: File, kind: ArtworkKind): Promise<Artwork> {
  const spec = artworkSpecs[kind];
  const type = artworkType(input);
  if (!type) throw new Error("Artwork must be a PNG, JPG, WebP or GIF image.");
  if (input.size > artworkMaxBytes) throw new Error("Artwork files must be 10 MB or smaller.");
  const file = input.type === type ? input : new File([input], input.name, { type, lastModified: input.lastModified });
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("This image could not be opened. Please choose another file.");
  }
  const { naturalWidth: width, naturalHeight: height } = image;
  const matches = spec.sizes.some(([w, h]) => Math.abs(width / height - w / h) < 0.02 && width >= w);
  const note = matches ? undefined : `Recommended size is ${artworkSizeLabel(kind)} px; this ${width}×${height} image will be scaled to fit, and we'll confirm it before launch.`;
  return { file, url, width, height, note };
}
