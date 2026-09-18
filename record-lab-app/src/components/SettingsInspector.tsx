import React from 'react';
import { FolderOpen, X } from 'lucide-react';
import type { QualityType } from '../types';

type RecordingMode = 'normal' | 'animated';

interface SettingsInspectorProps {
  isOpen: boolean;
  recordingMode: RecordingMode;
  defaultQuality: QualityType;
  exportDirectory: string;
  onClose: () => void;
  onRecordingModeChange: (mode: RecordingMode) => void;
  onDefaultQualityChange: (quality: QualityType) => void;
  onChooseExportDirectory: () => void;
}

export const SettingsInspector: React.FC<SettingsInspectorProps> = ({
  isOpen,
  recordingMode,
  defaultQuality,
  exportDirectory,
  onClose,
  onRecordingModeChange,
  onDefaultQualityChange,
  onChooseExportDirectory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="inspector settings-inspector absolute backdrop-blur-md z-20 flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-[#263536] pb-3">
        <span className="inspector-title font-bold uppercase">Recording Settings</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded" title="Close settings">
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="inspector-label">Recording Mode</span>
        <button
          type="button"
          className={`settings-mode-option ${recordingMode === 'normal' ? 'active' : ''}`}
          onClick={() => onRecordingModeChange('normal')}
          aria-pressed={recordingMode === 'normal'}
        >
          <span className="settings-mode-toggle" aria-hidden="true"><span /></span>
          <span>
            <strong>Normal Recording</strong>
            <small>Original recording without zoom or cursor effects</small>
          </span>
        </button>
        <button
          type="button"
          className={`settings-mode-option ${recordingMode === 'animated' ? 'active' : ''}`}
          onClick={() => onRecordingModeChange('animated')}
          aria-pressed={recordingMode === 'animated'}
        >
          <span className="settings-mode-toggle" aria-hidden="true"><span /></span>
          <span>
            <strong>Animated Recording</strong>
            <small>Smooth zoom and polished cursor tracking</small>
          </span>
        </button>
      </div>

      <div className="settings-quality-group">
        <label htmlFor="default-recording-quality" className="inspector-label">Default Recording Resolution</label>
        <select
          id="default-recording-quality"
          value={defaultQuality}
          onChange={(event) => onDefaultQualityChange(event.target.value as QualityType)}
          className="settings-quality-select"
        >
          <option value="240">240p</option>
          <option value="360">360p</option>
          <option value="480">480p</option>
          <option value="720">720p</option>
          <option value="1080">1080p</option>
        </select>
      </div>

      <div className="settings-quality-group">
        <span className="inspector-label">Export Location</span>
        <button type="button" className="settings-folder-button" onClick={onChooseExportDirectory}>
          <FolderOpen size={14} />
          <span>{exportDirectory || 'Choose export folder'}</span>
        </button>
      </div>
    </div>
  );
};
