import React from 'react';
import { 
  Clock, 
  User, 
  Wrench, 
  Package, 
  MessageSquare, 
  AlertTriangle, 
  AlertCircle,
  Calendar, 
  ArrowRight,
  Send,
  Truck,
  PhoneCall,
  Sparkles,
  CheckCircle,
  Camera
} from 'lucide-react';
import { RepairOrder, ROStatus } from '../types';
import { STATUS_CONFIG } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { formatDateTime, formatTimeOnly, formatEtaBadge, calculateDispatchedDuration, formatDurationSince, getDiagnosticStatusDetails } from '../utils/formatters';
import { getContactCadenceStatus, isEligibleForCadence } from '../utils/cadenceUtils';

interface ROCardProps {
  ro: RepairOrder;
  onClick: () => void;
  compact?: boolean;
}

export const ROCard: React.FC<ROCardProps> = ({ ro, onClick, compact = false }) => {
  const { users } = useApp();
  const statusInfo = STATUS_CONFIG[ro.status] || STATUS_CONFIG.CREATED;
  const cadence = getContactCadenceStatus(ro);
  const showCadence = isEligibleForCadence(ro);

  const techUser = users.find(u => u.id === ro.techId || u.name === ro.techName);
  const advisorUser = users.find(u => u.id === ro.advisorId || u.name === ro.advisorName);
  
  // Check parts in transit or with active ETA
  const activeParts = ro.parts.filter(p => p.status !== 'ISSUED_TO_TECH');
  const urgentPartsCount = ro.parts.filter(p => p.status === 'IN_TRANSIT' || p.status === 'ORDERED').length;

  const isWaitingApproval = ro.status === 'WAITING_FOR_APPROVAL';
  const hasPendingTechRec = ro.recommendations && ro.recommendations.some(r => r.status === 'PENDING');
  const isCommunicationAlert = isWaitingApproval || (showCadence && (cadence.isOverdue || cadence.isDueToday));

  return (
    <div
      id={`ro-card-${ro.id}`}
      onClick={onClick}
      className={`group relative bg-white rounded-xl border-2 transition-all duration-150 cursor-pointer hover:shadow-md hover:border-blue-600 ${
        ro.isUrgent || ro.isWaiter || isWaitingApproval || hasPendingTechRec
          ? 'border-red-600 ring-2 ring-red-400/40 shadow-xs' 
          : 'border-slate-800 hover:border-black shadow-xs'
      } ${compact ? 'p-2' : 'p-2.5 sm:p-3'}`}
    >
      {/* High-Visibility Red Communication Alert Banner at Top of Card */}
      {isWaitingApproval && (
        <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-red-600 text-white flex items-center justify-between text-xs font-black tracking-wide shadow-xs border border-red-700 animate-pulse">
          <div className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="truncate">ACTION REQUIRED: WAITING ON CUSTOMER APPROVAL</span>
          </div>
          <span className="text-[10px] font-black uppercase bg-white/20 px-1.5 py-0.2 rounded text-white shrink-0">
            URGENT
          </span>
        </div>
      )}

      {!isWaitingApproval && hasPendingTechRec && (
        <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-red-600 text-white flex items-center justify-between text-xs font-black tracking-wide shadow-xs border border-red-700">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="truncate">
              ACTION REQUIRED: {ro.recommendations.filter(r => r.status === 'PENDING').length} TECH REC PENDING REVIEW
            </span>
          </div>
        </div>
      )}

      {/* Top Bar: RO Number, Status Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-sm sm:text-base text-blue-600 tracking-tight">
            #{ro.id}
          </span>
          {ro.isUrgent && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md border-2 border-red-500">
              <AlertTriangle className="w-3 h-3 text-red-600" /> HIGH PRIORITY
            </span>
          )}
          {ro.isWaiter && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md border-2 border-red-500">
              <Clock className="w-3 h-3 text-red-600" /> WAITER
            </span>
          )}
        </div>

        {/* Status & Cadence Badges */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {showCadence && (
            <span 
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border-2 ${
                cadence.isOverdue || cadence.isDueToday 
                  ? 'bg-red-100 text-red-900 border-red-500 font-black' 
                  : cadence.badgeClass
              }`}
              title={`Customer Follow-Up: ${cadence.lastContactText} • ${cadence.nextDueText}`}
            >
              <PhoneCall className="w-2.5 h-2.5" />
              <span>{cadence.label}</span>
            </span>
          )}
          <span 
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 ${statusInfo.badgeClass}`}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Diagnostic Phase Highlight: Waiting vs Active Diagnosis */}
      {(() => {
        const diagInfo = getDiagnosticStatusDetails(ro);
        if (!diagInfo) return null;
        return (
          <div className={`mt-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs flex items-center justify-between gap-2 ${
            diagInfo.isWaiting 
              ? 'bg-amber-50 border-amber-500 text-amber-950' 
              : 'bg-blue-50 border-blue-500 text-blue-950'
          }`}>
            <span className="font-semibold flex items-center gap-1.5 text-[11px]">
              {diagInfo.isWaiting ? (
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              ) : (
                <Wrench className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-spin-slow" />
              )}
              {diagInfo.label}
            </span>
            <span className="text-[11px] font-medium opacity-90 truncate">
              {diagInfo.timeLabel} ({diagInfo.duration})
            </span>
          </div>
        );
      })()}

      {/* Customer & Vehicle Info */}
      <div className="mt-2">
        <div className="flex items-baseline justify-between gap-1">
          <h4 className="text-sm font-bold text-slate-900 truncate">
            {ro.customerName}
          </h4>
          <span className="text-xs text-slate-600 font-medium whitespace-nowrap flex items-center gap-1.5">
            <span>{ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}</span>
            {ro.vehicle.mileage !== undefined && ro.vehicle.mileage !== null && Number(ro.vehicle.mileage) > 0 && (
              <span className="font-mono text-slate-500 font-normal">
                • {Number(ro.vehicle.mileage).toLocaleString()} mi
              </span>
            )}
          </span>
        </div>

        {/* Time in Shop under customer name with Promised Time to the right */}
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs py-1 px-2 rounded-lg bg-slate-50 border-2 border-slate-700">
          <div className="flex items-center gap-1 text-slate-700 font-semibold truncate">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-slate-600 font-normal">Time in shop:</span>
            <span className="text-slate-900 font-bold">{formatDurationSince(ro.createdAt) || 'Just arrived'}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-700 font-semibold shrink-0 text-right">
            <span className="text-slate-600 font-normal">Promised:</span>
            <span className={`font-bold ${ro.promisedTime ? 'text-slate-900' : 'text-slate-400 font-normal italic'}`}>
              {ro.promisedTime ? formatDateTime(ro.promisedTime) : 'Not set'}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-500 mt-1 flex items-center justify-between gap-1">
          <span className="truncate">
            <span className="font-semibold text-slate-700">Concern:</span> {ro.primaryConcern}
          </span>
          {ro.concerns && ro.concerns.length > 1 && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border-2 border-blue-400">
              +{ro.concerns.length - 1} more
            </span>
          )}
        </div>

        {/* Tech Diagnosis & Repair (Cause & Correction) if documented */}
        {(ro.cause || ro.correction) && (
          <div className="mt-1 text-[11px] bg-slate-50 p-1.5 rounded-md border-2 border-slate-700 space-y-0.5">
            {ro.cause && (
              <div className="flex items-start gap-1.5 truncate">
                <span className="font-bold text-amber-800 shrink-0">Cause:</span>
                <span className="text-slate-800 truncate font-mono text-[10px]">{ro.cause}</span>
              </div>
            )}
            {ro.correction && (
              <div className="flex items-start gap-1.5 truncate">
                <span className="font-bold text-emerald-800 shrink-0">Correction:</span>
                <span className="text-slate-800 truncate font-mono text-[10px]">{ro.correction}</span>
              </div>
            )}
          </div>
        )}

        {/* Tech Recommendations Badges */}
        {ro.recommendations && ro.recommendations.length > 0 && (
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {ro.recommendations.some(r => r.status === 'PENDING') && (
              <span className="text-[10px] font-black text-red-700 bg-red-50 px-2 py-0.5 rounded-md border-2 border-red-500 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-red-600 shrink-0" />
                <span>{ro.recommendations.filter(r => r.status === 'PENDING').length} Tech Rec Pending</span>
              </span>
            )}
            {ro.recommendations.some(r => r.status === 'APPROVED') && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border-2 border-emerald-500 flex items-center gap-1">
                <CheckCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                <span>{ro.recommendations.filter(r => r.status === 'APPROVED').length} Approved</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Assignment Info: When Assigned and to Which Tech */}
      <div className="mt-1.5 pt-1.5 border-t-2 border-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
        
        {/* Date Repair Order was made */}
        <div className="flex items-center gap-1.5 text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate text-[11px]">
            <strong className="font-medium text-slate-700">Created:</strong> {formatDateTime(ro.createdAt)}
          </span>
        </div>

        {/* When Assigned & Tech Name */}
        <div className="flex items-center gap-1.5 text-slate-600">
          <Send className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {ro.techName || (ro.concernTechNames && ro.concernTechNames.some(Boolean)) ? (
            <span className="truncate text-[11px] inline-flex items-center gap-1 flex-wrap">
              <strong className="font-medium text-slate-700">Tech:</strong> 
              <span>{ro.techName || ro.concernTechNames?.find(Boolean)}</span>
              {techUser?.employeeNumber && (
                <span className="font-mono text-[11px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-800 border-2 border-slate-600">
                  {techUser.employeeNumber}
                </span>
              )}
              {(() => {
                const uniqueLineTechs = Array.from(new Set(ro.concernTechNames?.filter(Boolean) || []));
                if (uniqueLineTechs.length > 1) {
                  return (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-50 text-purple-700 rounded border border-purple-200">
                      {uniqueLineTechs.length} Techs
                    </span>
                  );
                }
                return null;
              })()}
              {ro.dispatchedAt ? ` (${formatTimeOnly(ro.dispatchedAt)})` : ''}
            </span>
          ) : (
            <span className="text-orange-600 font-medium italic text-[11px]">
              Unassigned / Ready
            </span>
          )}
        </div>
      </div>

      {/* Parts Ordered and Tracked with ETA Directly on Dashboard */}
      {ro.parts.length > 0 && (
        <div className="mt-1.5 p-1.5 bg-slate-50 rounded-lg border-2 border-slate-700">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-blue-600" />
              Parts Ordered & Tracked ({ro.parts.length})
            </span>
            {urgentPartsCount > 0 && (
              <span className="text-orange-600 font-bold uppercase text-[10px] flex items-center gap-1">
                <Truck className="w-3 h-3" /> Live Delivery
              </span>
            )}
          </div>

          <div className="space-y-1">
            {ro.parts.slice(0, 2).map(part => {
              const etaBadge = formatEtaBadge(part.estimatedArrival);
              return (
                <div 
                  key={part.id} 
                  className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border-2 border-slate-600"
                >
                  <div className="truncate pr-2">
                    <span className="font-mono text-[11px] text-slate-500 mr-1.5">#{part.partNumber}</span>
                    <span className="font-medium text-slate-900">{part.description}</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : part.status === 'IN_TRANSIT'
                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                        : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}>
                      {part.status.replace('_', ' ')}
                    </span>
                    {part.estimatedArrival && part.status !== 'ISSUED_TO_TECH' && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        etaBadge.pastDue 
                          ? 'bg-red-100 text-red-800 border-red-300' 
                          : 'bg-orange-100 text-orange-800 border-orange-300'
                      }`}>
                        {etaBadge.text}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {ro.parts.length > 2 && (
              <p className="text-[10px] text-slate-500 text-right">
                +{ro.parts.length - 2} more parts on order
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer: Advisor, Messages Count, Open details prompt */}
      <div className="mt-1.5 pt-1.5 border-t-2 border-slate-600 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            Advisor: <strong className="text-slate-800 font-medium">{ro.advisorName}</strong>
            {advisorUser?.employeeNumber && (
              <span className="font-mono text-xs font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-800 border-2 border-slate-400">
                {advisorUser.employeeNumber}
              </span>
            )}
          </span>
          {ro.messages.length > 0 && (
            <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full text-[11px] border border-slate-300">
              <MessageSquare className="w-3 h-3" />
              {ro.messages.length}
            </span>
          )}
          {ro.vehiclePhotos && ro.vehiclePhotos.length > 0 && (
            <span 
              className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[11px] border border-blue-300 font-bold"
              title={`${ro.vehiclePhotos.length} Vehicle Intake Photos`}
            >
              <Camera className="w-3 h-3 text-blue-600" />
              {ro.vehiclePhotos.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform text-xs">
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>

    </div>
  );
};
