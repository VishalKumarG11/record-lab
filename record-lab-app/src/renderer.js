let mediaRecorder;
let recordedChunks = [];
let recordedMouseData = [];
let animFrameId = null;

const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const previewVideo = document.getElementById('preview');
const canvas = document.getElementById('zoomCanvas');
const ctx = canvas.getContext('2d');

// Smooth zoom camera state
let currentScale = 1.0;
let currentFocusX = 0.5;
let currentFocusY = 0.5;

recordBtn.addEventListener('click', async () => {
  try {
    recordBtn.disabled = true;
    recordBtn.innerText = 'Recording...';

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
        canvas.width = previewVideo.videoWidth || 1280;
        canvas.height = previewVideo.videoHeight || 720;
        previewVideo.play();
        startZoomPlayback();
      };
    };

    // Screen aur Mouse tracking saath start
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

stopBtn.addEventListener('click', () => {
  stopRecording();
});

async function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    // Mouse tracking stop karke coordinates save karna
    recordedMouseData = await window.electronAPI.stopMouseTracking();
  }
  recordBtn.disabled = false;
  recordBtn.innerText = 'Start Recording';
  stopBtn.disabled = true;
}

// Stabilized Cinematic Zoom Engine (Zero Shaking)
function startZoomPlayback() {
  if (animFrameId) cancelAnimationFrame(animFrameId);

  const lerp = (start, end, factor) => start + (end - start) * factor;

  // Zoom Hold state (Camera ko stable rakhne ke liye)
  let zoomHoldUntil = 0;
  let stableTargetX = canvas.width / 2;
  let stableTargetY = canvas.height / 2;
  let stableScale = 1.0;

  function renderFrame() {
    if (!previewVideo.paused && !previewVideo.ended) {
      const currentTimeMs = previewVideo.currentTime * 1000;

      if (recordedMouseData.length > 0) {
        // Last 400ms me mouse activity check karein
        const recentPoints = recordedMouseData.filter(
          p => p.time >= currentTimeMs - 350 && p.time <= currentTimeMs
        );

        if (recentPoints.length >= 2) {
          const first = recentPoints[0];
          const last = recentPoints[recentPoints.length - 1];
          const movementDelta = Math.hypot(last.x - first.x, last.y - first.y);

          // AGGRESSIVE SWIPE / TASKBAR -> Wide View Reset
          const screenH = window.screen.height || 1080;
          const isNearTaskbar = last.y > (screenH - 70);

          if (movementDelta > 260 || isNearTaskbar) {
            stableScale = 1.0;
            stableTargetX = canvas.width / 2;
            stableTargetY = canvas.height / 2;
            zoomHoldUntil = 0; // Turant zoom out karega
          }
          // FOCUSED ACTION -> Zoom In & Hold
          else if (movementDelta > 15 && movementDelta < 180) {
            stableScale = 1.32; // Crisp, readable zoom

            const rawX = (last.x / window.screen.width) * canvas.width;
            const rawY = (last.y / window.screen.height) * canvas.height;

            // Safe screen bounds clamp
            const halfW = canvas.width / (2 * stableScale);
            const halfH = canvas.height / (2 * stableScale);

            const clampedX = Math.max(halfW, Math.min(rawX, canvas.width - halfW));
            const clampedY = Math.max(halfH, Math.min(rawY, canvas.height - halfH));

            // DEADZONE: Agar target 60px se kam hila hai toh camera re-center mat karo (Eliminates Shaking)
            if (Math.hypot(clampedX - stableTargetX, clampedY - stableTargetY) > 60) {
              stableTargetX = clampedX;
              stableTargetY = clampedY;
            }

            // Minimum 1.6 seconds tak camera ko wahi hold rakhega
            zoomHoldUntil = currentTimeMs + 1600;
          }
        }
      }

      // Agar hold time khatam ho gaya hai aur mouse shant hai, tabhi 1.0x wide view par wapas jaye
      if (currentTimeMs > zoomHoldUntil) {
        stableScale = 1.0;
        stableTargetX = canvas.width / 2;
        stableTargetY = canvas.height / 2;
      }

      // Cinematic Slow-Glide Damping (0.028 factor ensures smooth drone-like glide)
      currentScale = lerp(currentScale, stableScale, 0.028);
      currentFocusX = lerp(currentFocusX, stableTargetX, 0.028);
      currentFocusY = lerp(currentFocusY, stableTargetY, 0.028);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Camera view matrix
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(currentScale, currentScale);
      ctx.translate(-currentFocusX, -currentFocusY);

      // Render crisp full frame
      ctx.drawImage(previewVideo, 0, 0, canvas.width, canvas.height);

      ctx.restore();
    }

    animFrameId = requestAnimationFrame(renderFrame);
  }

  renderFrame();
}
const exportBtn = document.getElementById('exportBtn');
const qualitySelect = document.getElementById('qualitySelect');
const exportStatus = document.getElementById('exportStatus');

// Resolution aur Bitrate Presets Map
const RESOLUTION_PRESETS = {
  '240':  { width: 426,  height: 240,  bitrate: 800000 },     // 800 Kbps
  '360':  { width: 640,  height: 360,  bitrate: 1500000 },    // 1.5 Mbps
  '720':  { width: 1280, height: 720,  bitrate: 6000000 },    // 6 Mbps
  '1080': { width: 1920, height: 1080, bitrate: 14000000 },   // 14 Mbps
  '2160': { width: 3840, height: 2160, bitrate: 45000000 }    // 45 Mbps (4K Ultra HD)
};

// Preview load hone par controls enable karein
previewVideo.addEventListener('canplay', () => {
  if (previewVideo.duration && previewVideo.duration > 0) {
    exportBtn.disabled = false;
    qualitySelect.disabled = false;
  }
});

exportBtn.addEventListener('click', async () => {
  if (!previewVideo.duration) return;

  const selectedPreset = RESOLUTION_PRESETS[qualitySelect.value] || RESOLUTION_PRESETS['1080'];

  exportBtn.disabled = true;
  qualitySelect.disabled = true;
  recordBtn.disabled = true;
  stopBtn.disabled = true;
  exportStatus.innerText = `Exporting ${qualitySelect.value}p MP4...`;

  if (animFrameId) cancelAnimationFrame(animFrameId);

  // Set canvas dimensions to the target export resolution
  const originalW = canvas.width;
  const originalH = canvas.height;
  canvas.width = selectedPreset.width;
  canvas.height = selectedPreset.height;

  previewVideo.currentTime = 0;
  previewVideo.pause();

  const canvasStream = canvas.captureStream(60);
  const exportChunks = [];

  // MP4 codec prioritization
  let mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
  let fileExt = 'mp4';

  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/mp4';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm; codecs=h264';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm; codecs=vp9';
    fileExt = 'webm';
  }

  const exportRecorder = new MediaRecorder(canvasStream, {
    mimeType: mimeType,
    videoBitsPerSecond: selectedPreset.bitrate
  });

  exportRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      exportChunks.push(e.data);
    }
  };

  exportRecorder.onstop = () => {
    const finalBlob = new Blob(exportChunks, { type: mimeType });
    const downloadUrl = URL.createObjectURL(finalBlob);

    // Trigger MP4 Download
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = downloadUrl;
    a.download = `recordly-${qualitySelect.value}p-${Date.now()}.${fileExt}`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    }, 100);

    exportStatus.innerText = `Exported ${qualitySelect.value}p Successfully!`;
    
    // Restore original canvas preview size
    canvas.width = originalW;
    canvas.height = originalH;

    exportBtn.disabled = false;
    qualitySelect.disabled = false;
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
});