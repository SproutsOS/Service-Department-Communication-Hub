import { RepairOrder, PartItem, QuotePartItem } from '../types';

export interface IntegratedLinePart {
  id: string;
  name: string;
  partNumber?: string;
  quantity: number;
  price: number;
  subtotal: number;
  availability: string;
  status: string;
  isQuoteOnly: boolean;
  badgeClass: string;
  vendor?: string;
  trackingNumber?: string;
  source: 'RO_PART' | 'QUOTE_PART';
}

/**
 * Returns all parts assigned to a specific RO line number (1-based: Line 1, Line 2, etc.),
 * unifying data from ro.parts and ro.quote.partsItems with calculated Price, Qty, and Availability.
 */
export function getLineParts(ro: RepairOrder, lineNum: number): IntegratedLinePart[] {
  const lineParts: IntegratedLinePart[] = [];
  const seenIds = new Set<string>();

  // 1. Process parts from ro.parts
  (ro.parts || []).forEach((p: PartItem) => {
    let matchesLine = false;
    if (p.roLineNumber !== undefined && p.roLineNumber !== null) {
      matchesLine = Number(p.roLineNumber) === lineNum;
    } else if (p.notes) {
      const match = p.notes.match(/For Line (\d+)/i);
      if (match) {
        matchesLine = parseInt(match[1], 10) === lineNum;
      } else {
        matchesLine = lineNum === 1;
      }
    } else {
      matchesLine = lineNum === 1;
    }

    if (matchesLine) {
      seenIds.add(p.id);
      const isLineDeclined = ro.status === 'DENIED' || 
                             ro.quote?.status === 'DECLINED' || 
                             ro.quote?.lineStatuses?.[lineNum] === 'DECLINED';
      const isQuote = (p.status === 'QUOTE_ONLY' || p.requestType === 'QUOTE_ONLY') && 
                      p.status !== 'ORDERED' && 
                      p.status !== 'IN_STOCK' && 
                      p.status !== 'RECEIVED' && 
                      p.status !== 'ISSUED_TO_TECH';
      const unitPrice = typeof p.price === 'number' ? p.price : (p.price ? parseFloat(String(p.price)) : 0);
      const qty = p.quantity && p.quantity > 0 ? p.quantity : 1;

      const upperStatus = (p.status || '').toUpperCase();

      // Determine availability, status & badge style accurately per part
      let availability = 'Parts Requested';
      let badgeClass = 'bg-blue-100 text-blue-900 border-blue-300 font-bold';
      let isQuoteOnly = false;
      let finalStatus = p.status;

      if (upperStatus === 'DECLINED' || upperStatus === 'CANCELLED' || (isLineDeclined && !['ORDERED', 'RECEIVED', 'ISSUED_TO_TECH', 'IN_STOCK'].includes(upperStatus))) {
        availability = 'Declined by Customer';
        badgeClass = 'bg-red-100 text-red-900 border-red-300 font-extrabold';
        finalStatus = 'DECLINED';
      } else if (upperStatus === 'IN_STOCK') {
        availability = 'In Stock (Ready Now)';
        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      } else if (upperStatus === 'RECEIVED' || upperStatus === 'ISSUED_TO_TECH') {
        availability = upperStatus === 'ISSUED_TO_TECH' ? 'Issued to Tech' : 'Parts In / Received';
        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      } else if (upperStatus === 'BACKORDERED') {
        availability = p.estimatedArrival ? `Backordered (${p.estimatedArrival})` : 'Backordered';
        badgeClass = 'bg-red-100 text-red-800 border-red-300 font-bold';
      } else if (upperStatus === 'ORDERED' || upperStatus === 'IN_TRANSIT' || upperStatus === 'DAILY_ORDER' || upperStatus === 'LOCAL_PURCHASE' || upperStatus === 'SPECIAL_ORDER' || upperStatus === 'SPECIAL_ORDER_1_5_DAYS' || upperStatus === 'VOR_UPGRADE') {
        availability = p.estimatedArrival && p.estimatedArrival !== 'Price Quote Needed' && p.estimatedArrival !== 'Pending Parts Counter'
          ? `Ordered (${p.estimatedArrival})` 
          : 'Parts Ordered';
        badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      } else if (isQuote) {
        availability = 'On Quote (Pending Approval)';
        badgeClass = 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold';
        isQuoteOnly = true;
      } else if (p.estimatedArrival && p.estimatedArrival !== 'Price Quote Needed' && p.estimatedArrival !== 'Pending Parts Counter') {
        availability = p.estimatedArrival;
        badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-medium';
      } else {
        availability = 'Parts Requested';
        badgeClass = 'bg-blue-100 text-blue-900 border-blue-300 font-bold';
      }

      lineParts.push({
        id: p.id,
        name: p.description || p.name || 'Part',
        partNumber: p.partNumber,
        quantity: qty,
        price: unitPrice,
        subtotal: unitPrice * qty,
        availability,
        status: finalStatus,
        isQuoteOnly,
        badgeClass,
        vendor: p.vendor,
        trackingNumber: p.trackingNumber,
        source: 'RO_PART',
      });
    }
  });

  // 2. Process parts from ro.quote.partsItems (if not already represented from ro.parts)
  (ro.quote?.partsItems || []).forEach((qp: QuotePartItem) => {
    const qpLine = qp.roLineNumber || 1;
    if (qpLine === lineNum) {
      // Check if sourcePartId was already matched
      if (qp.sourcePartId && seenIds.has(qp.sourcePartId)) {
        return;
      }
      // Check if already captured by description & part number
      const alreadyCaptured = lineParts.some(
        lp => lp.name.trim().toLowerCase() === qp.description.trim().toLowerCase()
      );
      if (alreadyCaptured) {
        return;
      }

      const unitPrice = typeof qp.unitPrice === 'number' ? qp.unitPrice : 0;
      const qty = qp.quantity || 1;
      const subtotal = typeof qp.subtotal === 'number' ? qp.subtotal : unitPrice * qty;

      const isLineDeclined = ro.status === 'DENIED' || 
                             ro.quote?.status === 'DECLINED' || 
                             ro.quote?.lineStatuses?.[lineNum] === 'DECLINED';

      const isROApproved = Boolean(
        !isLineDeclined && (
          ro.status === 'APPROVED' || 
          ro.quote?.status === 'APPROVED' || 
          ['APPROVED', 'PARTS_ORDERED', 'PARTS_IN_TO_TECH', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETE', 'READY_FOR_PICKUP', 'CLOSED'].includes(ro.status)
        )
      );

      let availability = isROApproved ? 'Approved (Order Now)' : 'On Quote (Pending Approval)';
      let status = isROApproved ? 'APPROVED' : 'QUOTE_ONLY';
      let isQuoteOnly = !isROApproved;
      let badgeClass = isROApproved 
        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' 
        : 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold';

      if (isLineDeclined) {
        availability = 'Declined by Customer';
        status = 'DECLINED';
        isQuoteOnly = false;
        badgeClass = 'bg-red-100 text-red-900 border-red-300 font-extrabold';
      }

      lineParts.push({
        id: qp.id,
        name: qp.description,
        partNumber: qp.partNumber,
        quantity: qty,
        price: unitPrice,
        subtotal,
        availability,
        status,
        isQuoteOnly,
        badgeClass,
        source: 'QUOTE_PART',
      });
    }
  });

  return lineParts;
}
