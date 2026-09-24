import type { ImgHTMLAttributes } from "react";
import { imageAssets } from "../data/image-assets.generated";

/** Preserve remote/upload URLs; serve reviewed local artwork at the needed density. */
export function SiteImage({ src, sizes = "100vw", loading = "lazy", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const asset = src ? imageAssets[src] : undefined;
  return <img {...props} src={asset?.src || src} srcSet={asset?.srcSet} sizes={asset ? sizes : undefined} loading={loading} decoding="async" />;
}
