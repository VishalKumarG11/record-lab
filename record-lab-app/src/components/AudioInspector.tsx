import React from 'react';
import { Volume2, X } from 'lucide-react';

type AudioMode = 'system' | 'system-mic' | 'none';

interface AudioInspectorProps {
  isOpen: boolean;
  audioMode: AudioMode;
  onClose: () => void;
  onAudioModeChange: (mode: AudioMode) => void;
}

const OPTIONS: Array<{ value: AudioMode; label: string; description: string }> = [
  { value: 'system', label: 'Screen recording with system audio', description: 'Capture audio from the recorded screen.' },
  { value: 'system-mic', label: 'System audio + external mic', description: 'Capture system audio and add your voiceover. Default.' },
  { value: 'none', label: 'Screen recording without audio', description: 'Record video only.' },
];

export const AudioInspector: React.FC<AudioInspectorProps> = ({
  isOpen,
  audioMode,
  onClose,
  onAudioModeChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="inspector audio-inspector absolute backdrop-blur-md z-20 flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-[#263536] pb-3">
        <span className="inspector-title font-bold uppercase">Audio</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded" title="Close audio settings">
          <X size={14} />
        </button>
      </div>
      <div className="audio-options">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`audio-option ${audioMode === option.value ? 'active' : ''}`}
            onClick={() => onAudioModeChange(option.value)}
            aria-pressed={audioMode === option.value}
          >
            <span className="audio-option-icon" aria-hidden="true"><Volume2 size={13} /></span>
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
            <span className="audio-option-check" aria-hidden="true">{audioMode === option.value ? '✓' : ''}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
