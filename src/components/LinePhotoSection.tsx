import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  Loader2, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Edit2, 
  Maximize2,
  AlertTriangle
} from 'lucide-react';
import { LinePhoto } from '../types';
import { useApp } from '../context/AppContext';
import { processAndCompressImageFile, formatImageSize } from '../utils/imageUtils';

interface LinePhotoSectionProps {
  roId: string;
  roLineNumber: number;
  concernIndex: number;
  photos?: LinePhoto[];
  lineTitle?: string;
  canAddPhoto?: boolean;
  canDeletePhoto?: boolean;
  compact?: boolean;
}

export const LinePhotoSection: React.FC<LinePhotoSectionProps> = ({
  roId,
  roLineNumber,
  concernIndex,
  photos = [],
  lineTitle,
  canAddPhoto = true,
  canDeletePhoto = true,
  compact = false
}) => {
  const { currentUser, addLinePhoto, deleteLinePhoto, updateLinePhotoCaption } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionInput, setCaptionInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<LinePhoto | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter photos for this specific line
  const linePhotos = photos.filter(
    p => p.roLineNumber === roLineNumber || p.concernIndex === concernIndex
  );

  const handleCaptureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setFeedback(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processed = await processAndCompressImageFile(
          file,
          currentUser,
          `Line ${roLineNumber} Inspection Photo`
        );

        const newPhoto: LinePhoto = {
          id: `linephoto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          dataUrl: processed.dataUrl,
          thumbnailUrl: processed.thumbnailUrl,
          caption: processed.caption || `Line ${roLineNumber} Photo`,
          roLineNumber,
          concernIndex,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser.id,
          uploadedByName: currentUser.name,
          fileSizeBytes: processed.fileSizeBytes
        };

        addLinePhoto(roId, newPhoto);
      }

      setFeedback(`✓ Added photo to Line ${roLineNumber}`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error('Error attaching line photo:', err);
      setFeedback('Failed to process photo');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsProcessing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentPreviewPhoto = previewIndex !== null && linePhotos[previewIndex] ? linePhotos[previewIndex] : null;

  const handleSaveCaption = () => {
    if (!currentPreviewPhoto) return;
    updateLinePhotoCaption(roId, currentPreviewPhoto.id, captionInput.trim());
    setIsEditingCaption(false);
  };

  const handleConfirmDelete = (photo: LinePhoto) => {
    deleteLinePhoto(roId, photo.id);
    setPhotoToDelete(null);
    if (previewIndex !== null && previewIndex >= linePhotos.length - 1) {
      setPreviewIndex(linePhotos.length - 2 >= 0 ? linePhotos.length - 2 : null);
    }
    setFeedback(`✓ Photo removed from Line ${roLineNumber}`);
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="pt-2 border-t border-slate-100">
      {/* Hidden file and camera inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCaptureFile}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleCaptureFile}
      />

      {/* Line Photo Header & Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
            <Camera className="w-3.5 h-3.5 text-blue-600" />
            <span>Line {roLineNumber} Evidence & Inspection Photos</span>
          </span>
          {linePhotos.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">
              {linePhotos.length} {linePhotos.length === 1 ? 'photo' : 'photos'}
            </span>
          )}
          {feedback && (
            <span className="text-[10px] font-bold text-emerald-600 animate-fade-in bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {feedback}
            </span>
          )}
        </div>

        {canAddPhoto && (
          <div className="flex items-center gap-1">
            {/* Take Photo Button (Direct Camera Capture on Mobile/Tablet) */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => cameraInputRef.current?.click()}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-black flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title={`Take photo with camera for Line ${roLineNumber}`}
            >
              {isProcessing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              <span>Take Photo</span>
            </button>

            {/* Upload from Gallery / Files */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
              title="Upload from Photo Gallery or File"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Photo Thumbnails Row */}
      {linePhotos.length > 0 ? (
        <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-thin">
          {linePhotos.map((photo, pIdx) => (
            <div
              key={photo.id}
              className="group relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg border-2 border-slate-300 overflow-hidden cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all bg-slate-900"
              title={photo.caption || `Click to view Line ${roLineNumber} photo full-screen`}
            >
              <img
                src={photo.thumbnailUrl || photo.dataUrl}
                alt={photo.caption || `Line ${roLineNumber} Photo`}
                onClick={() => {
                  setPreviewIndex(pIdx);
                  setCaptionInput(photo.caption || '');
                  setIsEditingCaption(false);
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div 
                onClick={() => {
                  setPreviewIndex(pIdx);
                  setCaptionInput(photo.caption || '');
                  setIsEditingCaption(false);
                }}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
              >
                <Eye className="w-4 h-4 text-white drop-shadow" />
              </div>

              {/* Line Index Number */}
              <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] font-bold px-1 py-0.5 truncate text-center pointer-events-none">
                #{pIdx + 1}
              </div>

              {/* Quick Remove Photo Button (Top-Right of Thumbnail) */}
              {canDeletePhoto && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoToDelete(photo);
                  }}
                  className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white opacity-90 group-hover:opacity-100 shadow-md transition-all cursor-pointer z-10"
                  title="Remove this photo (wrong vehicle or part)"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {canAddPhoto && (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
              title={`Snap another photo for Line ${roLineNumber}`}
            >
              <Camera className="w-4 h-4" />
              <span className="text-[9px] font-black">+ Add</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] text-slate-500 italic py-1 pl-2">
          <span>No pictures attached to this line yet.</span>
          {canAddPhoto && (
            <span className="text-[10px] text-slate-400 font-sans not-italic">
              Tap "Take Photo" to document finding
            </span>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Photo Removal (Wrong Vehicle / Part) */}
      {photoToDelete && (
        <div 
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPhotoToDelete(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Remove Photo from Line #{roLineNumber}?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  If this picture was taken of the <strong>wrong vehicle</strong> or <strong>wrong part</strong>, removing it will permanently detach it from this line.
                </p>
              </div>
            </div>

            {/* Thumbnail Preview in confirmation */}
            <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <img 
                src={photoToDelete.thumbnailUrl || photoToDelete.dataUrl} 
                alt="Photo to delete" 
                className="w-14 h-14 object-cover rounded-lg border border-slate-300 shrink-0"
              />
              <div className="text-xs text-slate-700 min-w-0 flex-1">
                <p className="font-bold truncate">{photoToDelete.caption || `Line ${roLineNumber} Photo`}</p>
                <p className="text-[10px] text-slate-400">Captured by {photoToDelete.uploadedByName || 'Staff'}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel / Keep Photo
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(photoToDelete)}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Remove Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Photo Preview & Management Modal */}
      {currentPreviewPhoto && previewIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-6"
          onClick={() => setPreviewIndex(null)}
        >
          <div 
            className="bg-slate-900 text-white rounded-2xl border border-slate-700 max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-blue-600 text-white">
                  Line #{roLineNumber} Photo
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  {previewIndex + 1} of {linePhotos.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {canDeletePhoto && (
                  <button
                    type="button"
                    onClick={() => setPhotoToDelete(currentPreviewPhoto)}
                    className="px-2.5 py-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800/80 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Remove this photo from Line (wrong vehicle or part)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewIndex(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Image View */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px] max-h-[60vh]">
              <img
                src={currentPreviewPhoto.dataUrl}
                alt={currentPreviewPhoto.caption || `Line ${roLineNumber} Photo`}
                className="max-w-full max-h-full object-contain select-none"
              />

              {/* Navigation Arrows (if multiple photos) */}
              {linePhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewIndex((previewIndex - 1 + linePhotos.length) % linePhotos.length);
                      setIsEditingCaption(false);
                    }}
                    className="absolute left-2 inset-y-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors cursor-pointer"
                    title="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewIndex((previewIndex + 1) % linePhotos.length);
                      setIsEditingCaption(false);
                    }}
                    className="absolute right-2 inset-y-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors cursor-pointer"
                    title="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Modal Footer: Caption & Metadata */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-3">
                {isEditingCaption ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={captionInput}
                      onChange={(e) => setCaptionInput(e.target.value)}
                      placeholder="Add caption (e.g., Oil pan gasket leaking, brake pad thickness 2mm)..."
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-800 text-white border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveCaption}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingCaption(false)}
                      className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between flex-1">
                    <p className="text-xs text-slate-200 font-semibold">
                      {currentPreviewPhoto.caption || <span className="text-slate-500 italic">No caption set</span>}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCaptionInput(currentPreviewPhoto.caption || '');
                        setIsEditingCaption(true);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                      title="Edit photo caption"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Caption</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>
                  Captured by <strong className="text-slate-300">{currentPreviewPhoto.uploadedByName}</strong> on {new Date(currentPreviewPhoto.uploadedAt).toLocaleString()}
                </span>
                {currentPreviewPhoto.fileSizeBytes && (
                  <span className="font-mono text-[10px]">
                    Size: {formatImageSize(currentPreviewPhoto.fileSizeBytes)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
