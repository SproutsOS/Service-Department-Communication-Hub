/**
 * NHTSA Vehicle Information API & Offline VIN Decoder
 * Decodes 17-character VINs into Year, Make, Model & Trim automatically.
 */

export interface VinDecodeResult {
  success: boolean;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyClass?: string;
  vehicleType?: string;
  error?: string;
  source?: 'nhtsa' | 'offline';
}

// In-memory cache to prevent redundant network requests
const vinCache = new Map<string, VinDecodeResult>();

// Format proper case (e.g., "FORD" -> "Ford", "RAM" -> "RAM", "BMW" -> "BMW")
function formatMake(rawMake: string): string {
  const trimmed = rawMake.trim();
  const upper = trimmed.toUpperCase();
  
  // Acronym makes that should remain uppercase
  const acronyms = ['RAM', 'GMC', 'BMW', 'VW', 'AMG'];
  if (acronyms.includes(upper)) {
    return upper;
  }
  
  // Title Case with special cases
  if (upper === 'MERCEDES-BENZ' || upper === 'MERCEDES') return 'Mercedes-Benz';
  if (upper === 'CHEVROLET') return 'Chevrolet';
  if (upper === 'LAND ROVER') return 'Land Rover';
  if (upper === 'ALFA ROMEO') return 'Alfa Romeo';

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function formatModel(rawModel: string, trim?: string): string {
  let model = rawModel.trim();
  // Capitalize words
  model = model
    .split(' ')
    .map(w => {
      if (['ST', 'GT', 'RS', 'TRX', 'SV', 'SL', 'SR5', 'LT', 'LTZ', 'LE', 'XLE', 'SE', 'EX', 'LX', 'GLI', 'GTI', 'RT', 'R/T', 'SRT', 'EV', 'AWD', '4WD', 'F-150', 'F-250', 'F-350'].includes(w.toUpperCase())) {
        return w.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');

  if (trim && trim.trim()) {
    const cleanTrim = trim.trim();
    if (!model.toLowerCase().includes(cleanTrim.toLowerCase())) {
      model = `${model} ${cleanTrim}`;
    }
  }

  return model;
}

// Model Year by 10th Character (SAE standard for modern vehicles 1980-2030)
const VIN_YEAR_MAP: Record<string, number> = {
  'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
  'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
  'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
  'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029, 'Y': 2030,
  '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
  '6': 2006, '7': 2007, '8': 2008, '9': 2009,
};

// Common WMI (World Manufacturer Identifier - first 3 characters)
const WMI_MAP: Record<string, string> = {
  '1FM': 'Ford', '1FT': 'Ford', '1FA': 'Ford', '1FB': 'Ford', '1FC': 'Ford', '1FD': 'Ford',
  '2FM': 'Ford', '2FT': 'Ford', '2FA': 'Ford', '3FA': 'Ford',
  '1GC': 'Chevrolet', '1GT': 'GMC', '1G1': 'Chevrolet', '1G2': 'Chevrolet', '2G1': 'Chevrolet', '3GC': 'Chevrolet',
  '1C6': 'RAM', '2C6': 'RAM', '3C6': 'RAM',
  '1C4': 'Jeep', '2C4': 'Jeep', '3C4': 'Jeep',
  '1C3': 'Chrysler', '2C3': 'Chrysler',
  '1D3': 'Dodge', '2D3': 'Dodge', '1B3': 'Dodge',
  '4T1': 'Toyota', '4T3': 'Toyota', '4T4': 'Toyota', '5TD': 'Toyota', 'JT2': 'Toyota', 'JT3': 'Toyota', 'JTE': 'Toyota',
  '1HG': 'Honda', '2HG': 'Honda', '1HK': 'Honda', '5J6': 'Honda', 'JHM': 'Honda',
  '1N4': 'Nissan', '1N6': 'Nissan', '3N1': 'Nissan', 'JN1': 'Nissan', 'JN8': 'Nissan',
  'WBA': 'BMW', 'WBS': 'BMW', '5UX': 'BMW',
  'WDB': 'Mercedes-Benz', 'WDC': 'Mercedes-Benz', 'WDD': 'Mercedes-Benz', '4JG': 'Mercedes-Benz',
  'WVW': 'Volkswagen', '1VW': 'Volkswagen', '3VW': 'Volkswagen',
  'WA1': 'Audi', 'WAU': 'Audi',
  'KM8': 'Hyundai', 'KMH': 'Hyundai', '5NP': 'Hyundai',
  'KNA': 'Kia', 'KND': 'Kia', '5XX': 'Kia', '5XY': 'Kia',
  'JF1': 'Subaru', 'JF2': 'Subaru', '4S3': 'Subaru', '4S4': 'Subaru',
  'JM1': 'Mazda', 'JM3': 'Mazda',
  '2T1': 'Lexus', '2T2': 'Lexus', 'JTJ': 'Lexus',
  '5YJ': 'Tesla', '7SA': 'Tesla',
};

/**
 * Offline decoding fallback using standard ISO/SAE 10th-character year and WMI.
 */
export function decodeVinOffline(vin: string): VinDecodeResult | null {
  const clean = vin.trim().toUpperCase();
  if (clean.length < 10) return null;

  const tenthChar = clean.charAt(9);
  const year = VIN_YEAR_MAP[tenthChar];

  const wmi = clean.substring(0, 3);
  const make = WMI_MAP[wmi] || WMI_MAP[clean.substring(0, 2)];

  if (year || make) {
    return {
      success: true,
      year: year,
      make: make,
      source: 'offline',
    };
  }

  return null;
}

/**
 * Full VIN decoder with official NHTSA vPIC lookup and offline fallback.
 */
export async function decodeVin(vin: string, signal?: AbortSignal): Promise<VinDecodeResult> {
  const clean = vin.trim().toUpperCase();

  // VINs must be at least 11 characters to give meaningful info, standard is 17
  if (!clean || clean.length < 10) {
    return {
      success: false,
      error: 'VIN must be at least 10-17 characters long',
    };
  }

  // Check cache first
  if (vinCache.has(clean)) {
    return vinCache.get(clean)!;
  }

  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(clean)}?format=json`,
      { signal }
    );

    if (!response.ok) {
      throw new Error(`NHTSA API returned status ${response.status}`);
    }

    const data = await response.json();
    const result = data?.Results?.[0];

    if (result) {
      const rawYear = result.ModelYear?.trim();
      const rawMake = result.Make?.trim();
      const rawModel = result.Model?.trim();
      const rawTrim = result.Trim?.trim();
      const bodyClass = result.BodyClass?.trim();
      const vehicleType = result.VehicleType?.trim();

      const year = rawYear && !isNaN(Number(rawYear)) ? Number(rawYear) : undefined;
      const make = rawMake ? formatMake(rawMake) : undefined;
      const model = rawModel ? formatModel(rawModel, rawTrim) : undefined;

      if (year || make || model) {
        const decodeOutput: VinDecodeResult = {
          success: true,
          year,
          make,
          model,
          trim: rawTrim || undefined,
          bodyClass,
          vehicleType,
          source: 'nhtsa',
        };
        vinCache.set(clean, decodeOutput);
        return decodeOutput;
      }
    }

    // If NHTSA returned nothing useful, fall back to offline parser
    const offline = decodeVinOffline(clean);
    if (offline && (offline.year || offline.make)) {
      vinCache.set(clean, offline);
      return offline;
    }

    return {
      success: false,
      error: 'Could not resolve Year, Make, or Model for this VIN',
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Cancelled' };
    }

    // Network error or offline - fallback to offline parser
    const offline = decodeVinOffline(clean);
    if (offline) {
      return offline;
    }

    return {
      success: false,
      error: 'Unable to connect to NHTSA database',
    };
  }
}
