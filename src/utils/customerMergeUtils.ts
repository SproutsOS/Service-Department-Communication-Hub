import { Customer, VehicleInfo, RepairOrder, StandaloneQuote } from '../types';

/**
 * Normalizes a customer name for matching and grouping.
 * Strips punctuation, excess whitespace, and lowercases.
 */
export function normalizeCustomerKey(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a customer name represents the Woolwine CDJR dealership house account.
 * Matches: "Woolwine CDJR", "Woolwine CDJR Inc", "Woolwine CDJR, Inc.", "Woolwine CDJR Inc.", etc.
 */
export const DEFAULT_WOOLWINE_CUSTOMER: Customer = {
  id: 'cust_woolwine_house_account',
  name: 'Woolwine CDJR',
  phone: '(662) 287-3181',
  email: 'service@woolwinecdjr.com',
  address: '3980 Highway 72 E, Corinth, MS 38834',
  isTaxExempt: true,
  taxExemptNumber: 'DEALER-RESALE',
  notes: 'Woolwine CDJR Dealership House Account • Unified Dealership Inventory & Used Vehicle Reconditioning',
  vehicles: [],
  totalVisits: 1,
  createdAt: '2026-01-01T08:00:00Z',
  updatedAt: new Date().toISOString()
};

/**
 * Checks if a customer name represents the Woolwine CDJR dealership house account.
 * Matches: "Woolwine CDJR", "Woolwine CDJR Inc", "Woolwine CDJR, Inc.", "Woolwine CDJR Inc.", "Woolwine Inc", "Woolwine", etc.
 */
export function isWoolwineCustomerName(name?: string | null): boolean {
  if (!name) return false;
  const key = normalizeCustomerKey(name);
  return key.includes('woolwine') || (key.includes('cdjr') && (key.includes('dealer') || key.includes('inventory') || key.includes('house') || key.includes('internal')));
}

/**
 * Checks if two customer names belong to the same Woolwine CDJR dealership identity.
 */
export function areBothWoolwineAccounts(nameA?: string | null, nameB?: string | null): boolean {
  return isWoolwineCustomerName(nameA) && isWoolwineCustomerName(nameB);
}

/**
 * Merges vehicle lists from two customer records, deduplicating by VIN or (Year + Make + Model).
 */
export function mergeCustomerVehicles(
  primaryVehicles: VehicleInfo[] = [],
  secondaryVehicles: VehicleInfo[] = []
): VehicleInfo[] {
  const merged: VehicleInfo[] = [...primaryVehicles];
  const seenVins = new Set<string>();
  const seenVehicleKeys = new Set<string>();

  primaryVehicles.forEach(v => {
    if (v.vin && v.vin.trim()) {
      seenVins.add(v.vin.trim().toUpperCase());
    } else {
      const key = `${v.year || ''}_${(v.make || '').toLowerCase()}_${(v.model || '').toLowerCase()}`;
      seenVehicleKeys.add(key);
    }
  });

  secondaryVehicles.forEach(v => {
    const vinClean = (v.vin || '').trim().toUpperCase();
    if (vinClean) {
      if (!seenVins.has(vinClean)) {
        seenVins.add(vinClean);
        merged.push(v);
      }
    } else {
      const key = `${v.year || ''}_${(v.make || '').toLowerCase()}_${(v.model || '').toLowerCase()}`;
      if (!seenVehicleKeys.has(key)) {
        seenVehicleKeys.add(key);
        merged.push(v);
      }
    }
  });

  return merged;
}

/**
 * Merges two customer profiles into a single consolidated record.
 * Primary customer retains its ID, and fields are merged intelligently.
 */
export function mergeTwoCustomers(
  primary: Customer,
  secondary: Customer,
  targetName?: string
): Customer {
  const now = new Date().toISOString();

  // Combine unique notes
  const notesParts: string[] = [];
  if (primary.notes && primary.notes.trim()) notesParts.push(primary.notes.trim());
  if (secondary.notes && secondary.notes.trim() && !notesParts.includes(secondary.notes.trim())) {
    notesParts.push(secondary.notes.trim());
  }

  // Combined visits
  const totalVisits = (Number(primary.totalVisits) || 0) + (Number(secondary.totalVisits) || 0);

  // Latest visit timestamp
  const dateA = primary.lastVisit ? new Date(primary.lastVisit).getTime() : 0;
  const dateB = secondary.lastVisit ? new Date(secondary.lastVisit).getTime() : 0;
  const lastVisit = dateA >= dateB ? (primary.lastVisit || now) : (secondary.lastVisit || now);

  // Earliest creation date
  const createA = primary.createdAt ? new Date(primary.createdAt).getTime() : Date.now();
  const createB = secondary.createdAt ? new Date(secondary.createdAt).getTime() : Date.now();
  const createdAt = createA <= createB ? (primary.createdAt || now) : (secondary.createdAt || now);

  // If either is Woolwine, standard name is "Woolwine CDJR" and isTaxExempt is true
  const isWoolwine = isWoolwineCustomerName(primary.name) || isWoolwineCustomerName(secondary.name);
  const finalName = targetName?.trim() || (isWoolwine ? 'Woolwine CDJR' : primary.name.trim());

  return {
    ...primary,
    name: finalName,
    phone: primary.phone?.trim() || secondary.phone?.trim() || '',
    email: primary.email?.trim() || secondary.email?.trim() || '',
    address: primary.address?.trim() || secondary.address?.trim() || '',
    isTaxExempt: isWoolwine ? true : Boolean(primary.isTaxExempt || secondary.isTaxExempt),
    taxExemptNumber: primary.taxExemptNumber?.trim() || secondary.taxExemptNumber?.trim() || (isWoolwine ? 'DEALER-RESALE' : ''),
    notes: notesParts.join(' • '),
    vehicles: mergeCustomerVehicles(primary.vehicles, secondary.vehicles),
    totalVisits: Math.max(totalVisits, 1),
    lastVisit,
    createdAt,
    updatedAt: now,
  };
}

export interface ConsolidateWoolwineResult {
  consolidatedCustomers: Customer[];
  primaryCustomer: Customer | null;
  removedCustomerIds: string[];
  wasConsolidated: boolean;
}

/**
 * Scans a customer list and automatically consolidates any "Woolwine CDJR" and "Woolwine CDJR Inc"
 * (or other Woolwine variants) into a single unified customer profile named "Woolwine CDJR".
 */
export function consolidateWoolwineCustomers(customers: Customer[]): ConsolidateWoolwineResult {
  const woolwineMatches = customers.filter(c => isWoolwineCustomerName(c.name));

  // If there are no Woolwine records or only 1 perfectly named "Woolwine CDJR", no consolidation needed
  if (woolwineMatches.length === 0) {
    return {
      consolidatedCustomers: customers,
      primaryCustomer: null,
      removedCustomerIds: [],
      wasConsolidated: false
    };
  }

  // If only 1 record exists, ensure its name is standardized to "Woolwine CDJR" and tax exempt
  if (woolwineMatches.length === 1) {
    const single = woolwineMatches[0];
    const needsStandardizing = single.name.trim() !== 'Woolwine CDJR' || !single.isTaxExempt || !single.taxExemptNumber;
    if (needsStandardizing) {
      const updated: Customer = {
        ...single,
        name: 'Woolwine CDJR',
        isTaxExempt: true,
        taxExemptNumber: single.taxExemptNumber || 'DEALER-RESALE',
        updatedAt: new Date().toISOString()
      };
      return {
        consolidatedCustomers: customers.map(c => c.id === single.id ? updated : c),
        primaryCustomer: updated,
        removedCustomerIds: [],
        wasConsolidated: true
      };
    }
    return {
      consolidatedCustomers: customers,
      primaryCustomer: single,
      removedCustomerIds: [],
      wasConsolidated: false
    };
  }

  // Multiple Woolwine records exist (e.g. "Woolwine CDJR" and "Woolwine CDJR Inc")!
  // Pick the primary record: prioritize one named exactly "Woolwine CDJR", or with the most visits/vehicles
  let primary = woolwineMatches.find(c => c.name.trim().toLowerCase() === 'woolwine cdjr');
  if (!primary) {
    // Pick the one with the most vehicles or visits
    primary = [...woolwineMatches].sort((a, b) => 
      ((b.vehicles?.length || 0) + (b.totalVisits || 0)) - ((a.vehicles?.length || 0) + (a.totalVisits || 0))
    )[0];
  }

  const secondaries = woolwineMatches.filter(c => c.id !== primary!.id);
  const removedIds = secondaries.map(c => c.id);

  // Merge all secondaries into primary
  let combinedPrimary = { ...primary };
  for (const secondary of secondaries) {
    combinedPrimary = mergeTwoCustomers(combinedPrimary, secondary, 'Woolwine CDJR');
  }

  // Build the new list
  const consolidatedCustomers = customers
    .filter(c => !removedIds.includes(c.id))
    .map(c => c.id === combinedPrimary.id ? combinedPrimary : c);

  return {
    consolidatedCustomers,
    primaryCustomer: combinedPrimary,
    removedCustomerIds: removedIds,
    wasConsolidated: true
  };
}

/**
 * Updates any repair orders that have customerName set to "Woolwine CDJR Inc" or variations,
 * ensuring they all point to the unified "Woolwine CDJR" customer.
 */
export function updateROsForWoolwineConsolidation(
  repairOrders: RepairOrder[],
  primaryCustomer: Customer
): { updatedROs: RepairOrder[]; changedCount: number } {
  let changedCount = 0;
  const updatedROs = repairOrders.map(ro => {
    if (isWoolwineCustomerName(ro.customerName) && ro.customerName.trim() !== 'Woolwine CDJR') {
      changedCount++;
      return {
        ...ro,
        customerName: 'Woolwine CDJR',
        customerPhone: primaryCustomer.phone || ro.customerPhone,
        isTaxExempt: true,
        taxExemptNumber: primaryCustomer.taxExemptNumber || ro.taxExemptNumber,
        updatedAt: new Date().toISOString()
      };
    }
    return ro;
  });

  return { updatedROs, changedCount };
}

/**
 * Updates any standalone quotes that have customerName set to "Woolwine CDJR Inc" or variations,
 * ensuring they point to "Woolwine CDJR".
 */
export function updateQuotesForWoolwineConsolidation(
  quotes: StandaloneQuote[]
): { updatedQuotes: StandaloneQuote[]; changedCount: number } {
  let changedCount = 0;
  const updatedQuotes = quotes.map(q => {
    if (isWoolwineCustomerName(q.customerName) && q.customerName.trim() !== 'Woolwine CDJR') {
      changedCount++;
      return {
        ...q,
        customerName: 'Woolwine CDJR',
        updatedAt: new Date().toISOString()
      };
    }
    return q;
  });

  return { updatedQuotes, changedCount };
}
