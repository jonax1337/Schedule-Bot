import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import YouTube from 'react-youtube';
import { Button } from '@/components/ui/button';
import { MatchTypeBadge } from '@/components/shared/match-type-badge';
import { ResultBadge } from '@/components/shared/result-badge';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthHeaders } from '@/lib/auth';
import { BOT_API_URL } from '@/lib/config';
import { getYouTubeVideoId } from '@/lib/vod-utils';
import { useBranding } from '@/hooks/use-branding';
import { useVodReview } from '@/components/shared/use-vod-review';
import { VodCommentPanel } from '@/components/shared/vod-comment-panel';

interface ScrimData {
  id: string;
  date: string;
  opponent: string;
  result: string;
  scoreUs: number;
  scoreThem: number;
  map: string;
  matchType?: string;
  vodUrl: string;
  notes: string;
}

export default function VodRoomPage() {
  const params = useParams();
  const navigate = useNavigate();
  const scrimId = params.scrimId as string;

  const vod = useVodReview(scrimId);
  const user = vod.user;
  const [scrim, setScrim] = useState<ScrimData | null>(null);
  const [scrimLoading, setScrimLoading] = useState(true);
  const { teamName } = useBranding();

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, navigate]);

  // Fetch scrim data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BOT_API_URL}/api/scrims/${scrimId}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && data.scrim) {
          setScrim(data.scrim);
        }
      } catch {
        toast.error('Failed to load scrim data');
      } finally {
        setScrimLoading(false);
      }
    })();
  }, [scrimId]);

  // Update document title when scrim data or branding loads
  useEffect(() => {
    if (scrim) {
      document.title = `VOD – ${teamName} vs ${scrim.opponent} (${scrim.map || 'N/A'}) – ${scrim.date}`;
    }
  }, [scrim, teamName]);

  const videoId = scrim?.vodUrl ? getYouTubeVideoId(scrim.vodUrl) : null;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (scrimLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!scrim || !videoId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <p className="text-muted-foreground">VOD not found or no video URL available.</p>
        <Button variant="outline" onClick={() => navigate('/?tab=matches')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0 bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/?tab=matches')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2.5 min-w-0">
            {/* Date */}
            <span className="text-sm text-muted-foreground shrink-0">{scrim.date}</span>

            {/* Match type badge */}
            {scrim.matchType && <MatchTypeBadge type={scrim.matchType} />}

            {/* Opponent */}
            <span className="font-semibold truncate">{teamName} vs {scrim.opponent}</span>

            {/* Map */}
            {scrim.map && (
              <span className="text-sm text-muted-foreground shrink-0">{scrim.map}</span>
            )}

            {/* Score */}
            <span className="font-semibold tabular-nums shrink-0 flex items-center gap-0.5">
              <span className="text-green-500">{scrim.scoreUs}</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-red-500">{scrim.scoreThem}</span>
            </span>

            {/* Result badge */}
            {scrim.result && <ResultBadge result={scrim.result} />}
          </div>
        </div>
      </div>

      {/* Main content: video + chat */}
      <div className="flex flex-1 min-h-0">
        {/* Video */}
        <div className="flex-1 min-w-0 bg-black flex items-center justify-center">
          <div className="w-full h-full [&>div]:w-full [&>div]:h-full">
            <YouTube
              videoId={videoId}
              opts={{ playerVars: { autoplay: 0 }, width: '100%', height: '100%' }}
              onReady={vod.onPlayerReady}
              onStateChange={vod.onPlayerStateChange}
              className="w-full h-full"
              iframeClassName="w-full h-full"
            />
          </div>
        </div>

        {/* Chat panel */}
        <VodCommentPanel vod={vod} className="w-96 xl:w-[28rem] border-l" />
      </div>
    </div>
  );
}
