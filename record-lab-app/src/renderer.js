// Global Configuration Presets
const CONTAINER_DIMENSIONS = {
  '16:9': { w: 960, h: 540 },
  '9:16': { w: 340, h: 600 },
  '1:1':  { w: 540, h: 540 },
  '4:3':  { w: 720, h: 540 }
};

const RESOLUTION_PRESETS = {
  '240':  { width: 426,  height: 240,  bitrate: 800000 },
  '360':  { width: 640,  height: 360,  bitrate: 1500000 },
  '720':  { width: 1280, height: 720,  bitrate: 6000000 },
  '1080': { width: 1920, height: 1080, bitrate: 14000000 },
  '2160': { width: 3840, height: 2160, bitrate: 45000000 }
};

// State Variables
let mediaRecorder;
let recordedChunks = [];
let recordedMouseData = [];
let animFrameId = null;
let currentAspectRatio = '16:9';

// Camera smoothing state
let currentScale = 1.0;
let currentFocusX = 960;
let currentFocusY = 540;

// DOM Elements
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const exportBtn = document.getElementById('exportBtn');
const qualitySelect = document.getElementById('qualitySelect');
const aspectRatioSelect = document.getElementById('aspectRatioSelect');
const exportStatus = document.getElementById('exportStatus');
const previewVideo = document.getElementById('preview');
const canvas = document.getElementById('zoomCanvas');
const ctx = canvas.getContext('2d');
const canvasContainer = document.querySelector('.canvas-container');
const colorDots = document.querySelectorAll('.color-dot');
const designerColorPicker = document.getElementById('designerColorPicker');
const customBgUpload = document.getElementById('customBgUpload');
const playPauseBtn = document.getElementById('playPauseBtn');

// 1. RECORDING START
recordBtn.addEventListener('click', async () => {
  try {
    recordBtn.disabled = true;
    recordBtn.innerText = 'Recording...';
    if (exportBtn) exportBtn.disabled = true;

    const sources = await window.electronAPI.getSources();
    const entireScreen = sources[0];

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: entireScreen.id,
          minWidth: 1280,
          maxWidth: 1920,
          minHeight: 720,
          maxHeight: 1080
        }
      }
    });

    recordedChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
      ? 'video/webm; codecs=vp9'
      : 'video/webm';

    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      previewVideo.src = URL.createObjectURL(blob);
      previewVideo.load();

      previewVideo.onloadedmetadata = () => {
        canvas.width = previewVideo.videoWidth || 1920;
        canvas.height = previewVideo.videoHeight || 1080;
        currentFocusX = canvas.width / 2;
        currentFocusY = canvas.height / 2;
        currentScale = 1.0;

        previewVideo.play();
        startZoomPlayback();

        if (playPauseBtn) {
          playPauseBtn.disabled = false;
          playPauseBtn.innerText = 'Pause';
        }      

        if (exportBtn) exportBtn.disabled = false;
        if (qualitySelect) qualitySelect.disabled = false;
      };
    };

    await window.electronAPI.startMouseTracking();
    mediaRecorder.start(200);
    stopBtn.disabled = false;

    stream.getVideoTracks()[0].onended = () => {
      stopRecording();
    };

  } catch (err) {
    console.error("Recording error:", err);
    recordBtn.disabled = false;
    recordBtn.innerText = 'Start Recording';
    stopBtn.disabled = true;
  }
});

// 2. RECORDING STOP
stopBtn.addEventListener('click', () => {
  stopRecording();
});

async function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    recordedMouseData = await window.electronAPI.stopMouseTracking();
  }
  recordBtn.disabled = false;
  recordBtn.innerText = 'Start Recording';
  stopBtn.disabled = true;
}

