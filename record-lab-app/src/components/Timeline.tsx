import React from 'react';
import { Film, Pause, Play, Scissors, Trash2, Plus, Undo2, Redo2 } from 'lucide-react';

export interface TimelineSegment {
  id: number;
  start: number;
  end: number;
}

interface TimelineProps {
  isPlaying: boolean;
  currentTime: string;
  totalTime: string;
  currentSeconds: number;
  durationSeconds: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  canPlay: boolean;
  segments: TimelineSegment[];
  selectedSegmentId: number | null;
  onSplit: () => void;
  onDeleteSegment: () => void;
  onSelectSegment: (id: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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
  segments,
  selectedSegmentId,
  onSplit,
  onDeleteSegment,
  onSelectSegment,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const [timelineZoom, setTimelineZoom] = React.useState(1);
  const hasDuration = durationSeconds > 0;
  const editedDuration = segments.reduce((total, segment) => total + (segment.end - segment.start), 0);
  const timelineDuration = segments.length > 0 ? editedDuration : durationSeconds;
  const getEditedTime = (sourceTime: number) => {
    let editedTime = 0;
    for (const segment of segments) {
      if (sourceTime >= segment.start && sourceTime <= segment.end) {
        return editedTime + sourceTime - segment.start;
      }
      editedTime += segment.end - segment.start;
    }
    return sourceTime < (segments[0]?.start ?? 0) ? 0 : editedTime;
  };
  const getSourceTime = (editedTime: number) => {
    let remaining = Math.max(0, editedTime);
    for (const segment of segments) {
      const segmentDuration = segment.end - segment.start;
      if (remaining <= segmentDuration) return segment.start + remaining;
      remaining -= segmentDuration;
    }
    return segments.length > 0 ? segments[segments.length - 1].end : editedTime;
  };
  const editedCurrentTime = getEditedTime(currentSeconds);
  const progress = timelineDuration > 0 ? Math.min(100, (editedCurrentTime / timelineDuration) * 100) : 0;
  const tickInterval = timelineDuration <= 30
    ? 5
    : timelineDuration <= 60
      ? 10
      : timelineDuration <= 120
        ? 15
        : timelineDuration <= 300
          ? 30
          : 60;
  const timelineTicks = timelineDuration > 0
    ? Array.from({ length: Math.floor(timelineDuration / tickInterval) + 1 }, (_, index) => index * tickInterval)
        .filter((time) => time < timelineDuration)
        .concat(timelineDuration)
    : [0];
  const uniqueTimelineTicks = [...new Set(timelineTicks)];

  return (
    <footer className="timeline flex flex-col shrink-0">
      <div className="timeline-toolbar flex items-center justify-between">
        <div className="flex gap-2">
          <button className="timeline-button flex items-center gap-1.5 hidden"><Plus size={12} /> Add Track</button>
          <button onClick={onSplit} disabled={!canPlay || !hasDuration} className="timeline-button flex items-center gap-1.5">
            <Scissors size={12} /> Split
          </button>
          <button onClick={onDeleteSegment} disabled={selectedSegmentId === null || segments.length <= 1} className="timeline-button flex items-center gap-1.5">
            <Trash2 size={12} /> Delete
          </button>
          <button onClick={onUndo} disabled={!canUndo} className="timeline-icon-button" title="Undo timeline edit" aria-label="Undo timeline edit">
            <Undo2 size={13} />
          </button>
          <button onClick={onRedo} disabled={!canRedo} className="timeline-icon-button" title="Redo timeline edit" aria-label="Redo timeline edit">
            <Redo2 size={13} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-400">{formatTimelineTime(editedCurrentTime)}</span>
          <button
            onClick={onTogglePlay}
            disabled={!canPlay}
            className="play-button hover:scale-105 active:scale-95 cursor-pointer transition-transform"
          >
            {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          </button>
          <span className="font-mono text-xs text-slate-400">{formatTimelineTime(timelineDuration)}</span>
        </div>

        <label className="timeline-zoom-control">
          <span>Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.25"
            value={timelineZoom}
            onChange={(event) => setTimelineZoom(Number(event.target.value))}
            aria-label="Timeline zoom"
          />
          <span>{timelineZoom.toFixed(2)}x</span>
        </label>
      </div>

      <div className="timeline-body flex-1 p-2.5 px-4 flex flex-col justify-center gap-1.5">
        <div className="timeline-clip-track" style={{ width: `${timelineZoom * 100}%` }}>
          <div className="timeline-ruler">
            {uniqueTimelineTicks.map((time) => (
              <span key={time}>{formatTimelineTime(time)}</span>
            ))}
          </div>
          <div className="playhead" style={{ left: `${progress}%` }} aria-hidden="true"><span /></div>
          <input
            type="range"
            min={0}
            max={timelineDuration || 0}
            step={0.01}
            value={Math.min(editedCurrentTime, timelineDuration || 0)}
            onChange={(event) => onSeek(getSourceTime(Number(event.target.value)))}
            disabled={!canPlay || !timelineDuration}
            className="timeline-scrubber"
            aria-label="Video position"
          />
          <div className="timeline-segments">
            {segments.map((segment) => (
              <button
                key={segment.id}
                type="button"
                onClick={() => onSelectSegment(segment.id)}
                className={`clip-bar rounded-md flex items-center px-2.5 text-[11px] font-semibold gap-2 timeline-segment ${selectedSegmentId === segment.id ? 'selected' : ''}`}
                style={{ left: `${(segments.slice(0, segments.indexOf(segment)).reduce((total, item) => total + item.end - item.start, 0) / timelineDuration) * 100}%`, width: `${((segment.end - segment.start) / timelineDuration) * 100}%` }}
                title={`${formatTimelineTime(segment.start)} - ${formatTimelineTime(segment.end)}`}
              >
                <Film size={13} />
                <span>Screen Recording</span>
              </button>
            ))}
          </div>
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