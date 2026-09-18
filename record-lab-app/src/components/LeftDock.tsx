import React from 'react';
import { Brush, Settings, Volume2 } from 'lucide-react';

interface LeftDockProps {
  isThemeOpen: boolean;
  onToggleTheme: () => void;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  isAudioOpen: boolean;
  onToggleAudio: () => void;
}

export const LeftDock: React.FC<LeftDockProps> = ({
  isThemeOpen,
  onToggleTheme,
  isSettingsOpen,
  onToggleSettings,
  isAudioOpen,
  onToggleAudio,
}) => {
  return (
    <aside className="tool-dock flex flex-col items-center gap-3 z-25 shrink-0">
      <button
        onClick={onToggleTheme}
        title="Canvas & Themes"
        className={`dock-button ${isThemeOpen ? 'active' : ''}`}
      >
        <Brush size={17} />
      </button>
      <button
        title="Audio"
        onClick={onToggleAudio}
        className={`dock-button ${isAudioOpen ? 'active' : ''}`}
      >
        <Volume2 size={17} />
      </button>
      <button
        title="Settings"
        onClick={onToggleSettings}
        className={`dock-button ${isSettingsOpen ? 'active' : ''}`}
      >
        <Settings size={17} />
      </button>
    </aside>
  );
};