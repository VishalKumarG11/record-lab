import React from 'react';
import { Brush, MousePointer2, Settings } from 'lucide-react';

interface LeftDockProps {
  isThemeOpen: boolean;
  onToggleTheme: () => void;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
}

export const LeftDock: React.FC<LeftDockProps> = ({
  isThemeOpen,
  onToggleTheme,
  isSettingsOpen,
  onToggleSettings,
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
      <button title="Dynamic Cursor" className="dock-button">
        <MousePointer2 size={17} />
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