import React, { useState } from 'react';
import { 
  RepairOrder, 
  RecommendedService, 
  RecommendedServiceStatus, 
  UserRole 
} from '../types';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  Tag
} from 'lucide-react';

interface TechRecommendationsSectionProps {
  ro: RepairOrder;
  compact?: boolean;
}

const PRESET_SERVICES = [
  { label: 'Engine Air Filter', category: 'AIR_FILTER' as const, defaultUrgency: 'RECOMMENDED' as const },
  { label: 'Cabin Air Filter', category: 'CABIN_FILTER' as const, defaultUrgency: 'RECOMMENDED' as const },
  { label: 'Tires (Replace / Rotate)', category: 'TIRES' as const, defaultUrgency: 'SAFETY' as const },
  { label: 'Scheduled Maintenance', category: 'SCHEDULED_MAINT' as const, defaultUrgency: 'RECOMMENDED' as const },
  { label: 'Brake Pads & Rotors', category: 'BRAKES' as const, defaultUrgency: 'SAFETY' as const },
  { label: 'Battery Replacement', category: 'BATTERY' as const, defaultUrgency: 'RECOMMENDED' as const },
  { label: 'Wiper Blades', category: 'WIPERS' as const, defaultUrgency: 'RECOMMENDED' as const },
];

