import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Camera, Upload, Search, X, Check, RefreshCw, CheckCircle2, QrCode, AlertCircle, Calendar } from 'lucide-react';
import { QRScannerModal } from '../QRScannerModal';
import { Visitor } from '../../types';
import { VisitorAvatar } from '../VisitorAvatar';
import { getNextIdNumber } from '../../utils/idSequence';
import { API } from '../../api';
import { consolidateVisitors, registerOrUpdateVisitor } from '../../utils/visitorManager';
import { parseToMs, parseOptionalToMs } from '../../utils/dateUtils';
import { validateEventStatus, extractEventId } from '../../utils/eventValidation';

interface RegisterViewProps {
  visitors?: Visitor[];
  setVisitors?: React.Dispatch<React.SetStateAction<Visitor[]>>;
}

export function RegisterView({ visitors = [], setVisitors }: RegisterViewProps) {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedTempImage, setCapturedTempImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [visitorType, setVisitorType] = useState('');
  const [visitInfo, setVisitInfo] = useState('');
  const [idType, setIdType] = useState('');
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  const [successMessage, setSuccessMessage] = useState(false);
  const [error, setError] = useState('');
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showInactiveEventModal, setShowInactiveEventModal] = useState(false);
  const [inactiveEventMsg, setInactiveEventMsg] = useState('');
  
  // Search state for returning visitors
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    const handleDataCleared = () => {
      setSearchQuery('');
      setShowDropdown(false);
      clearForm();
    };
    window.addEventListener('data-cleared', handleDataCleared);
    return () => window.removeEventListener('data-cleared', handleDataCleared);
  }, []);

  const uniqueVisitors = Array.from(
    new Map(visitors.map(v => [v.name.toLowerCase(), v])).values()
  );

  const filteredVisitors = uniqueVisitors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (v.contactNumber && v.contactNumber.includes(searchQuery)) ||
    (v.idNumber && v.idNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectVisitor = (visitor: Visitor) => {
    setName(visitor.name);
    setVisitorType(visitor.visitorType || '');
    setIdType(visitor.idType || '');
    setContactNumber(visitor.contactNumber || '');
    setAddress(visitor.address || '');
    setPhotoDataUrl(visitor.photoDataUrl || visitor.photo_url || visitor.photo || null);
    
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleScan = async (scannedCode: string) => {
    if (!scannedCode) return;
    setIsScannerOpen(false);

    try {
      const trimmed = scannedCode.trim();

      // Check if scanned code represents an Event Registration link or QR code
      if (
        trimmed.includes('/register/') ||
        (trimmed.startsWith('http') && (trimmed.includes('event=') || trimmed.includes('/register/'))) ||
        trimmed.startsWith('EVENT-')
      ) {
        // Enforce shared event-status validation
        const eventVal = await validateEventStatus(trimmed);
        if (!eventVal.isActive) {
          // Event is inactive or invalid: Show "Link is Unavailable" and do not open form
          setInactiveEventMsg(
            eventVal.errorMessage || 'This event registration link is currently inactive or no longer accepting submissions.'
          );
          setShowInactiveEventModal(true);
          return;
        } else {
          // Event is active: navigate to registration
          const evId = eventVal.event?.id || extractEventId(trimmed);
          window.location.href = `/register/${evId}`;
          return;
        }
      }

      let candidateId: string | undefined;
      let candidateVisitorNumber: string | undefined;

      // Try JSON parsing
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.id) candidateId = String(parsed.id);
          if (parsed.visitor_number) candidateVisitorNumber = String(parsed.visitor_number);
          if (parsed.visitorNumber) candidateVisitorNumber = String(parsed.visitorNumber);
        } catch (e) {
          // ignore
        }
      }

      // Try URL parsing
      if (!candidateId && !candidateVisitorNumber && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
        try {
          const url = new URL(trimmed);
          const found = url.searchParams.get('id') || url.searchParams.get('visitor_number');
          if (found) {
            candidateId = found;
            candidateVisitorNumber = found;
          }
        } catch (e) {}
      }

      if (!candidateId && !candidateVisitorNumber) {
        const clean = trimmed.replace(/^REG-/i, '').trim();
        candidateId = clean;
        candidateVisitorNumber = clean;
      }

      // Query latest visitors list from DB API
      const freshData = await API.getVisitors().catch(() => null);
      let updatedVisitorsList: Visitor[] = visitors;

      if (Array.isArray(freshData)) {
        updatedVisitorsList = freshData.map((v: any) => {
          let st = (v.status || '').toLowerCase();
          if (st === 'inside') st = 'signed-in';
          if (st === 'outside') st = 'signed-out';
          if (!st) st = 'pre-registered';

          const rawHistory = Array.isArray(v.history) ? v.history : [];
          const history = rawHistory.map((h: any) => ({
            id: String(h.id || ''),
            signInTime: parseToMs(h.signInTime || h.time_in || h.created_at),
            signOutTime: parseOptionalToMs(h.signOutTime || h.time_out),
            purpose: h.purpose || v.purpose || 'Visit',
            visiting: h.visiting || v.visit_info || '',
            visitorType: h.visitorType || v.visitor_type || 'Guest',
            status: h.status || st
          }));

          return {
            id: String(v.id),
            idNumber: v.visitor_number || v.id_number || v.idNumber || String(v.id),
            name: v.full_name || v.name || '',
            visitorType: v.visitor_type || v.visitorType || 'Guest',
            visiting: v.visit_info || v.visiting || 'Event',
            idType: v.id_type || v.idType || 'School ID',
            contactNumber: v.contact_number || v.contactNumber || '',
            address: v.address || '',
            purpose: v.purpose || 'Event Attendance',
            photo: v.photo_url || v.photo || v.photoDataUrl || null,
            photo_url: v.photo_url || v.photo || v.photoDataUrl || null,
            photoDataUrl: v.photo_url || v.photo || v.photoDataUrl || null,
            status: st,
            signInTime: parseToMs(v.signInTime || v.time_in || v.created_at),
            signOutTime: parseOptionalToMs(v.signOutTime || v.time_out),
            history: history.length > 0 ? history : undefined
          };
        });

        if (setVisitors) {
          setVisitors(updatedVisitorsList);
        }
      }

      // Search keys
      const keys = [
        candidateId,
        candidateVisitorNumber,
        trimmed,
        trimmed.replace(/^REG-/i, '')
      ].filter(Boolean).map(s => String(s).trim().toLowerCase());

      const foundVisitor = updatedVisitorsList.find(v => {
        const vId = String(v.id).trim().toLowerCase();
        const vNum = String(v.idNumber || '').trim().toLowerCase();
        return keys.includes(vId) || keys.includes(vNum);
      });

      if (foundVisitor) {
        handleSelectVisitor(foundVisitor);
        setError('');
      } else {
        setShowNotFoundModal(true);
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setShowNotFoundModal(true);
    }
  };
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (videoRef.current && stream && !capturedTempImage) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error('Video play error:', e));
    }
  }, [stream, isCameraOpen, capturedTempImage]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
      setCapturedTempImage(null);
    } catch (err) {
      console.error("Error accessing camera", err);
      alert("Unable to access camera. Please check your device permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
    setCapturedTempImage(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedTempImage(dataUrl);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedTempImage(null);
  };

  const usePhoto = () => {
    setPhotoDataUrl(capturedTempImage);
    stopCamera();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, JPEG, PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        // Optimize/compress image dimensions if necessary to maintain fast storage and backups
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setPhotoDataUrl(optimizedDataUrl);
          } else {
            setPhotoDataUrl(result);
          }
          setError('');
        };
        img.onerror = () => {
          setPhotoDataUrl(result);
          setError('');
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);

    if (e.target) {
      e.target.value = '';
    }
  };

  const clearForm = () => {
    setVisitorType('');
    setVisitInfo('');
    setIdType('');
    setName('');
    setContactNumber('');
    setAddress('');
    setPurpose('');
    setNotes('');
    setPhotoDataUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError('');
  };

  const handleSubmit = async () => {
    try {
      setError('');
      
      // Validate required fields
      if (!visitorType || !idType || !name || !purpose) {
        setError('Please fill in all required fields (marked with *).');
        return;
      }
      
      if (!photoDataUrl) {
        setError('A visitor photo is required.');
        return;
      }

      // Update local state first (ensures immediate UI update & returning visitor consolidation)
      let assignedIdNumber = '';
      if (setVisitors) {
        setVisitors(prev => {
          const { updatedVisitors, visitor } = registerOrUpdateVisitor(prev, {
            name: name.trim(),
            visitorType,
            idType,
            contactNumber,
            address,
            purpose,
            visiting: visitInfo || 'Walk-in Visit',
            photoDataUrl,
            status: 'signed-in',
            generateNextIdNumber: () => getNextIdNumber(prev)
          });
          assignedIdNumber = visitor.idNumber || '';
          return updatedVisitors;
        });
      }

      const formData = new FormData();
      formData.append('full_name', name.trim());
      formData.append('visitor_type', visitorType);
      formData.append('visit_info', visitInfo || 'Walk-in Visit');
      formData.append('id_type', idType);
      formData.append('id_number', assignedIdNumber || getNextIdNumber(visitors));
      formData.append('contact_number', contactNumber || '');
      formData.append('address', address || '');
      formData.append('purpose', purpose);
      formData.append('status', 'signed-in');
      formData.append('registration_type', 'Walk-in');
      if (photoDataUrl) {
        formData.append('photoDataUrl', photoDataUrl);
      }

      try {
        await API.createVisitor(formData);
      } catch (err) {
        console.warn('Backend create visitor error, using state update fallback:', err);
      }

      setSuccessMessage(true);
      clearForm();
      setTimeout(() => setSuccessMessage(false), 3000);

      // Refresh visitors from backend if available
      const freshData = await API.getVisitors().catch(() => null);
      if (Array.isArray(freshData) && setVisitors) {
        const mapped = freshData.map((v: any) => {
          let st = (v.status || '').toLowerCase();
          if (st === 'inside') st = 'signed-in';
          if (st === 'outside') st = 'signed-out';
          if (!st) st = 'pre-registered';

          const rawHistory = Array.isArray(v.history) ? v.history : [];
          const history = rawHistory.map((h: any) => ({
            id: String(h.id || ''),
            signInTime: parseToMs(h.signInTime || h.time_in || h.created_at),
            signOutTime: parseOptionalToMs(h.signOutTime || h.time_out),
            purpose: h.purpose || v.purpose || 'Visit',
            visiting: h.visiting || v.visit_info || '',
            visitorType: h.visitorType || v.visitor_type || 'Guest',
            status: h.status || st
          }));

          return {
            id: String(v.id),
            idNumber: v.visitor_number || v.id_number || v.idNumber || String(v.id),
            name: v.full_name || v.name || '',
            visitorType: v.visitor_type || v.visitorType || 'Guest',
            visiting: v.visit_info || v.visiting || 'Event',
            idType: v.id_type || v.idType || 'School ID',
            contactNumber: v.contact_number || v.contactNumber || '',
            address: v.address || '',
            purpose: v.purpose || 'Event Attendance',
            photo: v.photo_url || v.photoDataUrl || v.photo || null,
            photo_url: v.photo_url || v.photoDataUrl || v.photo || null,
            photoDataUrl: v.photo_url || v.photoDataUrl || v.photo || null,
            status: st,
            signInTime: parseToMs(v.signInTime || v.time_in || v.created_at),
            signOutTime: parseOptionalToMs(v.signOutTime || v.time_out),
            history: history.length > 0 ? history : undefined
          };
        });
        setVisitors(consolidateVisitors(mapped));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred during registration.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card-bg border border-app-border rounded-xl overflow-hidden w-full max-w-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
              <h3 className="text-base font-semibold text-main-fg">
                {capturedTempImage ? 'Review Photo' : 'Take Photo'}
              </h3>
              <button onClick={stopCamera} className="text-icon-fg hover:text-heading-fg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center mb-6 border border-app-border">
                {capturedTempImage ? (
                  <img src={capturedTempImage} alt="Captured" className="w-full h-full object-cover" />
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex items-center justify-center gap-4">
                {capturedTempImage ? (
                  <>
                    <button onClick={retakePhoto} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-app-bg border border-app-border text-label-fg font-medium rounded-lg hover:bg-hover-bg transition-colors">
                      <RefreshCw size={18} />
                      Retake
                    </button>
                    <button onClick={usePhoto} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg transition-colors">
                      <Check size={18} />
                      Use Photo
                    </button>
                  </>
                ) : (
                  <button onClick={capturePhoto} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg transition-colors">
                    <Camera size={18} />
                    Capture
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {isScannerOpen && (
        <QRScannerModal 
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Pre-Registered Visitor Not Found Modal */}
      {showNotFoundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-card-bg border border-app-border rounded-xl w-full max-w-[420px] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertCircle size={18} />
                <h3 className="text-base font-semibold text-main-fg">Pre-Registered Visitor Not Found</h3>
              </div>
              <button 
                onClick={() => setShowNotFoundModal(false)} 
                className="text-icon-fg hover:text-heading-fg transition-colors p-1 rounded-lg hover:bg-hover-bg"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-label-fg leading-relaxed">
                This QR code does not match any pre-registered visitor.
              </p>
            </div>

            <div className="px-6 py-4 bg-th-bg border-t border-app-border flex justify-end items-center">
              <button 
                type="button"
                onClick={() => setShowNotFoundModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm text-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inactive Event QR Code Modal */}
      {showInactiveEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-card-bg border border-app-border rounded-xl w-full max-w-[420px] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
              <div className="flex items-center gap-2 text-red-500">
                <Calendar size={18} />
                <h3 className="text-base font-semibold text-main-fg">Link is Unavailable</h3>
              </div>
              <button 
                onClick={() => setShowInactiveEventModal(false)} 
                className="text-icon-fg hover:text-heading-fg transition-colors p-1 rounded-lg hover:bg-hover-bg"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center mb-3">
                <Calendar size={24} />
              </div>
              <h4 className="text-sm font-semibold text-main-fg mb-1">Link is unavailable</h4>
              <p className="text-sm text-label-fg leading-relaxed">
                {inactiveEventMsg || 'This event registration link is currently inactive or no longer accepting submissions.'}
              </p>
            </div>

            <div className="px-6 py-4 bg-th-bg border-t border-app-border flex justify-end items-center">
              <button 
                type="button"
                onClick={() => setShowInactiveEventModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm text-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Card */}
      <div className="bg-card-bg rounded-xl border border-app-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border flex justify-between items-center bg-th-bg">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-main-fg">Register Visitor</h2>
          </div>
          <div className="flex items-center gap-2 bg-app-bg border border-app-border px-3 py-1 rounded-full">
             <div className="w-2 h-2 rounded-full bg-purple-500"></div>
             <span className="text-xs font-medium text-label-fg">Camera Ready</span>
          </div>
        </div>
        
        <div className="p-6">
          <div className="border border-dashed border-app-border rounded-xl p-6 mb-6 flex flex-col items-center justify-center bg-app-bg/50">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-semibold text-main-fg">Visitor Photo</span>
            </div>
            <div className="w-24 h-24 mb-4">
              <VisitorAvatar src={photoDataUrl} alt="Visitor Photo" className="w-24 h-24" iconSize={40} />
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={startCamera}
                className="flex items-center gap-2 px-4 py-2 bg-card-bg border border-app-border rounded-lg text-sm font-medium text-label-fg hover:bg-hover-bg transition-colors shadow-sm"
              >
                <Camera size={16} />
                {photoDataUrl ? 'Retake Photo' : 'Take Photo'}
              </button>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-card-bg border border-app-border rounded-lg text-sm font-medium text-label-fg hover:bg-hover-bg transition-colors shadow-sm"
              >
                <Upload size={16} />
                Upload Photo
              </button>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          </div>

          <div className="flex gap-3 mb-6 relative">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => {
                  // Delay hiding dropdown so click event on option can fire
                  setTimeout(() => setShowDropdown(false), 200);
                }}
                placeholder="Type name, phone, or ID to find returning visitor..."
                className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg"
              />
              {showDropdown && searchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-card-bg border border-app-border rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                  {filteredVisitors.length > 0 ? (
                    <ul className="divide-y divide-app-border">
                      {filteredVisitors.map((v) => (
                        <li 
                          key={v.id} 
                          onMouseDown={() => handleSelectVisitor(v)}
                          className="p-3 hover:bg-hover-bg cursor-pointer transition-colors flex items-center gap-3"
                        >
                          <VisitorAvatar src={v.photo_url || v.photoDataUrl || v.photo} alt={v.name} className="w-8 h-8" iconSize={16} />
                          <div>
                            <div className="text-sm font-medium text-main-fg">{v.name}</div>
                            <div className="text-xs text-muted-fg">{v.visitorType} • {v.contactNumber || v.idNumber}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-sm text-muted-fg text-center">
                      No matching visitors found.
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors font-medium text-sm flex-shrink-0"
            >
              <QrCode size={18} />
              Scan QR
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-label-fg mb-1.5">Visitor Type <span className="text-red-500">*</span></label>
              <select value={visitorType} onChange={(e) => setVisitorType(e.target.value)} className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 appearance-none font-medium">
                <option value="">Select type</option>
                <option value="Parent/Guardian">Parent/Guardian</option>
                <option value="Student">Student</option>
                <option value="Faculty/Teacher">Faculty/Teacher</option>
                <option value="Staff">Staff</option>
                <option value="School Official">School Official</option>
                <option value="Guest">Guest</option>
                <option value="Applicant">Applicant</option>
                <option value="Alumni">Alumni</option>
                <option value="Contractor">Contractor</option>
                <option value="Service Provider">Service Provider</option>
                <option value="Vendor/Supplier">Vendor/Supplier</option>
                <option value="Delivery/Courier">Delivery/Courier</option>
                <option value="Government Official">Government Official</option>
                <option value="Emergency/Medical">Emergency/Medical</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-label-fg mb-1.5">Visit Info</label>
              <input value={visitInfo} onChange={(e) => setVisitInfo(e.target.value)} type="text" placeholder="Who are they meeting (employee, office, etc.)?" className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-label-fg mb-1.5">ID Type <span className="text-red-500">*</span></label>
              <select value={idType} onChange={(e) => setIdType(e.target.value)} className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 appearance-none font-medium">
                <option value="">Select ID type</option>
                <option value="Driver's License">Driver's License</option>
                <option value="National ID (PhilSys)">National ID (PhilSys)</option>
                <option value="Passport">Passport</option>
                <option value="UMID">UMID</option>
                <option value="SSS ID">SSS ID</option>
                <option value="PhilHealth ID">PhilHealth ID</option>
                <option value="Postal ID">Postal ID</option>
                <option value="PRC ID">PRC ID</option>
                <option value="Company/Work ID">Company/Work ID</option>
                <option value="Government Agency ID">Government Agency ID</option>
                <option value="Senior Citizen ID">Senior Citizen ID</option>
                <option value="PWD ID">PWD ID</option>
                <option value="Other Valid ID">Other Valid ID</option>
                <option value="No ID / Not Available">No ID / Not Available</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-label-fg mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="As shown on ID" className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-label-fg mb-1.5">Contact Number</label>
              <input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} type="text" placeholder="Phone number" className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-label-fg mb-1.5">Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} type="text" placeholder="Enter your full address" className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-label-fg mb-1.5">Purpose of Visit <span className="text-red-500">*</span></label>
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 appearance-none font-medium">
                <option value="">Select purpose</option>
                <option value="Meeting a Teacher">Meeting a Teacher</option>
                <option value="Student Pickup">Student Pickup</option>
                <option value="Document Submission">Document Submission</option>
                <option value="Event Attendance">Event Attendance</option>
                <option value="Delivery">Delivery</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-label-fg mb-1.5">Notes (Optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional information..." rows={3} className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 resize-y placeholder:text-muted-fg"></textarea>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-lg flex items-center gap-2">
              <CheckCircle2 size={16} />
              Visitor registered successfully. Time-In has been recorded.
            </div>
          )}

          <div className="flex items-center gap-4">
            <button onClick={handleSubmit} className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm">
              <UserPlus size={18} />
              Register & Time-In
            </button>
            <button onClick={clearForm} className="px-6 py-2.5 bg-card-bg border border-app-border text-label-fg font-medium rounded-lg hover:bg-hover-bg transition-colors shadow-sm">
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
