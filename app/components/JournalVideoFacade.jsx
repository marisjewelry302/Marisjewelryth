"use client";

import Image from "next/image";
import { useState } from "react";

// Click-to-load video: shows the article image as a poster and only requests
// YouTube once the visitor asks for the video.
export default function JournalVideoFacade({ embedSrc, title, poster, playLabel, vertical = false }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={`journal-video${vertical ? " journal-video--vertical" : ""}`}>
      {playing ? (
        <iframe
          src={`${embedSrc}${embedSrc.includes("?") ? "&" : "?"}autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button type="button" className="journal-video-facade" onClick={() => setPlaying(true)} aria-label={`${playLabel}: ${title}`}>
          {poster ? (
            <Image
              className="journal-video-poster"
              src={poster}
              alt=""
              fill
              sizes={vertical ? "(max-width: 520px) 90vw, 360px" : "(max-width: 960px) 100vw, 700px"}
            />
          ) : null}
          <span className="journal-video-play" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
