import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { campaignLink } from "../data/campaigns";
import { paxtonCampaign, paxtonVideo } from "../data/paxton";
import "./PaxtonPage.css";

export function PaxtonEventVideo({ excerpt = false }: { excerpt?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [searchParams] = useSearchParams();
  const timestamp = searchParams.get("t") || "";
  const seconds = /^\d+(?:\.\d+)?$/.test(timestamp) ? Number(timestamp) : NaN;
  const startAt = Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  const title = excerpt ? "At The Big Texan: opening 7:33" : "Come and Take It tour at The Big Texan — full video";
  return <article className="paxton-event-video" aria-label={title}>
    <video key={`${excerpt}:${startAt}`} controls playsInline preload={startAt === null ? "none" : "metadata"} poster={paxtonVideo.poster} aria-label={title}
      onLoadedMetadata={event => {
        const video = event.currentTarget;
        if (startAt !== null && Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = Math.min(startAt, Math.max(0, video.duration - 0.1));
        }
      }}
      src={excerpt ? paxtonVideo.opening : paxtonVideo.full} onError={() => setFailed(true)}>
      Your browser does not support this video. Use the original Facebook video link below.
    </video>
    <div className="paxton-video-caption">
      <p className="campaign-kicker">{excerpt ? "Opening excerpt · 7:33" : "Full event · 37:20"}</p>
      <h3>{title}</h3>
      <p>{excerpt ? "The first 7 minutes and 33 seconds of the event recording." : "The complete recording, including the opening remarks."}</p>
      {failed && <p role="alert">The video could not load. Please try again or watch the original on Facebook.</p>}
      <div className="paxton-video-links">
        <Link to={excerpt ? "/ken-paxton#campaign-videos" : "/paxton"}>{excerpt ? "Watch the full event" : "Opening excerpt & accomplishments"}</Link>
        <a href={campaignLink(paxtonCampaign, paxtonVideo.source, excerpt ? "opening_video_source" : "full_video_source")} target="_blank" rel="noopener noreferrer">Original Facebook video ↗</a>
      </div>
    </div>
  </article>;
}