export const TechRecommendationsSection: React.FC<TechRecommendationsSectionProps> = ({ ro, compact = false }) => {
  const { 
    currentUser, 
    addRecommendedService, 
    updateRecommendedServiceStatus 
  } = useApp();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [category, setCategory] = useState<RecommendedService['category']>('AIR_FILTER');
  const [urgency, setUrgency] = useState<'SAFETY' | 'RECOMMENDED'>('RECOMMENDED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const recommendations = ro.recommendations || [];
  const pendingCount = recommendations.filter(r => r.status === 'PENDING').length;
  const approvedCount = recommendations.filter(r => r.status === 'APPROVED').length;

  const handleSelectPreset = (preset: typeof PRESET_SERVICES[0]) => {
    setSelectedPreset(preset.label);
    setCustomServiceName(preset.label);
    setCategory(preset.category);
    setUrgency(preset.defaultUrgency);
    setIsFormOpen(true);
  };

  const handleCustomClick = () => {
    setSelectedPreset('CUSTOM');
    setCustomServiceName('');
    setCategory('OTHER');
    setUrgency('RECOMMENDED');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const serviceTitle = customServiceName.trim();
    if (!serviceTitle) return;

    setIsSubmitting(true);
    const success = addRecommendedService(ro.id, {
      serviceName: serviceTitle,
      category,
      urgency,
      notes: notes.trim() || undefined,
    });

    if (success) {
      setStatusFeedback(`Sent "${serviceTitle}" to Service Advisor!`);
      setCustomServiceName('');
      setNotes('');
      setSelectedPreset('');
      setIsFormOpen(false);
      setTimeout(() => setStatusFeedback(null), 4000);
    }
    setIsSubmitting(false);
  };

  const handleReviewStatus = (recId: string, status: 'APPROVED' | 'DECLINED', reason?: string) => {
    updateRecommendedServiceStatus(ro.id, recId, status, reason);
  };

  const isTech = currentUser.role === 'TECHNICIAN';
  const isAdvisorOrMgr = currentUser.role === 'SERVICE_ADVISOR' || currentUser.role === 'SERVICE_MANAGER';

  return (
    <div className="bg-slate-50 rounded-xl border-2 border-slate-300 p-3.5 space-y-3">
      {/* Header & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Additional Recommended Services</span>
          </div>

          {pendingCount > 0 && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              {pendingCount} Awaiting Approval
            </span>
          )}

          {approvedCount > 0 && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              {approvedCount} Customer Approved
            </span>
          )}
        </div>

        {/* Action Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFormOpen(!isFormOpen);
          }}
          className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isFormOpen ? 'Close Form' : '+ Request Additional Item'}</span>
          {isFormOpen ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
        </button>
      </div>

      {statusFeedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-3 py-2 rounded-lg font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {/* Quick 1-Tap Preset Buttons for Techs */}
      {!isFormOpen && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-500">
            Quick Request 1-Tap Presets:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SERVICES.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectPreset(p);
                }}
                className="text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>+ {p.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCustomClick();
              }}
              className="text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
            >
              + Other Custom Item...
            </button>
          </div>
        </div>
      )}

      {/* Expanded Request Submission Form */}
      {isFormOpen && (
        <form 
          onSubmit={handleSubmit}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg border border-slate-300 p-3.5 space-y-3 shadow-2xs"
        >
          <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <span>Tech Vehicle Finding / Upsell Request</span>
            <span className="text-[11px] font-normal text-slate-500">
              Notifies Service Advisor for customer authorization
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Service Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Recommended Service or Item *
              </label>
              <input
                type="text"
                required
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                placeholder="e.g. Engine Air Filter, Cabin Filter, 4 New Tires..."
                className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RecommendedService['category'])}
                className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="AIR_FILTER">Air Filter (Engine)</option>
                <option value="CABIN_FILTER">Cabin Air Filter</option>
                <option value="TIRES">Tires / Alignment</option>
                <option value="SCHEDULED_MAINT">Scheduled Maintenance</option>
                <option value="BRAKES">Brakes (Pads / Rotors)</option>
                <option value="BATTERY">Battery & Charging</option>
                <option value="WIPERS">Wiper Blades</option>
                <option value="OTHER">Other Recommended Item</option>
              </select>
            </div>
          </div>

          {/* Urgency Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Priority Level
            </label>
            <div className="flex gap-2">
              <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                urgency === 'RECOMMENDED'
                  ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}>
                <input
                  type="radio"
                  name={`urgency-${ro.id}`}
                  value="RECOMMENDED"
                  checked={urgency === 'RECOMMENDED'}
                  onChange={() => setUrgency('RECOMMENDED')}
                  className="sr-only"
                />
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Recommended Maintenance</span>
              </label>

              <label className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                urgency === 'SAFETY'
                  ? 'bg-red-50 border-red-500 text-red-800 ring-1 ring-red-500'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}>
                <input
                  type="radio"
                  name={`urgency-${ro.id}`}
                  value="SAFETY"
                  checked={urgency === 'SAFETY'}
                  onChange={() => setUrgency('SAFETY')}
                  className="sr-only"
                />
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>Immediate Safety Concern</span>
              </label>
            </div>
          </div>

          {/* Inspection Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Inspection Findings / Reason (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Filter black with road debris, tread depth 2/32, due by mileage..."
              className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !customServiceName.trim()}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit to Advisor</span>
            </button>
          </div>
        </form>
      )}

      {/* Submitted Recommendations List */}
      {recommendations.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Requested Items on this RO:
          </div>

          <div className="space-y-1.5">
            {recommendations.map(rec => {
              const isApproved = rec.status === 'APPROVED';
              const isDeclined = rec.status === 'DECLINED';
              const isPending = rec.status === 'PENDING';

              return (
                <div
                  key={rec.id}
                  className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                    isApproved
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : isDeclined
                      ? 'bg-slate-100 border-slate-300 text-slate-600 opacity-75'
                      : 'bg-white border-amber-300 shadow-2xs text-slate-900'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {rec.serviceName}
                      </span>

                      {rec.urgency === 'SAFETY' ? (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-red-100 text-red-700 border border-red-300 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Safety Concern
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          Recommended Maint
                        </span>
                      )}

                      {/* Status Tag */}
                      {isPending && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Awaiting Customer Approval
                        </span>
                      )}
                      {isApproved && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                          <CheckCircle className="w-3 h-3" />
                          Authorized by Customer
                        </span>
                      )}
                      {isDeclined && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-slate-500" />
                          Declined
                        </span>
                      )}
                    </div>

                    {rec.notes && (
                      <div className="text-[11px] text-slate-600 italic">
                        "{rec.notes}"
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 flex items-center gap-2 flex-wrap pt-0.5">
                      <span>Requested by {rec.requestedByTechName}</span>
                      {rec.reviewedByAdvisorName && (
                        <>
                          <span>•</span>
                          <span>Reviewed by {rec.reviewedByAdvisorName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Advisor/Manager Approval Controls */}
                  {isAdvisorOrMgr && isPending && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 shrink-0"
                    >
                      <button
                        type="button"
                        onClick={() => handleReviewStatus(rec.id, 'APPROVED')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Customer authorized this service"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReviewStatus(rec.id, 'DECLINED', 'Customer declined at this time')}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer"
                        title="Customer declined this service"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
