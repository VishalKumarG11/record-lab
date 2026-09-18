import React from 'react';
import { Download, Play, Square,CircleCheck } from 'lucide-react';
import type { AspectRatioType, QualityType } from '../types';
import logoUrl from '../assets/record-lab-logo.svg';

interface TopNavbarProps {
  isRecording: boolean;
  canPreview: boolean;
  canExport: boolean;
  isExporting: boolean;
  exportComplete: boolean;
  exportProgress: number;
  aspectRatio: AspectRatioType;
  recordingTime: string;
  selectedQuality: QualityType;
  onQualityChange: (quality: QualityType) => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onExport: () => void;
  onCancelExport: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  isRecording,
  canPreview,
  canExport,
  isExporting,
  exportComplete,
  exportProgress,
  aspectRatio,
  recordingTime,
  selectedQuality,
  onQualityChange,
  onStartRecord,
  onStopRecord,
  onExport,
  onCancelExport,
}) => {
  return (
    <header className="top-bar flex items-center justify-between z-30 shrink-0">
      <div className="flex items-center gap-3">
        <div className="brand-mark">
          <img src={logoUrl} alt="record-lab" />
        </div>
        <div className="project-chip hidden">
          <span className={`status-light ${isRecording ? 'recording' : ''}`} />
          <span>Record-lab Studio</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={selectedQuality}
          disabled={isRecording || !canExport}
          onChange={(e) => onQualityChange(e.target.value as QualityType)}
          className="quality-select outline-none cursor-pointer"
        >
          <option value="240">240p</option>
          <option value="360">360p</option>
          <option value="480">480p</option>
          <option value="720">720p HD</option>
          <option value="1080">1080p FHD</option>
          <option value="2160">2160p 4K</option>
        </select>

        {!isRecording ? (
          <button
            onClick={onStartRecord}
            className="record-button"
          >
            <Play size={12} fill="currentColor" /> Start New Recording
          </button>
        ) : (
          <button
            onClick={onStopRecord}
            className="record-button"
          >
            <span className="recording-indicator" aria-hidden="true" />
            <span className="recording-time">{recordingTime}</span>
            <Square size={11} fill="currentColor" /> Stop & Preview
          </button>
        )}

        <button
          onClick={onExport}
          disabled={!canExport || isRecording || isExporting}
          className="export-button"
        >
          <Download size={13} /> Export MP4
        </button>

      </div>

      {(isExporting || exportComplete) && (
        <div className="export-progress-popup" role="status" aria-live="polite">
          {exportComplete ? (
            <div className="export-success-message">
              <CircleCheck />
              <div>
                <strong>Video exported successfully</strong>
                <span>Your video is ready to use.</span>
              </div>
            </div>
          ) : (
            <div className="export-progress-header">
                <div className="export-progress-title">
                  <strong>Exporting mp4 Video</strong>
                  <span>Preparing your video file</span>
                </div>
              <button className="export-cancel-button" onClick={onCancelExport}>Cancel</button>
            </div>
          )}
          {isExporting && (
            <>
              <div className="export-progress-track" aria-label={`${Math.round(exportProgress)}% complete`}>
                <span style={{ width: `${Math.max(3, exportProgress)}%` }} />
              </div>
              <div className="export-progress-percent">{Math.round(exportProgress)}% complete</div>
              <div className="export-progress-details">
                <span>Quality <strong>{selectedQuality}p</strong></span>
                <span>Resolution <strong>{aspectRatio}</strong></span>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};