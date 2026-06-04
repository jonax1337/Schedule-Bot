import { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import { useVodReview } from './use-vod-review';
import { VodCommentPanel } from './vod-comment-panel';

interface VodReviewProps {
  videoId: string;
  scrimId: string;
}

export function VodReview({ videoId, scrimId }: VodReviewProps) {
  const vod = useVodReview(scrimId);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Match the comments panel height to the video so they line up side by side.
  useEffect(() => {
    const el = videoContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setVideoHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full lg:items-start">
      {/* Video Player */}
      <div className="flex-1 min-w-0">
        <div ref={videoContainerRef} className="w-full aspect-video [&>div]:w-full [&>div]:h-full">
          <YouTube
            videoId={videoId}
            opts={{ playerVars: { autoplay: 0 } }}
            onReady={vod.onPlayerReady}
            onStateChange={vod.onPlayerStateChange}
            className="w-full h-full"
            iframeClassName="w-full h-full rounded-lg"
          />
        </div>
      </div>

      {/* Comments Panel */}
      <VodCommentPanel
        vod={vod}
        className="w-full lg:w-96 rounded-lg border text-card-foreground shadow-sm overflow-hidden"
        style={{
          height: videoHeight > 0 ? `${videoHeight}px` : undefined,
          maxHeight: videoHeight > 0 ? `${videoHeight}px` : '50vh',
        }}
      />
    </div>
  );
}
