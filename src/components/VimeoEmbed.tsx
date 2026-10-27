import "./VimeoEmbed.css";

export type VimeoVideo = { embedUrl: string; watchUrl: string; title: string; label: string; details: string };

/** Vimeo's responsive player: a 16:9 box the iframe fills. */
export function VimeoEmbed({ video }: { video: VimeoVideo }) {
  return (
    <div className="vimeo-embed">
      <iframe
        src={video.embedUrl}
        title={video.title}
        loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
