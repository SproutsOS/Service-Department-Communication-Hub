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
      const isQuoteOnly = p.status === 'QUOTE_ONLY' || p.requestType === 'QUOTE_ONLY';
      const unitPrice = typeof p.price === 'number' ? p.price : (p.price ? parseFloat(String(p.price)) : 0);
      const qty = p.quantity && p.quantity > 0 ? p.quantity : 1;

      // Determine availability & badge style
      let availability = 'Pending Parts Dept';
      let badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';

      const upperStatus = (p.status || '').toUpperCase();
      if (upperStatus === 'IN_STOCK') {
        availability = 'In Stock (Ready Now)';
        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      } else if (upperStatus === 'RECEIVED') {
        availability = 'Received (Parts Counter)';
        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      } else if (upperStatus === 'ISSUED_TO_TECH') {
        availability = 'Issued to Tech';
        badgeClass = 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
      } else if (upperStatus === 'BACKORDERED') {
        availability = p.estimatedArrival ? `Backordered (${p.estimatedArrival})` : 'Backordered';
        badgeClass = 'bg-red-100 text-red-800 border-red-300 font-bold';
      } else if (upperStatus === 'ORDERED' || upperStatus === 'IN_TRANSIT') {
        availability = p.estimatedArrival ? `Ordered (${p.estimatedArrival})` : 'Ordered';
        badgeClass = 'bg-blue-50 text-blue-800 border-blue-300 font-medium';
      } else if (p.estimatedArrival && p.estimatedArrival !== 'Price Quote Needed') {
        availability = p.estimatedArrival;
        badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-medium';
      } else if (isQuoteOnly) {
        availability = 'Quote Only (Pricing Estimate)';
        badgeClass = 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
      } else if (upperStatus === 'REQUESTED' || upperStatus === 'NEEDED') {
        availability = 'Requested by Tech';
        badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
      }

      lineParts.push({
        id: p.id,
        name: p.description || p.name || 'Part',
        partNumber: p.partNumber,
        quantity: qty,
        price: unitPrice,
        subtotal: unitPrice * qty,
        availability,
        status: p.status,
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

      lineParts.push({
        id: qp.id,
        name: qp.description,
        partNumber: qp.partNumber,
        quantity: qty,
        price: unitPrice,
        subtotal,
        availability: 'Quoted on Estimate',
        status: 'QUOTE_ONLY',
        isQuoteOnly: true,
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
        source: 'QUOTE_PART',
      });
    }
  });

  return lineParts;
}
