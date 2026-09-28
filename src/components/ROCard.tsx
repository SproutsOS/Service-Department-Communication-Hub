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
import { formatDateTime, formatTimeOnly, formatEtaBadge, calculateDispatchedDuration, formatDurationSince, getDiagnosticStatusDetails, cleanRO3700 } from '../utils/formatters';
import { getContactCadenceStatus, isEligibleForCadence, isROCompleted, getPostRepairFollowUpStatus } from '../utils/cadenceUtils';

interface ROCardProps {
  ro: RepairOrder;
  onClick: () => void;
  compact?: boolean;
  onOpenFollowUp?: (ro: RepairOrder) => void;
  hideCauseCorrection?: boolean;
}

export const ROCard: React.FC<ROCardProps> = ({ 
  ro: rawRO, 
  onClick, 
  compact = false, 
  onOpenFollowUp,
  hideCauseCorrection = false
}) => {
  const ro = cleanRO3700(rawRO);
  const { users, currentUser } = useApp();
  const shouldHideCauseCorrection = hideCauseCorrection || currentUser?.role === 'SERVICE_ADVISOR';
  const isCompleted = isROCompleted(ro);
  const postRepair = isCompleted ? getPostRepairFollowUpStatus(ro) : null;
  const statusInfo = STATUS_CONFIG[ro.status] || STATUS_CONFIG.CREATED;
  const cadence = getContactCadenceStatus(ro);
  const showCadence = !isCompleted && isEligibleForCadence(ro);

  const techUser = users.find(u => u.id === ro.techId || u.name === ro.techName);
  const advisorUser = users.find(u => u.id === ro.advisorId || u.name === ro.advisorName);
  
  // Check parts in transit or with active ETA
  const activeParts = ro.parts.filter(p => p.status !== 'ISSUED_TO_TECH');
  const urgentPartsCount = ro.parts.filter(p => p.status === 'IN_TRANSIT' || p.status === 'ORDERED').length;

  // Determine if RO has parts quoted on estimate vs ordered on repair order
  const hasQuotedParts = Boolean(
    (ro.quote?.partsItems && ro.quote.partsItems.length > 0) ||
    ro.parts.some(p => p.status === 'QUOTE_ONLY' || p.requestType === 'QUOTE_ONLY')
  );
  const hasOrderedParts = Boolean(
    ro.parts.some(p => p.status !== 'QUOTE_ONLY' && (p.requestType === 'ORDER_NOW' || ['ORDERED', 'DAILY_ORDER', 'IN_STOCK', 'IN_TRANSIT', 'RECEIVED', 'ISSUED_TO_TECH', 'SPECIAL_ORDER', 'SPECIAL_ORDER_1_5_DAYS', 'VOR_UPGRADE', 'LOCAL_PURCHASE'].includes(p.status)))
  );

  const isWaitingApproval = ro.status === 'WAITING_FOR_APPROVAL';
  const hasPendingTechRec = ro.recommendations && ro.recommendations.some(r => r.status === 'PENDING');
  const isCommunicationAlert = isWaitingApproval || (showCadence && (cadence.isOverdue || cadence.isDueToday)) || (isCompleted && postRepair?.needsCall);

  return (
    <div
      id={`ro-card-${ro.id}`}
      onClick={onClick}
      className={`group relative bg-white rounded-xl border-2 transition-all duration-150 cursor-pointer hover:shadow-md hover:border-blue-600 ${
        ro.isUrgent || ro.isWaiter || isWaitingApproval || hasPendingTechRec || (isCompleted && postRepair?.isOverdue)
          ? 'border-red-600 ring-2 ring-red-400/40 shadow-xs' 
          : isCompleted && postRepair?.isDueToday
          ? 'border-amber-500 ring-2 ring-amber-400/40 shadow-xs'
          : 'border-slate-800 hover:border-black shadow-xs'
      } ${compact ? 'p-2' : 'p-2.5 sm:p-3'}`}
    >
      {/* 3-Day Post-Repair Customer Follow-Up Banner */}
      {isCompleted && postRepair?.needsCall && (
        <div className={`mb-2 px-2.5 py-1.5 rounded-lg text-white flex items-center justify-between text-xs font-black tracking-wide shadow-xs border ${
          postRepair.isOverdue 
            ? 'bg-red-600 border-red-700 animate-pulse' 
            : 'bg-amber-500 border-amber-600'
        }`}>
          <div className="flex items-center gap-1.5 truncate">
            <PhoneCall className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="truncate">
              {postRepair.isOverdue 
                ? `ACTION REQUIRED: 3-DAY CUSTOMER FOLLOW-UP OVERDUE (${postRepair.targetDate})` 
                : 'ACTION REQUIRED: 3-DAY FOLLOW UP DUE TODAY'}
            </span>
          </div>
          {onOpenFollowUp ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFollowUp(ro);
              }}
              className="text-[10px] font-black uppercase bg-white text-slate-900 px-2 py-0.5 rounded shadow-xs hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              📞 Log Call
            </button>
          ) : (
            <span className="text-[10px] font-black uppercase bg-white/20 px-1.5 py-0.2 rounded text-white shrink-0">
              CHECK SATISFACTION
            </span>
          )}
        </div>
      )}

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
          {isCompleted && postRepair && (
            <span 
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border-2 ${postRepair.badgeClass}`}
              title={`3-Day Follow Up: ${postRepair.label}`}
            >
              <PhoneCall className="w-2.5 h-2.5" />
              <span>{postRepair.label}</span>
            </span>
          )}
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

          {/* Service Advisor: Dynamic Parts Indicator / Status Badge */}
          {ro.status === 'PARTS_ORDERED' ? (
            hasQuotedParts && hasOrderedParts ? (
              <>
                <span 
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 bg-indigo-100 text-indigo-900 border-indigo-400"
                  title="Has quoted parts on estimate"
                >
                  Parts on Estimate
                </span>
                <span 
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 bg-purple-100 text-purple-900 border-purple-400"
                  title="Has parts ordered tracking live ETA"
                >
                  Parts Ordered (ETA)
                </span>
              </>
            ) : hasQuotedParts ? (
              <span 
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 bg-indigo-100 text-indigo-900 border-indigo-400"
                title="Parts quoted on customer estimate (awaiting approval)"
              >
                Parts on Estimate
              </span>
            ) : (
              <span 
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 bg-purple-100 text-purple-900 border-purple-400"
                title="Parts ordered tracking live ETA arrival"
              >
                Parts Ordered (ETA)
              </span>
            )
          ) : (
            <>
              {/* If in another status, still show parts indicator pill if parts are on estimate or ordered */}
              {!isCompleted && hasQuotedParts && (
                <span 
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 bg-indigo-50 text-indigo-800 border-indigo-300"
                  title="Has parts quoted on estimate"
                >
                  Parts on Estimate
                </span>
              )}
              {!isCompleted && hasOrderedParts && (
                <span 
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 bg-purple-50 text-purple-800 border-purple-300"
                  title="Has active parts ordered"
                >
                  Parts Ordered (ETA)
                </span>
              )}
              <span 
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 ${statusInfo.badgeClass}`}
              >
                {statusInfo.label}
              </span>
            </>
          )}
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

        {/* Customer Stated Complaints / Concerns */}
        {(() => {
          const cardConcerns = ro.concerns && ro.concerns.length > 0 
            ? ro.concerns 
            : [ro.primaryConcern || 'General Inspection'];
          return (
            <div className="text-xs text-slate-700 mt-1 space-y-1">
              {cardConcerns.map((c, idx) => (
                <div key={idx} className="flex items-start gap-1.5 leading-snug">
                  <span className="font-mono text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 shrink-0">
                    L{idx + 1}
                  </span>
                  <span className="font-semibold text-slate-900 line-clamp-2">
                    {c}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Tech Diagnosis & Repair (Cause & Correction) if documented */}
        {!shouldHideCauseCorrection && (ro.cause || ro.correction) && (
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

      {/* Parts Quoted on Estimate or Ordered and Tracked with ETA */}
      {(ro.parts.length > 0 || (ro.quote?.partsItems && ro.quote.partsItems.length > 0)) && (
        <div className="mt-1.5 p-1.5 bg-slate-50 rounded-lg border-2 border-slate-700">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Package className={`w-3.5 h-3.5 ${hasQuotedParts && !hasOrderedParts ? 'text-indigo-600' : 'text-blue-600'}`} />
              {hasQuotedParts && hasOrderedParts ? (
                <span>Parts on Estimate & Ordered ({ro.parts.length + (ro.quote?.partsItems?.length || 0)})</span>
              ) : hasQuotedParts ? (
                <span>Parts on Estimate ({ro.quote?.partsItems?.length || ro.parts.filter(p => p.status === 'QUOTE_ONLY' || p.requestType === 'QUOTE_ONLY').length})</span>
              ) : (
                <span>Parts Ordered & Tracked ({ro.parts.length})</span>
              )}
            </span>
            {urgentPartsCount > 0 && (
              <span className="text-orange-600 font-bold uppercase text-[10px] flex items-center gap-1">
                <Truck className="w-3 h-3" /> Live Delivery
              </span>
            )}
            {hasQuotedParts && !hasOrderedParts && (
              <span className="text-indigo-700 font-bold uppercase text-[10px] flex items-center gap-1">
                Quote Only
              </span>
            )}
          </div>

          <div className="space-y-1">
            {/* Show up to 2 items (prioritizing ordered parts first, then quoted parts) */}
            {ro.parts.slice(0, 2).map(part => {
              const etaBadge = formatEtaBadge(part.estimatedArrival);
              const isQuote = part.status === 'QUOTE_ONLY' || part.requestType === 'QUOTE_ONLY';
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
                      isQuote
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                        : part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : part.status === 'IN_TRANSIT'
                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                        : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}>
                      {isQuote ? 'ON ESTIMATE' : part.status.replace('_', ' ')}
                    </span>
                    {!isQuote && part.estimatedArrival && part.status !== 'ISSUED_TO_TECH' && (
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
            {ro.parts.length === 0 && ro.quote?.partsItems && ro.quote.partsItems.slice(0, 2).map(qp => (
              <div 
                key={qp.id} 
                className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border-2 border-slate-600"
              >
                <div className="truncate pr-2">
                  {qp.partNumber && <span className="font-mono text-[11px] text-slate-500 mr-1.5">#{qp.partNumber}</span>}
                  <span className="font-medium text-slate-900">{qp.description}</span>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-indigo-100 text-indigo-800 border-indigo-300">
                    ON ESTIMATE
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                    ${(Number(qp.unitPrice) || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {(ro.parts.length > 2 || (ro.quote?.partsItems && ro.quote.partsItems.length > 2)) && (
              <p className="text-[10px] text-slate-500 text-right">
                +{Math.max(0, (ro.parts.length || ro.quote?.partsItems?.length || 0) - 2)} more parts
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
