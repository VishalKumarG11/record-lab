let mediaRecorder;
let recordedChunks = [];

const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const previewVideo = document.getElementById('preview');

recordBtn.addEventListener('click', async () => {
  // Click hote hi turant disable karein
  recordBtn.disabled = true;
  recordBtn.innerText = 'Recording...';

  try {
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

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const videoURL = URL.createObjectURL(blob);
      previewVideo.src = videoURL;
      previewVideo.load();
      previewVideo.onloadedmetadata = () => {
        previewVideo.play().catch(e => console.warn("Auto-play prevented:", e));
      };
    };

    mediaRecorder.start(200);
    stopBtn.disabled = false;

    stream.getVideoTracks()[0].onended = () => {
      stopRecording();
    };

  } catch (err) {
    console.error("Recording error:", err);
    // Error aane par wapas restore karein
    recordBtn.disabled = false;
    recordBtn.innerText = 'Start Recording';
    stopBtn.disabled = true;
  }
});

stopBtn.addEventListener('click', () => {
  stopRecording();
});

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }
  recordBtn.disabled = false;
  recordBtn.innerText = 'Start Recording';
  stopBtn.disabled = true;
}