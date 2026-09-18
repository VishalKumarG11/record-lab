export interface MousePoint {
  x: number;
  y: number;
  time: number;
}

export type AspectRatioType = '16:9' | '9:16' | '1:1' | '4:3';
export type QualityType = '240' | '360' | '480' | '720' | '1080' | '2160';

export interface ResolutionPreset {
  width: number;
  height: number;
  bitrate: number;
}

declare global {
  interface Window {
    electronAPI: {
      getSources: () => Promise<Array<{ id: string; name: string }>>;
      startMouseTracking: () => Promise<boolean>;
      stopMouseTracking: () => Promise<MousePoint[]>;
      chooseExportDirectory: () => Promise<string | null>;
      saveExportedVideo: (directory: string, fileName: string, data: Uint8Array) => Promise<string>;
    };
  }
}