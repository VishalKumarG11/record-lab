import React, { forwardRef } from 'react';
import { Maximize2 } from 'lucide-react';
import type { AspectRatioType } from '../types';

interface CenterStageProps {
  aspectRatio: AspectRatioType;
  backgroundStyle: React.CSSProperties;
  onAspectRatioChange: (ratio: AspectRatioType) => void;
  onCanvasClick: () => void;
}

const RATIO_MAP: Record<AspectRatioType, string> = {
  '16:9': '16 / 9',
  '9:16': '9 / 16',
  '1:1': '1 / 1',
  '4:3': '4 / 3',
};

export const CenterStage = forwardRef<HTMLCanvasElement, CenterStageProps>(
  ({ aspectRatio, backgroundStyle, onAspectRatioChange, onCanvasClick }, ref) => {
    return (
      <main className="stage flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Floating Aspect Ratio Bar */}
        <div className="stage-toolbar absolute flex items-center gap-2 backdrop-blur-md z-10">
          <select
            value={aspectRatio}
            onChange={(e) => onAspectRatioChange(e.target.value as AspectRatioType)}
            className="stage-select outline-none cursor-pointer"
          >
            <option value="16:9" className="bg-[#131722]">16:9</option>
            <option value="9:16" className="bg-[#131722]">9:16</option>
            <option value="1:1" className="bg-[#131722]">1:1</option>
            <option value="4:3" className="bg-[#131722]">4:3</option>
          </select>
          <span className="stage-fit"><Maximize2 size={12} /> Fit Screen</span>
        </div>

        {/* Scaled Responsive Canvas Container */}
        <div className="stage-content flex items-center justify-center overflow-hidden">
          <div
            style={{
              aspectRatio: RATIO_MAP[aspectRatio],
              ...backgroundStyle,
            }}
            className="canvas-frame flex items-center justify-center transition-all duration-300 overflow-hidden"
          >
            <canvas
              ref={ref}
              onClick={onCanvasClick}
              className="w-full h-auto block object-contain cursor-pointer"
            />
          </div>
        </div>
      </main>
    );
  }
);
CenterStage.displayName = 'CenterStage';