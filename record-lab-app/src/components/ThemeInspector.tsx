import React from 'react';
import { ImagePlus, X } from 'lucide-react';

interface ThemeInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBackground: (bg: string) => void;
  onUploadCustomBg: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PRESETS = [
  'linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #d946ef 100%)',
  'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  '#090d16',
];

export const ThemeInspector: React.FC<ThemeInspectorProps> = ({
  isOpen,
  onClose,
  onSelectBackground,
  onUploadCustomBg,
}) => {
  if (!isOpen) return null;

  return (
    <div className="inspector absolute backdrop-blur-md z-20 flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-[#263536] pb-3">
        <span className="inspector-title font-bold uppercase">Canvas Theme</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded"><X size={14} /></button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="inspector-label">Gradient Presets</span>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => onSelectBackground(preset)}
              style={{ background: preset }}
              className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer"
            />
          ))}

          <label className="relative w-6 h-6 rounded-full border border-slate-600 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
            <input
              type="color"
              defaultValue="#6366f1"
              onChange={(e) => onSelectBackground(e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="inspector-label">Wallpaper Image</span>
        <label className="inspector-upload w-full cursor-pointer hover:bg-[#203031] transition-colors flex items-center justify-center gap-2">
          <ImagePlus size={14} /> Choose Custom Image
          <input type="file" accept="image/*" onChange={onUploadCustomBg} className="hidden" />
        </label>
      </div>
    </div>
  );
};