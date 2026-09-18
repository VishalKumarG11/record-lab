import React, { useState, useRef, useEffect } from 'react';
import { TopNavbar } from './components/TopNavbar';
import { LeftDock } from './components/LeftDock';
import { ThemeInspector } from './components/ThemeInspector';
import { CenterStage } from './components/CenterStage';
import { Timeline } from './components/Timeline';
import type { AspectRatioType, QualityType, MousePoint, ResolutionPreset } from './types';

const RESOLUTION_PRESETS: Record<QualityType, ResolutionPreset> = {
  '240':  { width: 426,  height: 240,  bitrate: 800000 },
  '360':  { width: 640,  height: 360,  bitrate: 1500000 },
  '720':  { width: 1280, height: 720,  bitrate: 6000000 },
  '1080': { width: 1920, height: 1080, bitrate: 14000000 },
  '2160': { width: 3840, height: 2160, bitrate: 45000000 },
};

const getExportDimensions = (quality: QualityType, ratio: AspectRatioType) => {
  const { width, height } = RESOLUTION_PRESETS[quality];
  const dimensions: Record<AspectRatioType, { width: number; height: number }> = {
    '16:9': { width, height },
    '9:16': { width: height, height: width },
    '1:1': { width: height, height },
    '4:3': { width: Math.round(height * 4 / 3), height },
  };
  return dimensions[ratio];
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [canPreview, setCanPreview] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [totalTime, setTotalTime] = useState('0:00');
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [recordingTime, setRecordingTime] = useState('0:00');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('16:9');
  const [selectedQuality, setSelectedQuality] = useState<QualityType>('1080');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [bgStyle, setBgStyle] = useState<React.CSSProperties>({
    background: '#ffffff',
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const exportRecorderRef = useRef<MediaRecorder | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCancelledRef = useRef(false);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const sourceDimensionsRef = useRef({ width: 1920, height: 1080 });
  const cursorStateRef = useRef({ x: 960, y: 540, targetX: 960, targetY: 540, visible: false });
  const recordedChunksRef = useRef<Blob[]>([]);
  const mouseDataRef = useRef<MousePoint[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const zoomState = useRef({
    currentScale: 1.0,
    currentFocusX: 960,
    currentFocusY: 540,
    stableScale: 1.0,
    stableTargetX: 960,
    stableTargetY: 540,
    zoomHoldUntil: 0,
  });
  const recordingStartTimeRef = useRef<number>(0);
  const recordedDurationRef = useRef<number>(0);

  useEffect(() => {
    if (!isRecording) return;

    const updateRecordingTime = () => {
      const elapsedSeconds = (Date.now() - recordingStartTimeRef.current) / 1000;
      setRecordingTime(formatSeconds(elapsedSeconds));
    };

    updateRecordingTime();
    const timer = window.setInterval(updateRecordingTime, 250);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    const video = document.createElement('video');
    video.playsInline = true;
    videoRef.current = video;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && videoRef.current && videoRef.current.duration) {
        e.preventDefault();
        togglePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatSeconds = (sec: number) => {
  if (!isFinite(sec) || isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

  useEffect(() => {
    const imageUrl = typeof bgStyle.backgroundImage === 'string'
      ? bgStyle.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]
      : null;
    if (!imageUrl) {
      backgroundImageRef.current = null;
      drawFrame();
      return;
    }

    const image = new Image();
    image.onload = () => {
      backgroundImageRef.current = image;
      drawFrame();
    };
    image.src = imageUrl;
  }, [bgStyle]);

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const image = backgroundImageRef.current;
    if (image?.complete && image.naturalWidth > 0) {
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const imageWidth = image.naturalWidth * scale;
      const imageHeight = image.naturalHeight * scale;
      ctx.drawImage(image, (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight);
      return;
    }

    const background = typeof bgStyle.background === 'string' ? bgStyle.background : '#ffffff';
    const colors = background.match(/#[0-9a-fA-F]{6}/g);
    if (background.startsWith('linear-gradient') && colors?.length) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      colors.forEach((color, index) => gradient.addColorStop(index / Math.max(colors.length - 1, 1), color));
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = background;
    }
    ctx.fillRect(0, 0, width, height);
  };

  const drawCursor = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => {
    const size = 34 / Math.max(scale, 0.01);
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8 / Math.max(scale, 0.01);
    ctx.shadowOffsetY = 3 / Math.max(scale, 0.01);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.5 / Math.max(scale, 0.01);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.72, size * 0.78);
    ctx.lineTo(size * 0.43, size * 0.73);
    ctx.lineTo(size * 0.29, size * 1.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const drawFrame = (targetCanvas = canvasRef.current) => {
    const canvas = targetCanvas;
    const video = videoRef.current;
    const previewCanvas = canvasRef.current;
    if (!canvas || !video || !previewCanvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseWidth = sourceDimensionsRef.current.width;
    const baseHeight = sourceDimensionsRef.current.height;
    const padding = Math.min(canvas.width, canvas.height) * 0.08;
    const fitScale = Math.min((canvas.width - padding * 2) / baseWidth, (canvas.height - padding * 2) / baseHeight);
    const sceneWidth = baseWidth * fitScale;
    const sceneHeight = baseHeight * fitScale;
    const offsetX = (canvas.width - sceneWidth) / 2;
    const offsetY = (canvas.height - sceneHeight) / 2;

    drawBackground(ctx, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX + sceneWidth / 2, offsetY + sceneHeight / 2);
    ctx.scale(fitScale * zoomState.current.currentScale, fitScale * zoomState.current.currentScale);
    ctx.translate(-zoomState.current.currentFocusX, -zoomState.current.currentFocusY);
    ctx.drawImage(video, 0, 0, baseWidth, baseHeight);
    if (cursorStateRef.current.visible) {
      drawCursor(ctx, cursorStateRef.current.x, cursorStateRef.current.y, fitScale * zoomState.current.currentScale);
    }
    ctx.restore();
  };

  const startZoomLoop = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const lerp = (start: number, end: number, f: number) => start + (end - start) * f;

    const render = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && !video.paused && !video.ended) {
        const currentTimeMs = video.currentTime * 1000;
        setCurrentSeconds(video.currentTime);
        setCurrentTime(formatSeconds(video.currentTime));

        if (mouseDataRef.current.length > 0) {
          const recent = mouseDataRef.current.filter(
            p => p.time >= currentTimeMs - 350 && p.time <= currentTimeMs
          );

          if (recent.length >= 2) {
            const first = recent[0];
            const last = recent[recent.length - 1];
            cursorStateRef.current.visible = true;
            cursorStateRef.current.targetX = (last.x / window.screen.width) * sourceDimensionsRef.current.width;
            cursorStateRef.current.targetY = (last.y / window.screen.height) * sourceDimensionsRef.current.height;
            const delta = Math.hypot(last.x - first.x, last.y - first.y);
            const isTaskbar = last.y > (window.screen.height - 70);

            if (delta > 260 || isTaskbar) {
              zoomState.current.stableScale = 1.0;
              zoomState.current.stableTargetX = sourceDimensionsRef.current.width / 2;
              zoomState.current.stableTargetY = sourceDimensionsRef.current.height / 2;
              zoomState.current.zoomHoldUntil = 0;
            } else if (delta > 15 && delta < 180) {
              zoomState.current.stableScale = 1.32;
              const rawX = cursorStateRef.current.targetX;
              const rawY = cursorStateRef.current.targetY;
              const halfW = sourceDimensionsRef.current.width / (2 * zoomState.current.stableScale);
              const halfH = sourceDimensionsRef.current.height / (2 * zoomState.current.stableScale);

              zoomState.current.stableTargetX = clamp(rawX, halfW, sourceDimensionsRef.current.width - halfW);
              zoomState.current.stableTargetY = clamp(rawY, halfH, sourceDimensionsRef.current.height - halfH);
              zoomState.current.zoomHoldUntil = currentTimeMs + 1600;
            }
          }
        }

        if (currentTimeMs > zoomState.current.zoomHoldUntil) {
          zoomState.current.stableScale = 1.0;
          zoomState.current.stableTargetX = sourceDimensionsRef.current.width / 2;
          zoomState.current.stableTargetY = sourceDimensionsRef.current.height / 2;
        }

        zoomState.current.currentScale = lerp(zoomState.current.currentScale, zoomState.current.stableScale, 0.055);
        zoomState.current.currentFocusX = lerp(zoomState.current.currentFocusX, zoomState.current.stableTargetX, 0.075);
        zoomState.current.currentFocusY = lerp(zoomState.current.currentFocusY, zoomState.current.stableTargetY, 0.075);
        cursorStateRef.current.x = lerp(cursorStateRef.current.x, cursorStateRef.current.targetX, 0.16);
        cursorStateRef.current.y = lerp(cursorStateRef.current.y, cursorStateRef.current.targetY, 0.16);

        drawFrame();
        if (exportCanvasRef.current) drawFrame(exportCanvasRef.current);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingTime('0:00');
      recordingStartTimeRef.current = Date.now();
      setCanPreview(false);
      const sources = await window.electronAPI.getSources();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sources[0].id,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
          },
        } as any,
      });

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const video = videoRef.current;
        if (!video) return;

        video.src = URL.createObjectURL(blob);
        video.load();

        video.onloadedmetadata = () => {
  if (canvasRef.current) {
      sourceDimensionsRef.current = {
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
      };
      canvasRef.current.width = sourceDimensionsRef.current.width;
      canvasRef.current.height = sourceDimensionsRef.current.height;
      zoomState.current.currentFocusX = sourceDimensionsRef.current.width / 2;
      zoomState.current.currentFocusY = sourceDimensionsRef.current.height / 2;
  }

  const finalDuration = isFinite(video.duration) && !isNaN(video.duration)
    ? video.duration
    : recordedDurationRef.current;

  setDurationSeconds(finalDuration);
  setCurrentSeconds(0);
  setCurrentTime('0:00');
  setTotalTime(formatSeconds(finalDuration));
  video.play();
  setIsPlaying(true);
  startZoomLoop();
  setCanPreview(true);
};
      };

      mediaRecorderRef.current = recorder;
      await window.electronAPI.startMouseTracking();
      mediaRecorderRef.current = recorder;
      await window.electronAPI.startMouseTracking();
      recorder.start(200);
      // recorder.start(200);
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
  if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
    const elapsedSec = Math.max(0, (Date.now() - recordingStartTimeRef.current) / 1000);
    recordedDurationRef.current = elapsedSec;
    setRecordingTime(formatSeconds(elapsedSec));
    setTotalTime(formatSeconds(elapsedSec)); // Turant exact duration display hoga

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    mouseDataRef.current = await window.electronAPI.stopMouseTracking();
  }
  setIsRecording(false);
};

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
      startZoomLoop();
    } else {
      video.pause();
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      drawFrame();
    }
  };

  const seekVideo = (time: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    video.currentTime = Math.max(0, Math.min(time, video.duration));
    setCurrentSeconds(video.currentTime);
    setCurrentTime(formatSeconds(video.currentTime));
    drawFrame();
  };

  const handleExport = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.duration) return;

    setIsExporting(true);
    setExportProgress(0);
    exportCancelledRef.current = false;
    const preset = RESOLUTION_PRESETS[selectedQuality];
    const exportDimensions = getExportDimensions(selectedQuality, aspectRatio);

    video.currentTime = 0;
    video.pause();

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportDimensions.width;
    exportCanvas.height = exportDimensions.height;
    exportCanvasRef.current = exportCanvas;
    drawFrame(exportCanvas);

    const canvasStream = exportCanvas.captureStream(60);
    const chunks: Blob[] = [];
    const exportRecorder = new MediaRecorder(canvasStream, {
      mimeType: 'video/webm',
      videoBitsPerSecond: preset.bitrate,
    });

    exportRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    exportRecorder.onstop = () => {
      exportRecorderRef.current = null;
      exportCanvasRef.current = null;
      if (exportCancelledRef.current) return;
      const finalBlob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `record-lab-${selectedQuality}p-${Date.now()}.webm`;
      a.click();

      setExportProgress(100);
      setIsExporting(false);
      video.play();
      setIsPlaying(true);
      startZoomLoop();
    };

    exportRecorderRef.current = exportRecorder;
    exportRecorder.start();
    video.ontimeupdate = () => {
      setExportProgress(Math.min(99, (video.currentTime / video.duration) * 100));
    };
    await video.play();
    startZoomLoop();

    video.onended = () => {
      exportRecorder.stop();
      video.onended = null;
      video.ontimeupdate = null;
    };
  };

  const cancelExport = () => {
    const video = videoRef.current;
    const exportRecorder = exportRecorderRef.current;
    exportCancelledRef.current = true;
    if (exportRecorder?.state === 'recording') exportRecorder.stop();
    if (video) {
      video.onended = null;
      video.ontimeupdate = null;
      video.pause();
      video.currentTime = 0;
    }
    exportCanvasRef.current = null;
    setIsExporting(false);
    setExportProgress(0);
  };

  return (
    <div className="app-shell flex flex-col h-screen overflow-hidden">
      <TopNavbar
        isRecording={isRecording}
        canPreview={canPreview}
        canExport={canPreview}
        isExporting={isExporting}
        exportProgress={exportProgress}
        aspectRatio={aspectRatio}
        recordingTime={recordingTime}
        selectedQuality={selectedQuality}
        onQualityChange={setSelectedQuality}
        onStartRecord={startRecording}
        onStopRecord={stopRecording}
        onExport={handleExport}
        onCancelExport={cancelExport}
      />

      <div className="workspace flex flex-1 relative overflow-hidden">
        <LeftDock
          isThemeOpen={isThemeOpen}
          onToggleTheme={() => setIsThemeOpen(prev => !prev)}
        />

        <ThemeInspector
          isOpen={isThemeOpen}
          onClose={() => setIsThemeOpen(false)}
          onSelectBackground={(bg) => setBgStyle({ background: bg })}
          onUploadCustomBg={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                setBgStyle({
                  backgroundImage: `url(${event.target?.result})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                });
              };
              reader.readAsDataURL(file);
            }
          }}
        />

        <CenterStage
          ref={canvasRef}
          aspectRatio={aspectRatio}
          backgroundStyle={bgStyle}
          onAspectRatioChange={setAspectRatio}
          onCanvasClick={togglePlayPause}
        />
      </div>

      <Timeline
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalTime={totalTime}
        currentSeconds={currentSeconds}
        durationSeconds={durationSeconds}
        onTogglePlay={togglePlayPause}
        onSeek={seekVideo}
        canPlay={canPreview}
      />
    </div>
  );
};
export default App;