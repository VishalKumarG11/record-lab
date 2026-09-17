import React from 'react';
import { Film, Pause, Play, Scissors, Sparkles, Plus } from 'lucide-react';

interface TimelineProps {
  isPlaying: boolean;
  currentTime: string;
  totalTime: string;
  currentSeconds: number;
  durationSeconds: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  canPlay: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({
  isPlaying,
  currentTime,
  totalTime,
  currentSeconds,
  durationSeconds,
  onTogglePlay,
  onSeek,
  canPlay,
}) => {
  const hasDuration = durationSeconds > 0;
  const progress = hasDuration ? Math.min(100, (currentSeconds / durationSeconds) * 100) : 0;
  const tickInterval = durationSeconds <= 30
    ? 5
    : durationSeconds <= 60
      ? 10
      : durationSeconds <= 120
        ? 15
        : durationSeconds <= 300
          ? 30
          : 60;
  const timelineTicks = hasDuration
    ? Array.from({ length: Math.floor(durationSeconds / tickInterval) + 1 }, (_, index) => index * tickInterval)
        .filter((time) => time < durationSeconds)
        .concat(durationSeconds)
    : [0];
  const uniqueTimelineTicks = [...new Set(timelineTicks)];

  return (
    <footer className="timeline flex flex-col shrink-0">
      <div className="timeline-toolbar flex items-center justify-between">
        <div className="flex gap-2">
          <button className="timeline-button flex items-center gap-1.5"><Plus size={12} /> Add Track</button>
          <button className="timeline-button flex items-center gap-1.5"><Scissors size={12} /> Split</button>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-400">{currentTime}</span>
          <button
            onClick={onTogglePlay}
            disabled={!canPlay}
            className="play-button hover:scale-105 active:scale-95 cursor-pointer transition-transform"
          >
            {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          </button>
          <span className="font-mono text-xs text-slate-400">{totalTime}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#8c9a99]">
          <Sparkles size={12} className="text-[#35d0a1]" /> Auto-Zoom Active
        </div>
      </div>

      <div className="timeline-body flex-1 p-2.5 px-4 flex flex-col justify-center gap-1.5">
        <div className="timeline-clip-track">
          <div className="timeline-ruler">
            {uniqueTimelineTicks.map((time) => (
              <span key={time}>{formatTimelineTime(time)}</span>
            ))}
          </div>
          <div className="playhead" style={{ left: `${progress}%` }} aria-hidden="true"><span /></div>
          <input
            type="range"
            min={0}
            max={durationSeconds || 0}
            step={0.01}
            value={Math.min(currentSeconds, durationSeconds || 0)}
            onChange={(event) => onSeek(Number(event.target.value))}
            disabled={!canPlay || !hasDuration}
            className="timeline-scrubber"
            aria-label="Video position"
          />
          <div className="clip-bar rounded-md flex items-center px-2.5 text-[11px] font-semibold gap-2">
            <Film size={13} />
            <span>Master Screen Recording Clip</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="timeline-badge text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
            <Sparkles size={10} /> Dynamic Zoom 1.32x
          </span>
          <span className="timeline-badge text-[10px] font-semibold px-2 py-0.5 rounded-md">
            Focus Lock
          </span>
        </div>
      </div>
    </footer>
  );
};

function formatTimelineTime(seconds: number) {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}