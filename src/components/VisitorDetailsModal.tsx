import React, { useState, useRef, useEffect } from 'react';
import { ClipboardList, Edit2, Trash2, Hourglass, CheckCircle2, X, LogOut, Save, Pencil, Camera, RefreshCw, Check, User } from 'lucide-react';
import { Visitor } from '../types';
import { VisitorAvatar } from './VisitorAvatar';
import { formatManilaDateTime } from '../utils/dateUtils';

interface VisitorDetailsModalProps {
  visitor: Visitor;
  allVisitors: Visitor[];
  onClose: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (visitor: Visitor) => void;
  onTimeOut?: (id: string) => void;
  onSignIn?: (id: string) => void;
}

export function VisitorDetailsModal({ visitor, allVisitors, onClose, onDelete, onEdit, onTimeOut, onSignIn }: VisitorDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [visitorType, setVisitorType] = useState(visitor.visitorType || '');
  const [visitInfo, setVisitInfo] = useState(visitor.visiting || '');
  const [idType, setIdType] = useState(visitor.idType || '');
  const [idNumber, setIdNumber] = useState(visitor.idNumber || '');
  const [name, setName] = useState(visitor.name || '');
  const [contactNumber, setContactNumber] = useState(visitor.contactNumber || '');
  const [address, setAddress] = useState(visitor.address || '');
  const [purpose, setPurpose] = useState(visitor.purpose || '');
  const [notes, setNotes] = useState(visitor.notes || '');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(visitor.photo_url || visitor.photoDataUrl || visitor.photo || null);
  
  const [error, setError] = useState('');

  // Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedTempImage, setCapturedTempImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const visitorHistory = visitor.history || [{
    id: visitor.id,
    signInTime: visitor.signInTime,
    signOutTime: visitor.signOutTime,
    purpose: visitor.purpose,
    visiting: visitor.visiting,
    visitorType: visitor.visitorType,
    status: visitor.status
  }];
  const totalVisits = visitorHistory.length;
  
  const sortedHistory = [...visitorHistory].sort((a, b) => a.signInTime - b.signInTime);
  const firstVisit = sortedHistory[0]?.signInTime;
  const lastVisit = sortedHistory[sortedHistory.length - 1]?.signInTime;

  const formatDate = (timestamp?: number) => {
    return formatManilaDateTime(timestamp, '—');
  };

  const handleDelete = () => {
    onDelete?.(visitor.id);
    onClose();
  };

  const handleSave = () => {
    setError('');
    if (!visitorType || !idType || !idNumber || !name || !purpose) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!photoDataUrl) {
      setError('A visitor photo is required.');
      return;
    }

    const updatedVisitor: Visitor = {
      ...visitor,
      visitorType,
      visiting: visitInfo,
      idType,
      idNumber,
      name,
      contactNumber,
      address,
      purpose,
      notes,
      photoDataUrl,
      photo: photoDataUrl,
      photo_url: photoDataUrl
    };

    onEdit?.(updatedVisitor);
    setIsEditing(false);
    // Alternatively, onClose() if we want to close after save
    // onClose();
  };

  useEffect(() => {
    if (videoRef.current && stream && !capturedTempImage) {
      videoRef.current.srcObject = stream;
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
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

  return (
    <>
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card-bg border border-app-border rounded-xl overflow-hidden w-full max-w-lg shadow-2xl">
            <div className="px-6 py-4 border-b border-app-border flex justify-between items-center">
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

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-black/60 p-4">
        <div className="absolute inset-0" onClick={onClose}></div>
        
        <div className="relative bg-card-bg border border-app-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-app-border flex justify-between items-center rounded-t-xl shrink-0">
            <div className="flex items-center gap-3">
              <VisitorAvatar src={photoDataUrl || visitor.photo_url || visitor.photoDataUrl || visitor.photo} alt={visitor.name} className="w-12 h-12" iconSize={22} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-main-fg">{visitor.name}</h2>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                    {visitor.idNumber ? (visitor.idNumber.startsWith('#') ? visitor.idNumber : `#${String(visitor.idNumber).padStart(4, '0')}`) : `#${String(visitor.id).padStart(4, '0')}`}
                  </span>
                  {totalVisits > 1 && (
                    <span className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                      Returning Visitor ({totalVisits} Visits)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-fg font-medium mt-0.5">{visitor.visitorType || 'Guest'} • {visitor.visiting || 'Campus Visit'}</p>
              </div>
            </div>
            {!isEditing && (
              <div className="flex items-center gap-2">
                {visitor.status === 'signed-in' && (
                  <button 
                    onClick={() => { onTimeOut?.(visitor.id); onClose(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10 text-xs font-semibold rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <LogOut size={14} />
                    Time-Out
                  </button>
                )}
                {visitor.status === 'pre-registered' && (
                  <button 
                    onClick={() => { onSignIn?.(visitor.id); onClose(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 text-xs font-semibold rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <CheckCircle2 size={14} />
                    Register & Time-In
                  </button>
                )}
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 text-xs font-semibold rounded-lg hover:bg-blue-500/20 transition-colors"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                <div className="w-px h-6 bg-app-border mx-1"></div>
                <button onClick={onClose} className="p-1.5 text-icon-fg hover:text-heading-fg rounded-lg hover:bg-hover-bg transition-colors">
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto">
            {isEditing ? (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <Pencil size={18} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-[15px] font-semibold text-blue-600 dark:text-blue-400">Edit Visitor Information</h3>
                </div>

                <div className="flex flex-col gap-0">
                  <EditField label="Photo" isFirst>
                    <div className="flex items-center gap-4">
                      <VisitorAvatar src={photoDataUrl} alt="Visitor" className="w-14 h-14" iconSize={24} />
                      <button onClick={startCamera} className="flex items-center gap-2 px-3 py-1.5 bg-card-bg border border-app-border rounded-lg text-sm text-label-fg hover:bg-hover-bg transition-colors font-medium">
                        <Camera size={16} />
                        {photoDataUrl ? 'Change Photo' : 'Take Photo'}
                      </button>
                    </div>
                  </EditField>
                  <EditField label="Visitor Type">
                    <select value={visitorType} onChange={(e) => setVisitorType(e.target.value)} className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 appearance-none font-medium">
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
                  </EditField>
                  <EditField label="Visit Info">
                    <input type="text" value={visitInfo} onChange={(e) => setVisitInfo(e.target.value)} className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 placeholder:text-muted-fg" placeholder="Who are they meeting?" />
                  </EditField>
                  <EditField label="ID Type">
                    <select value={idType} onChange={(e) => setIdType(e.target.value)} className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 appearance-none font-medium">
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
                  </EditField>
                  <EditField label="ID Number">
                    <input type="text" value={idNumber} readOnly className="w-full bg-card-bg opacity-70 cursor-not-allowed border border-app-border rounded-lg py-2.5 px-3 text-sm font-mono font-semibold text-main-fg focus:outline-none" />
                  </EditField>
                  <EditField label="Full Name">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 font-semibold" />
                  </EditField>
                  <EditField label="Contact">
                    <input type="text" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500" />
                  </EditField>
                  <EditField label="Address">
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500" />
                  </EditField>
                  <EditField label="Purpose of Visit">
                    <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full bg-app-bg border border-app-border rounded-lg py-2.5 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 appearance-none font-medium">
                      <option value="Meeting a Teacher">Meeting a Teacher</option>
                      <option value="Student Pickup">Student Pickup</option>
                      <option value="Event Attendance">Event Attendance</option>
                      <option value="Delivery">Delivery</option>
                      <option value="Other">Other</option>
                    </select>
                  </EditField>
                  <EditField label="Notes" isLast>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full bg-app-bg border border-app-border rounded-lg py-2 px-3 text-sm text-main-fg focus:outline-none focus:border-blue-500 resize-y placeholder:text-muted-fg" />
                  </EditField>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-app-border">
                  <button onClick={() => setIsEditing(false)} className="flex items-center gap-1.5 px-5 py-2.5 border border-app-border text-label-fg text-sm font-medium rounded-lg hover:bg-hover-bg transition-colors">
                    <X size={16} />
                    Cancel
                  </button>
                  <button onClick={handleSave} className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                    <Save size={16} />
                    Save Changes
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <ClipboardList size={18} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-[15px] font-semibold text-blue-600 dark:text-blue-400">Visit Info</h3>
                </div>

                <div className="flex flex-col">
                  <DetailRow label="Visitor Profile" value={`${visitor.name} (${visitor.idNumber ? (visitor.idNumber.startsWith('#') ? visitor.idNumber : `#${String(visitor.idNumber).padStart(4, '0')}`) : `#${String(visitor.id).padStart(4, '0')}`})`} isFirst />
                  <DetailRow label="Visitor Type" value={visitor.visitorType || 'Guest'} />
                  <DetailRow label="ID Type" value={visitor.idType || 'Not provided'} />
                  <DetailRow label="ID Number" value={visitor.idNumber || 'Not provided'} />
                  <DetailRow label="Contact Number" value={visitor.contactNumber || 'Not provided'} />
                  <DetailRow label="Address" value={visitor.address || 'Not provided'} />
                  <DetailRow label="Latest Purpose" value={visitor.purpose || 'Not provided'} />
                  <DetailRow 
                    label="Current Status" 
                    value={
                      <span className="flex items-center gap-1.5 font-semibold">
                        {visitor.status === 'signed-in' ? (
                          <><CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" /> <span className="text-emerald-600 dark:text-emerald-400">Inside Campus</span></>
                        ) : visitor.status === 'pre-registered' ? (
                          <><CheckCircle2 size={14} className="text-blue-600 dark:text-blue-400" /> <span className="text-blue-600 dark:text-blue-400">Pre-Registered</span></>
                        ) : (
                          <><Hourglass size={14} className="text-amber-600 dark:text-amber-400" /> <span className="text-main-fg">Left Campus</span></>
                        )}
                      </span>
                    } 
                  />
                  <DetailRow label="Total Visits" value={`${totalVisits} visit${totalVisits > 1 ? 's' : ''}`} isLast />
                </div>

                {/* Visit History Section */}
                <div className="mt-8 pt-6 border-t border-app-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={18} className="text-blue-600 dark:text-blue-400" />
                      <h3 className="text-[15px] font-semibold text-blue-600 dark:text-blue-400">Visit History</h3>
                    </div>
                    <span className="text-xs text-muted-fg font-semibold">
                      {totalVisits} record{totalVisits > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {sortedHistory.map((visit, idx) => (
                      <div 
                        key={visit.id || idx} 
                        className="bg-app-bg border border-app-border rounded-xl p-4 flex flex-col gap-2 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            Visit {idx + 1}
                          </span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${
                            visit.status === 'signed-in' 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                              : visit.status === 'pre-registered'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20'
                          }`}>
                            {visit.status === 'signed-in' ? 'Inside Campus' : visit.status === 'pre-registered' ? 'Pre-Registered' : 'Left Campus'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-main-fg pt-1">
                          <div>
                            <span className="text-muted-fg font-medium">Time-In: </span>
                            <span className="font-semibold">{visit.signInTime ? formatDate(visit.signInTime) : '—'}</span>
                          </div>
                          <div>
                            <span className="text-muted-fg font-medium">Time-Out: </span>
                            <span className="font-semibold">{visit.signOutTime ? formatDate(visit.signOutTime) : '—'}</span>
                          </div>
                          <div>
                            <span className="text-muted-fg font-medium">Purpose: </span>
                            <span className="font-semibold">{visit.purpose || visitor.purpose || 'Visit'}</span>
                          </div>
                          {visit.visiting && (
                            <div>
                              <span className="text-muted-fg font-medium">Visiting / Host: </span>
                              <span className="font-semibold">{visit.visiting}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function DetailRow({ label, value, isFirst = false, isLast = false }: { label: string; value: React.ReactNode; isFirst?: boolean; isLast?: boolean }) {
  return (
    <div className={`py-4 flex items-center grid grid-cols-[180px_1fr] gap-4 ${!isFirst ? 'border-t border-app-border' : ''}`}>
      <div className="text-[14.5px] font-medium text-muted-fg">{label}</div>
      <div className="text-[14.5px] font-medium text-main-fg">{value}</div>
    </div>
  );
}

function EditField({ label, children, isFirst = false, isLast = false }: { label: string; children: React.ReactNode; isFirst?: boolean; isLast?: boolean }) {
  return (
    <div className={`py-3.5 flex items-center grid grid-cols-[180px_1fr] gap-4 ${!isFirst ? 'border-t border-app-border' : ''}`}>
      <div className="text-[14.5px] font-medium text-muted-fg">{label}</div>
      <div>{children}</div>
    </div>
  );
}

