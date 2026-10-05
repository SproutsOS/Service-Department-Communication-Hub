import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  Check, 
  AlertCircle, 
  Loader2, 
  Eye, 
  X,
  Maximize2,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { VehiclePhoto } from '../types';
import { processAndCompressImageFile, formatImageSize } from '../utils/imageUtils';

interface VehiclePhotoManagerProps {
  roId: string;
  vehicleYear: number | string;
  vehicleMake: string;
  vehicleModel: string;
  vin?: string;
  photos: VehiclePhoto[];
  currentUser: { id: string; name: string };
  onAddPhoto: (roId: string, photo: VehiclePhoto) => boolean;
  onDeletePhoto: (roId: string, photoId: string) => boolean;
  maxPhotos?: number;
}

export const VehiclePhotoManager: React.FC<VehiclePhotoManagerProps> = ({
  roId,
  vehicleYear,
  vehicleMake,
  vehicleModel,
  vin,
  photos,
  currentUser,
  onAddPhoto,
  onDeletePhoto,
  maxPhotos = 12
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<VehiclePhoto | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<VehiclePhoto | null>(null);

  // Hidden file inputs for Camera and Photo Library
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= maxPhotos) {
      setUploadFeedback({
        type: 'error',
        message: `Maximum limit of ${maxPhotos} photos reached for this repair order.`
      });
      return;
    }

    setIsProcessing(true);
    setUploadFeedback(null);

    try {
      const file = files[0];
      const initialBytes = file.size;

      // Auto compress and optimize in background
      const processed = await processAndCompressImageFile(
        file,
        currentUser,
        'Vehicle Photo'
      );

      const success = onAddPhoto(roId, processed);
      if (success) {
        setUploadFeedback({
          type: 'success',
          message: `Photo added! Compressed ${formatImageSize(initialBytes)} down to ${formatImageSize(processed.fileSizeBytes || 0)}.`
        });
      } else {
        setUploadFeedback({
          type: 'error',
          message: 'Could not attach photo to repair order.'
        });
      }
    } catch (err: any) {
      setUploadFeedback({
        type: 'error',
        message: err?.message || 'Error processing photo.'
      });
    } finally {
      setIsProcessing(false);
      // Reset inputs so the same photo or a new snap can be retaken
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      setTimeout(() => setUploadFeedback(null), 4500);
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-slate-700 p-4 sm:p-5 space-y-4 shadow-2xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>Vehicle Intake & Inspection Photos</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                {photos.length} / {maxPhotos}
              </span>
            </h4>
          </div>
        </div>

        {/* Device Badges */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[11px] font-semibold text-slate-700 border border-slate-300">
            <Smartphone className="w-3 h-3 text-blue-600" />
            Phone / Tablet Ready
          </span>
        </div>
      </div>

      {/* Upload Feedback */}
      {uploadFeedback && (
        <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in ${
          uploadFeedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-400' 
            : 'bg-red-50 text-red-800 border-2 border-red-400'
        }`}>
          {uploadFeedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{uploadFeedback.message}</span>
        </div>
      )}

      {/* Upload Controls for Advisors */}
      <div className="bg-slate-50 p-3.5 rounded-xl border-2 border-slate-300">
        {/* Capture Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Direct Camera Shutter on mobile / tablet */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            id={`camera-input-${roId}`}
            disabled={isProcessing || photos.length >= maxPhotos}
          />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing || photos.length >= maxPhotos}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer border-2 border-blue-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Compressing & Attaching...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Take Photo (Camera)</span>
              </>
            )}
          </button>

          {/* Photo Library / File Upload */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`gallery-input-${roId}`}
            disabled={isProcessing || photos.length >= maxPhotos}
          />
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isProcessing || photos.length >= maxPhotos}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 disabled:bg-slate-200 text-slate-800 text-xs font-bold border-2 border-slate-400 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Upload from Gallery / Files</span>
          </button>
        </div>
      </div>

      {/* Photos Gallery Grid */}
      <div>
        {photos.length === 0 ? (
          <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center">
            <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
            <h5 className="text-xs font-bold text-slate-700">No Vehicle Photos Attached Yet</h5>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-0.5">
              Take photos from your phone or tablet during vehicle walkaround (front, rear, odometer, pre-existing scratches, tire condition) to attach proof directly to this repair order.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-400 shadow-2xs aspect-4/3 flex flex-col justify-end"
              >
                {/* Image */}
                <img
                  src={photo.thumbnailUrl || photo.dataUrl}
                  alt={`Vehicle Photo ${index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />

                {/* Top overlay badges */}
                <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-black/75 text-white backdrop-blur-xs">
                    #{index + 1}
                  </span>
                  {photo.fileSizeBytes && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/75 text-emerald-400 backdrop-blur-xs">
                      {formatImageSize(photo.fileSizeBytes)}
                    </span>
                  )}
                </div>

                {/* Bottom Action bar */}
                <div className="relative z-10 p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-end gap-1">
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(photo)}
                      className="p-1 rounded bg-white/20 hover:bg-white text-white hover:text-slate-900 transition-colors cursor-pointer"
                      title="View Full Size Photo"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoToDelete(photo)}
                      className="p-1 rounded bg-red-600/80 hover:bg-red-600 text-white transition-colors cursor-pointer"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Vehicle Photo Deletion */}
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
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Delete Vehicle Photo?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to remove this photo from RO #{roId}? If this was taken on the wrong vehicle or wrong angle, this action will remove it permanently.
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
                <p className="font-bold">Vehicle Photo #{photos.findIndex(p => p.id === photoToDelete.id) + 1}</p>
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
                onClick={() => {
                  onDeletePhoto(roId, photoToDelete.id);
                  if (previewPhoto?.id === photoToDelete.id) {
                    setPreviewPhoto(null);
                  }
                  setPhotoToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Photo Modal Viewer */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-6"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 truncate">
                <Camera className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-bold text-sm truncate">
                  Vehicle Inspection Photo #{photos.findIndex(p => p.id === previewPhoto.id) + 1}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({vehicleYear} {vehicleMake} {vehicleModel}{vin ? ` • VIN: ${vin}` : ''})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Area */}
            <div className="flex-1 min-h-0 bg-black flex items-center justify-center p-2 overflow-auto">
              <img
                src={previewPhoto.dataUrl}
                alt={`Vehicle Inspection Photo`}
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-2.5 bg-slate-800 border-t border-slate-700 text-xs text-slate-300 flex items-center justify-between">
              <div>
                Uploaded by <strong className="text-white">{previewPhoto.uploadedByName}</strong> on {new Date(previewPhoto.uploadedAt).toLocaleString()}
              </div>
              {previewPhoto.fileSizeBytes && (
                <span className="font-mono text-emerald-400 font-bold">
                  Compressed size: {formatImageSize(previewPhoto.fileSizeBytes)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
