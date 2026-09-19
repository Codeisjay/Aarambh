// WebcamPanel.jsx
import { useCamera } from '../hooks/useCamera';
import { CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

const CV_MODULE_URL = import.meta.env.VITE_CV_MODULE_URL || 'http://localhost:5001';

export default function WebcamPanel({ isEnabled = true, isSessionEnded = false, isPaused = false, isCvConnected = false, faceDetected = false }) {
  const { videoRef, isActive, error } = useCamera(isEnabled && !isSessionEnded);

  useEffect(() => {
    if (!isEnabled || isSessionEnded || !isActive) return undefined;

    const captureFrame = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        fetch(`${CV_MODULE_URL}/api/metrics/frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'image/jpeg' },
          body: blob,
        }).catch((uploadError) => {
          console.warn('[CV Module] Frame upload failed:', uploadError.message);
        });
      }, 'image/jpeg', 0.7);
    };

    const interval = setInterval(captureFrame, 500);
    captureFrame();
    return () => clearInterval(interval);
  }, [isEnabled, isSessionEnded, isActive, videoRef]);

  return (
    <div className="flex flex-col items-center gap-4 h-full">
      <BadgeBlue>
        {error ? '⚠ Camera Access Denied' : isSessionEnded ? '✓ Session Ended' : !isEnabled || isPaused ? '⏸ Camera Paused' : isActive ? '✓ Camera Active' : 'Initializing...'}
      </BadgeBlue>

      <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-[#0b1220] to-[#101a30] border border-slate-800 overflow-hidden relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: isActive && isEnabled && !isSessionEnded ? 'block' : 'none' }}
        />
        
        {isSessionEnded && (
          <div className="flex flex-col items-center justify-center absolute inset-0 bg-gradient-to-br from-[#0b1220] to-[#101a30]">
            <CheckCircle className="text-green-400 mb-4" size={80} />
            <p className="text-green-400 text-lg font-semibold">Session Completed</p>
          </div>
        )}

        {isCvConnected && !faceDetected && !isSessionEnded && isEnabled && !isPaused && (
          <div className="absolute inset-x-4 bottom-4 rounded-lg border border-yellow-600/70 bg-slate-950/80 px-3 py-2 text-center text-sm text-yellow-300">
            Face not detected. Center your face in the frame.
          </div>
        )}

        {((!isActive && !isSessionEnded) || ((!isEnabled || isPaused) && !isSessionEnded)) && (
          <div className="flex flex-col items-center justify-center absolute inset-0 bg-gradient-to-br from-[#0b1220] to-[#101a30]">
            {!isEnabled || isPaused ? (
              <>
                <div className="text-6xl mb-4">⏸</div>
                <p className="text-slate-400 text-sm">Camera Paused</p>
              </>
            ) : (
              <>
                <svg className="w-16 h-16 text-slate-600 animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-400 text-sm">Initializing camera...</p>
              </>
            )}
          </div>
        )}
      </div>

      <p className="text-slate-400 text-sm font-semibold">Live Webcam Feed</p>

      <BadgeGreen>
        ● Behavioral Analysis {isSessionEnded ? 'Completed' : isEnabled && !isPaused ? !isCvConnected ? 'Connecting' : faceDetected ? 'Active' : 'Face Not Detected' : 'Paused'}
      </BadgeGreen>
    </div>
  );
}

const BadgeBlue = ({children}) =>
  <div className="px-4 py-1 rounded-full border border-blue-700 bg-blue-900/60 text-blue-300 text-sm">{children}</div>;

const BadgeGreen = ({children}) =>
  <div className="px-4 py-2 rounded-xl border border-green-700 bg-green-900/40 text-green-400 text-sm">{children}</div>;
