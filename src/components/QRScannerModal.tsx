import React, { useState, useEffect, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerModalProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScannerModal({ onScan, onClose }: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const scanAnimationFrame = useRef<number>();

  useEffect(() => {
    let active = true;
    
    const startCamera = async () => {
      try {
        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: 'environment' } },
            audio: false
          });
        } catch (e) {
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false
          });
        }

        if (active) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.setAttribute('webkit-playsinline', 'true');
            videoRef.current.muted = true;
            // Play is needed on iOS Safari
            videoRef.current.play().catch(e => console.warn('QR scanner video play error:', e));
          }
        }
      } catch (err: any) {
        if (active) {
          console.error('Camera error:', err);
          setError(err.message || 'Unable to access the camera. You can upload a QR image below.');
        }
      }
    };
    
    startCamera();
    
    return () => {
      active = false;
      if (scanAnimationFrame.current) {
        cancelAnimationFrame(scanAnimationFrame.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!stream || error) return;
    
    const scan = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          
          if (code && code.data) {
            onScan(code.data);
            return; // stop scanning after success
          }
        }
      }
      scanAnimationFrame.current = requestAnimationFrame(scan);
    };
    
    scanAnimationFrame.current = requestAnimationFrame(scan);
    
    return () => {
      if (scanAnimationFrame.current) {
        cancelAnimationFrame(scanAnimationFrame.current);
      }
    };
  }, [stream, error, onScan]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            onScan(code.data);
          } else {
            alert('No QR code found in the image. Please try another image.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card-bg border border-app-border rounded-xl overflow-hidden w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
          <h3 className="text-base font-semibold text-main-fg">
            Scan Pre-Registration QR
          </h3>
          <button onClick={onClose} className="text-icon-fg hover:text-heading-fg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {!error ? (
            <>
              <div className="relative aspect-square sm:aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center mb-4 border border-app-border">
                <video 
                  ref={videoRef} 
                  className="absolute inset-0 w-full h-full object-cover" 
                  playsInline 
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <p className="text-sm text-center text-muted-fg mb-4">Position the QR code within the frame.</p>
            </>
          ) : (
            <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm mb-4 border border-red-500/30">
              <p className="font-semibold mb-1">Camera Notice</p>
              <p className="font-medium">{error}</p>
            </div>
          )}

          <div className="border-t border-app-border pt-4 mt-2">
            <p className="text-sm text-center text-main-fg mb-3 font-medium">Or upload a QR code image</p>
            <label className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-app-bg border border-app-border rounded-lg cursor-pointer hover:bg-hover-bg transition-colors text-sm text-main-fg">
              <Upload size={16} />
              <span>Choose Image</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