// 3. STABILIZED AUTO-ZOOM PLAYBACK ENGINE
function startZoomPlayback() {
  if (animFrameId) cancelAnimationFrame(animFrameId);

  const lerp = (start, end, factor) => start + (end - start) * factor;
  let zoomHoldUntil = 0;
  let stableTargetX = canvas.width / 2;
  let stableTargetY = canvas.height / 2;
  let stableScale = 1.0;

  function renderFrame() {
    if (!previewVideo.paused && !previewVideo.ended) {
      const currentTimeMs = previewVideo.currentTime * 1000;

      if (recordedMouseData.length > 0) {
        const recentPoints = recordedMouseData.filter(
          p => p.time >= currentTimeMs - 350 && p.time <= currentTimeMs
        );

        if (recentPoints.length >= 2) {
          const first = recentPoints[0];
          const last = recentPoints[recentPoints.length - 1];
          const movementDelta = Math.hypot(last.x - first.x, last.y - first.y);

          const screenH = window.screen.height || 1080;
          const isNearTaskbar = last.y > (screenH - 70);

          if (movementDelta > 260 || isNearTaskbar) {
            stableScale = 1.0;
            stableTargetX = canvas.width / 2;
            stableTargetY = canvas.height / 2;
            zoomHoldUntil = 0;
          } else if (movementDelta > 15 && movementDelta < 180) {
            stableScale = 1.32;

            const rawX = (last.x / window.screen.width) * canvas.width;
            const rawY = (last.y / window.screen.height) * canvas.height;

            const halfW = canvas.width / (2 * stableScale);
            const halfH = canvas.height / (2 * stableScale);

            const clampedX = Math.max(halfW, Math.min(rawX, canvas.width - halfW));
            const clampedY = Math.max(halfH, Math.min(rawY, canvas.height - halfH));

            if (Math.hypot(clampedX - stableTargetX, clampedY - stableTargetY) > 60) {
              stableTargetX = clampedX;
              stableTargetY = clampedY;
            }

            zoomHoldUntil = currentTimeMs + 1600;
          }
        }
      }

      if (currentTimeMs > zoomHoldUntil) {
        stableScale = 1.0;
        stableTargetX = canvas.width / 2;
        stableTargetY = canvas.height / 2;
      }

      currentScale = lerp(currentScale, stableScale, 0.03);
      currentFocusX = lerp(currentFocusX, stableTargetX, 0.03);
      currentFocusY = lerp(currentFocusY, stableTargetY, 0.03);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(currentScale, currentScale);
      ctx.translate(-currentFocusX, -currentFocusY);

      ctx.drawImage(previewVideo, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    animFrameId = requestAnimationFrame(renderFrame);
  }

  renderFrame();
}

// Single frame draw helper (Pause ke waqt black screen rokkne ke liye)
function drawSingleFrame() {
  if (!previewVideo || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(currentScale, currentScale);
  ctx.translate(-currentFocusX, -currentFocusY);
  ctx.drawImage(previewVideo, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// 4. ASPECT RATIO SWITCHER
if (aspectRatioSelect) {
  aspectRatioSelect.addEventListener('change', (e) => {
    currentAspectRatio = e.target.value;
    const dims = CONTAINER_DIMENSIONS[currentAspectRatio] || CONTAINER_DIMENSIONS['16:9'];

    if (canvasContainer) {
      canvasContainer.style.width = `${dims.w}px`;
      canvasContainer.style.height = `${dims.h}px`;
    }

    if (previewVideo && previewVideo.readyState >= 2) {
      drawSingleFrame();
    }
  });
}

// 5. THEME & BACKGROUND CONTROLS
colorDots.forEach(dot => {
  dot.addEventListener('click', () => {
    colorDots.forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
    canvasContainer.style.backgroundImage = 'none';
    canvasContainer.style.background = dot.getAttribute('data-bg');
  });
});

if (designerColorPicker) {
  designerColorPicker.addEventListener('input', (e) => {
    canvasContainer.style.backgroundImage = 'none';
    canvasContainer.style.backgroundColor = e.target.value;
    colorDots.forEach(d => d.classList.remove('active'));
  });
}

if (customBgUpload) {
  customBgUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        canvasContainer.style.backgroundImage = `url(${event.target.result})`;
        canvasContainer.style.backgroundSize = 'cover';
        canvasContainer.style.backgroundPosition = 'center';
        colorDots.forEach(d => d.classList.remove('active'));
      };
      reader.readAsDataURL(file);
    }
  });
}

// 6. SAFE EXPORT ENGINE (NO UNDEFINED ERRORS)
if (exportBtn) {
  exportBtn.addEventListener('click', async () => {
    if (!previewVideo || !previewVideo.duration) return;

    exportBtn.disabled = true;
    if (qualitySelect) qualitySelect.disabled = true;
    if (aspectRatioSelect) aspectRatioSelect.disabled = true;
    recordBtn.disabled = true;
    stopBtn.disabled = true;

    try {
      if (animFrameId) cancelAnimationFrame(animFrameId);

      // Supported Codec Selection
      const codecsToTry = [
        { mime: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"', ext: 'mp4' },
        { mime: 'video/mp4', ext: 'mp4' },
        { mime: 'video/webm; codecs=h264', ext: 'mp4' },
        { mime: 'video/webm; codecs=vp9', ext: 'webm' },
        { mime: 'video/webm', ext: 'webm' }
      ];

      const chosen = codecsToTry.find(c => MediaRecorder.isTypeSupported(c.mime)) || { mime: 'video/webm', ext: 'webm' };

      const selectedQuality = qualitySelect ? qualitySelect.value : '1080';
      const preset = RESOLUTION_PRESETS[selectedQuality] || RESOLUTION_PRESETS['1080'];

      exportStatus.innerText = `Exporting (${selectedQuality}p)...`;

      previewVideo.currentTime = 0;
      previewVideo.pause();

      const canvasStream = canvas.captureStream(60);
      const exportChunks = [];

      const exportRecorder = new MediaRecorder(canvasStream, {
        mimeType: chosen.mime,
        videoBitsPerSecond: preset.bitrate
      });

      exportRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          exportChunks.push(e.data);
        }
      };

      exportRecorder.onstop = () => {
        const finalBlob = new Blob(exportChunks, { type: chosen.mime });
        const downloadUrl = URL.createObjectURL(finalBlob);

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = `recordly-${selectedQuality}p-${Date.now()}.${chosen.ext}`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(downloadUrl);
        }, 500);

        exportStatus.innerText = 'Export Complete!';
        exportBtn.disabled = false;
        if (qualitySelect) qualitySelect.disabled = false;
        if (aspectRatioSelect) aspectRatioSelect.disabled = false;
        recordBtn.disabled = false;
        setTimeout(() => { exportStatus.innerText = ''; }, 3500);

        previewVideo.play();
        startZoomPlayback();
      };

      exportRecorder.start();
      await previewVideo.play();
      startZoomPlayback();

      previewVideo.onended = () => {
        exportRecorder.stop();
        previewVideo.onended = null;
      };

    } catch (err) {
      console.error("Export Error:", err);
      exportStatus.innerText = 'Export failed! Check console.';
      exportBtn.disabled = false;
      if (qualitySelect) qualitySelect.disabled = false;
      if (aspectRatioSelect) aspectRatioSelect.disabled = false;
      recordBtn.disabled = false;
    }
  });
}
// Play / Pause Toggle Logic
function togglePlayPause() {
  if (!previewVideo.src || previewVideo.readyState < 2) return;

  if (previewVideo.paused) {
    previewVideo.play();
    startZoomPlayback();
    if (playPauseBtn) playPauseBtn.innerText = 'Pause';
  } else {
    previewVideo.pause();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    drawSingleFrame();
    if (playPauseBtn) playPauseBtn.innerText = 'Play';
  }
}

// Button Click
if (playPauseBtn) {
  playPauseBtn.addEventListener('click', togglePlayPause);
}

// Canvas Click (Screen par kahi bhi click karke play/pause)
if (canvas) {
  canvas.addEventListener('click', togglePlayPause);
}

// Video khatam hone par wapas button 'Play' ho jaye
previewVideo.addEventListener('ended', () => {
  if (playPauseBtn) playPauseBtn.innerText = 'Play';
  if (animFrameId) cancelAnimationFrame(animFrameId);
  drawSingleFrame();
});

// Spacebar shortcut se play/pause
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !previewVideo.paused && !recordBtn.disabled) {
    e.preventDefault();
    togglePlayPause();
  } else if (e.code === 'Space' && previewVideo.paused && previewVideo.duration) {
    e.preventDefault();
    togglePlayPause();
  }
});