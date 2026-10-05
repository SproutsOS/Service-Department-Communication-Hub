export interface MenuPackageTemplate {
  id: string;
  category: 'BRAKES' | 'MAINTENANCE' | 'FLUIDS' | 'SUSPENSION' | 'ENGINE' | 'ELECTRICAL';
  name: string;
  description: string;
  laborHours: number;
  parts: Array<{
    partNumber?: string;
    description: string;
    quantity: number;
    cost?: number;
    price: number;
    vendor?: string;
  }>;
}

export const MENU_SERVICE_TEMPLATES: MenuPackageTemplate[] = [
  // --- BRAKES ---
  {
    id: 'front-brakes',
    category: 'BRAKES',
    name: 'Front Ceramic Brake Pads & Rotors Replacement',
    description: 'Replace front brake pads with OEM ceramic pads, replace both front brake rotors, clean and lubricate caliper slide pins, inspect brake lines.',
    laborHours: 2.0,
    parts: [
      { partNumber: '68259468AA', description: 'Front Ceramic Brake Pad Set (OEM)', quantity: 1, cost: 65.00, price: 125.00, vendor: 'MOPAR' },
      { partNumber: '52129202AB', description: 'Front Vented Brake Rotor', quantity: 2, cost: 55.00, price: 110.00, vendor: 'MOPAR' },
      { partNumber: 'CHEM-BRK-CLN', description: 'Brake Parts Cleaner & Synthetic Caliper Grease', quantity: 1, cost: 6.50, price: 14.95, vendor: 'SHOP SUPPLIES' }
    ]
  },
  {
    id: 'rear-brakes',
    category: 'BRAKES',
    name: 'Rear Ceramic Brake Pads & Rotors Replacement',
    description: 'Replace rear brake pads with OEM ceramic pads, replace rear brake rotors, service electronic parking brake calibration, clean and lubricate caliper slide pins.',
    laborHours: 2.0,
    parts: [
      { partNumber: '68259470AA', description: 'Rear Ceramic Brake Pad Set (OEM)', quantity: 1, cost: 58.00, price: 115.00, vendor: 'MOPAR' },
      { partNumber: '52129204AB', description: 'Rear Solid/Vented Brake Rotor', quantity: 2, cost: 48.00, price: 98.00, vendor: 'MOPAR' },
      { partNumber: 'CHEM-BRK-CLN', description: 'Brake Cleaner & Synthetic Grease', quantity: 1, cost: 6.50, price: 14.95, vendor: 'SHOP SUPPLIES' }
    ]
  },
  {
    id: 'brake-fluid-flush',
    category: 'BRAKES',
    name: 'Complete Brake Hydraulic System Fluid Flush',
    description: 'Pressure bleed and flush old moisture-contaminated brake fluid from master cylinder and all four wheel calipers with fresh DOT 4 synthetic brake fluid.',
    laborHours: 1.0,
    parts: [
      { partNumber: 'DOT4-SYN-32', description: 'DOT 4 High-Temp Synthetic Brake Fluid (32 oz)', quantity: 2, cost: 9.50, price: 22.50, vendor: 'MOPAR' }
    ]
  },

  // --- MAINTENANCE ---
  {
    id: 'oil-filter-synthetic',
    category: 'MAINTENANCE',
    name: 'Full Synthetic Oil & Filter Service (Up to 6 Qts)',
    description: 'Drain engine oil, install OEM oil filter and crush washer, fill with full synthetic motor oil, multi-point visual inspection, top off washer fluid and set tire pressures.',
    laborHours: 0.5,
    parts: [
      { partNumber: '68191349AC', description: 'Engine Oil Filter Element (OEM)', quantity: 1, cost: 8.50, price: 18.95, vendor: 'MOPAR' },
      { partNumber: 'SYN-0W20-QT', description: 'Full Synthetic 0W-20 / 5W-20 Motor Oil (1 Qt)', quantity: 6, cost: 4.50, price: 9.95, vendor: 'STELLANTIS' }
    ]
  },
  {
    id: 'air-cabin-filters',
    category: 'MAINTENANCE',
    name: 'Engine Air Filter & Cabin Air Filter Combo Package',
    description: 'Replace engine intake air filter element and high-efficiency particulate cabin interior HVAC filter.',
    laborHours: 0.4,
    parts: [
      { partNumber: '68257030AA', description: 'Engine Intake Air Filter Element', quantity: 1, cost: 16.00, price: 38.00, vendor: 'MOPAR' },
      { partNumber: '68301863AA', description: 'Cabin Micro-Air Charcoal HVAC Filter', quantity: 1, cost: 18.00, price: 42.00, vendor: 'MOPAR' }
    ]
  },
  {
    id: 'four-wheel-alignment',
    category: 'MAINTENANCE',
    name: 'Four-Wheel Computerized Laser Alignment',
    description: 'Measure and adjust front and rear toe, camber, and caster to factory specifications using laser alignment system. Center steering angle sensor.',
    laborHours: 1.2,
    parts: []
  },
  {
    id: 'tire-rotation-balance',
    category: 'MAINTENANCE',
    name: '4-Wheel Tire Rotation & High-Speed Dynamic Balance',
    description: 'Rotate tires front-to-rear/cross, balance all 4 wheels on road-force balancer, inspect tread depth and wear patterns.',
    laborHours: 0.8,
    parts: [
      { partNumber: 'WHL-WT-KIT', description: 'Wheel Balancing Weights & Valve Stems', quantity: 1, cost: 4.00, price: 12.00, vendor: 'SHOP SUPPLIES' }
    ]
  },

  // --- FLUIDS ---
  {
    id: 'trans-fluid-exchange',
    category: 'FLUIDS',
    name: 'Automatic Transmission Fluid Exchange & Filter Service',
    description: 'Drop transmission pan, replace internal transmission sump filter and pan gasket, flush transmission cooler lines, refill with factory spec synthetic ATF.',
    laborHours: 1.8,
    parts: [
      { partNumber: '68218925AA', description: 'Transmission Filter Kit & Pan Gasket', quantity: 1, cost: 42.00, price: 92.00, vendor: 'MOPAR' },
      { partNumber: '68218057AA', description: 'ZF 8/9 Speed Synthetic ATF Fluid (1 Qt)', quantity: 7, cost: 14.00, price: 28.50, vendor: 'MOPAR' }
    ]
  },
  {
    id: 'coolant-flush',
    category: 'FLUIDS',
    name: 'Cooling System Flush & OAT Antifreeze Exchange',
    description: 'Chemically flush radiator and heater core, drain block, vacuum fill and bleed cooling system with 50/50 OAT 10-Year Antifreeze/Coolant.',
    laborHours: 1.2,
    parts: [
      { partNumber: '68163848AB', description: 'OAT Antifreeze/Coolant 50/50 Premix (1 Gal)', quantity: 2, cost: 14.50, price: 29.95, vendor: 'MOPAR' },
      { partNumber: 'CHEM-RAD-CLN', description: 'Cooling System Cleaner & Conditioner', quantity: 1, cost: 7.00, price: 16.50, vendor: 'SHOP SUPPLIES' }
    ]
  },
  {
    id: 'diff-transfer-service',
    category: 'FLUIDS',
    name: 'Front & Rear Differential + 4WD Transfer Case Fluid Service',
    description: 'Drain and refill front and rear differentials with 75W-90 / 75W-140 synthetic gear lube and limited slip friction modifier. Drain and refill transfer case.',
    laborHours: 1.5,
    parts: [
      { partNumber: '68218657AA', description: 'Synthetic 75W-85 / 75W-90 Gear Oil (1 Qt)', quantity: 4, cost: 12.00, price: 26.00, vendor: 'MOPAR' },
      { partNumber: '68089195AA', description: 'Transfer Case Lubricant Fluid (1 Qt)', quantity: 2, cost: 13.50, price: 28.00, vendor: 'MOPAR' }
    ]
  },

  // --- ENGINE & ELECTRICAL ---
  {
    id: 'spark-plugs-v6',
    category: 'ENGINE',
    name: 'Spark Plug Replacement - 3.6L V6 / Pentastar',
    description: 'Remove upper intake plenum, replace all 6 spark plugs with OEM Iridium long-life plugs, install new upper intake manifold plenum gaskets, inspect ignition coils.',
    laborHours: 2.2,
    parts: [
      { partNumber: 'SP148183AC', description: 'OEM Iridium Spark Plug', quantity: 6, cost: 7.20, price: 18.50, vendor: 'MOPAR' },
      { partNumber: '5184562AC', description: 'Upper Intake Manifold Plenum Gasket Set', quantity: 1, cost: 18.00, price: 39.95, vendor: 'MOPAR' }
    ]
  },
  {
    id: 'fuel-induction-service',
    category: 'ENGINE',
    name: 'Direct Injection Fuel Induction & Throttle Body Decarbonization',
    description: 'Two-stage chemical induction cleaning to dissolve carbon deposits from intake valves, combustion chambers, throttle body blade, and fuel injector tips.',
    laborHours: 1.0,
    parts: [
      { partNumber: '68065196AA', description: 'Combustion Chamber Cleaner & Fuel System Treatment Kit', quantity: 1, cost: 18.50, price: 48.00, vendor: 'MOPAR' }
    ]
  },
  {
    id: 'battery-replacement',
    category: 'ELECTRICAL',
    name: 'AGM Heavy-Duty Battery Replacement & Electrical System Test',
    description: 'Test charging system and starter draw. Replace main vehicle battery with Group 48 / Group 94R AGM 800+ CCA battery. Clean and seal terminals, register battery in BCM.',
    laborHours: 0.6,
    parts: [
      { partNumber: 'BBH7A001AA', description: 'Group 94R / H7 800 CCA AGM Heavy Duty Battery (3-Yr Full Warranty)', quantity: 1, cost: 145.00, price: 249.95, vendor: 'MOPAR' },
      { partNumber: 'TERM-PROT-SET', description: 'Anti-Corrosion Terminal Protector Pads & Sealant', quantity: 1, cost: 2.50, price: 8.95, vendor: 'SHOP SUPPLIES' }
    ]
  },
  {
    id: 'serpentine-belt',
    category: 'ENGINE',
    name: 'Serpentine Accessory Drive Belt Replacement',
    description: 'Remove worn drive belt, inspect belt tensioner pulley and idler bearings for play, install new EPDM serpentine drive belt, verify alignment.',
    laborHours: 0.8,
    parts: [
      { partNumber: '68040206AA', description: 'EPDM Multi-Rib Serpentine Accessory Drive Belt', quantity: 1, cost: 28.00, price: 68.00, vendor: 'MOPAR' }
    ]
  }
];
