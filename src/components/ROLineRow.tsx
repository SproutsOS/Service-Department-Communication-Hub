import React from 'react';
import { 
  PhoneCall, 
  Clock, 
  Wrench, 
  Calendar, 
  ChevronRight, 
  Camera, 
  AlertTriangle, 
  AlertCircle, 
  Sparkles, 
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import { RepairOrder, User as AppUser } from '../types';
import { STATUS_CONFIG } from '../data/mockData';
import { formatDurationSince, formatDateTime, formatEtaBadge, getDiagnosticStatusDetails } from '../utils/formatters';
import { getContactCadenceStatus } from '../utils/cadenceUtils';

interface ROLineRowProps {
  ro: RepairOrder;
  onClick: () => void;
  users: AppUser[];
  showCadence?: boolean;
}

export const ROLineRow: React.FC<ROLineRowProps> = ({
  ro,
  onClick,
  users,
  showCadence = true
}) => {
  const statusInfo = STATUS_CONFIG[ro.status] || STATUS_CONFIG.CREATED;
  const cadence = getContactCadenceStatus(ro);
  const diagInfo = getDiagnosticStatusDetails(ro);

  const advisorUser = users.find(u => u.id === ro.advisorId || u.name === ro.advisorName);
  const techUser = users.find(u => u.id === ro.techId || u.name === ro.techName);

  const activePart = ro.parts.find(p => p.status === 'IN_TRANSIT' || p.status === 'ORDERED' || p.status === 'SPECIAL_ORDER_1_5_DAYS' || p.status === 'DAILY_ORDER');
  const etaBadge = activePart ? formatEtaBadge(activePart.estimatedArrival) : null;
  const pendingTechRecs = ro.recommendations ? ro.recommendations.filter(r => r.status === 'PENDING').length : 0;

  return (
    <tr 
      id={`ro-line-row-${ro.id}`}
      onClick={onClick}
      className={`group cursor-pointer transition-colors border-b border-slate-200 text-xs ${
        ro.isUrgent 
          ? 'bg-red-50/40 hover:bg-red-50' 
          : ro.isWaiter
          ? 'bg-amber-50/30 hover:bg-amber-50/60'
          : 'bg-white hover:bg-blue-50/50'
      }`}
    >
      {/* 1. RO # & Priority Badges */}
      <td className="px-3 py-3 font-bold whitespace-nowrap align-top">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-sm font-black text-blue-600 group-hover:text-blue-800">
            #{ro.id}
          </span>
          {ro.isUrgent && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-300">
              <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
              <span>Priority</span>
            </span>
          )}
          {ro.isWaiter && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-300">
              <Clock className="w-2.5 h-2.5 text-red-600" />
              <span>Waiter</span>
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-500 font-normal mt-0.5 flex items-center gap-1 flex-wrap">
          <span>In shop:</span>
          <span className="font-semibold text-slate-700">{formatDurationSince(ro.createdAt) || 'New'}</span>
        </div>
      </td>

      {/* 2. Customer & Contact */}
      <td className="px-3 py-3 align-top min-w-[140px]">
        <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
          {ro.customerName}
        </div>
        {ro.customerPhone && (
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {ro.customerPhone}
          </div>
        )}
      </td>

      {/* 3. Vehicle & VIN */}
      <td className="px-3 py-3 align-top min-w-[150px]">
        <div className="font-semibold text-slate-800 whitespace-nowrap">
          {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
        </div>
        <div className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span title={ro.vehicle.vin}>
            VIN: {ro.vehicle.vin ? ro.vehicle.vin.slice(-8) : 'N/A'}
          </span>
          {ro.vehicle.mileage !== undefined && ro.vehicle.mileage !== null && Number(ro.vehicle.mileage) > 0 && (
            <span>• {Number(ro.vehicle.mileage).toLocaleString()} mi</span>
          )}
        </div>
      </td>

      {/* 4. Concern Lines / 3 C's */}
      <td className="px-3 py-3 align-top max-w-xs">
        <div className="text-slate-800 line-clamp-2">
          <span className="font-bold text-slate-600">Line 1: </span>
          <span>{ro.primaryConcern}</span>
        </div>
        {ro.concerns && ro.concerns.length > 1 && (
          <div className="text-[10px] text-blue-600 font-bold mt-0.5">
            +{ro.concerns.length - 1} more concern line{ro.concerns.length - 1 > 1 ? 's' : ''}
          </div>
        )}
        {(ro.cause || ro.correction) && (
          <div className="text-[10px] text-slate-600 mt-1 space-y-0.5 bg-slate-50 p-1 rounded border border-slate-200">
            {ro.cause && (
              <div className="truncate">
                <strong className="text-amber-800 font-bold">Cause: </strong>
                <span>{ro.cause}</span>
              </div>
            )}
            {ro.correction && (
              <div className="truncate">
                <strong className="text-emerald-800 font-bold">Correction: </strong>
                <span>{ro.correction}</span>
              </div>
            )}
          </div>
        )}
      </td>

      {/* 5. Status & Diag Stage */}
      <td className="px-3 py-3 whitespace-nowrap align-top">
        <div className="flex flex-col gap-1 items-start">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 ${statusInfo.badgeClass}`}>
            {statusInfo.label}
          </span>
          {diagInfo && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
              diagInfo.isWaiting 
                ? 'bg-amber-50 text-amber-900 border-amber-300' 
                : 'bg-blue-50 text-blue-900 border-blue-300'
            }`}>
              {diagInfo.isWaiting ? <Clock className="w-2.5 h-2.5 text-amber-600" /> : <Wrench className="w-2.5 h-2.5 text-blue-600" />}
              <span>{diagInfo.label}</span>
            </span>
          )}
          {pendingTechRecs > 0 && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-300">
              <Sparkles className="w-2.5 h-2.5 text-red-600" />
              <span>{pendingTechRecs} Tech Rec Pending</span>
            </span>
          )}
        </div>
      </td>

      {/* 6. Customer Promised Time */}
      <td className="px-3 py-3 whitespace-nowrap align-top">
        <div className="font-semibold text-slate-800">
          {ro.promisedTime ? formatDateTime(ro.promisedTime) : <span className="text-slate-400 font-normal italic">Not set</span>}
        </div>
      </td>

      {/* 7. Assigned Tech */}
      <td className="px-3 py-3 whitespace-nowrap align-top">
        <div className="flex items-center gap-1 text-slate-800 font-semibold">
          <Wrench className="w-3 h-3 text-slate-500 shrink-0" />
          <span>{ro.techName || 'Unassigned'}</span>
          {techUser?.employeeNumber && (
            <span className="font-mono text-[10px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-300">
              #{techUser.employeeNumber}
            </span>
          )}
        </div>
      </td>

      {/* 8. Customer Follow-Up (Cadence) */}
      {showCadence && (
        <td className="px-3 py-3 whitespace-nowrap align-top">
          <div>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              cadence.isOverdue || cadence.isDueToday 
                ? 'bg-red-100 text-red-900 border-red-500 font-black' 
                : cadence.badgeClass
            }`}>
              <PhoneCall className="w-2.5 h-2.5" />
              <span>{cadence.label}</span>
            </span>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
              {cadence.lastContactText}
            </div>
          </div>
        </td>
      )}

      {/* 9. Parts Status / Photos / Action */}
      <td className="px-3 py-3 whitespace-nowrap align-top text-right">
        <div className="flex items-center justify-end gap-1.5">
          {ro.vehiclePhotos && ro.vehiclePhotos.length > 0 && (
            <span 
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200"
              title={`${ro.vehiclePhotos.length} Vehicle Intake Photos`}
            >
              <Camera className="w-3 h-3 text-blue-600" />
              <span>{ro.vehiclePhotos.length}</span>
            </span>
          )}
          {ro.messages && ro.messages.length > 0 && (
            <span 
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200"
              title={`${ro.messages.length} Messages`}
            >
              <MessageSquare className="w-3 h-3 text-slate-500" />
              <span>{ro.messages.length}</span>
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </td>
    </tr>
  );
};
