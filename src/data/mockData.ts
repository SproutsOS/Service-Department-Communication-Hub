import { User, RepairOrder, Customer, SpecialPartNumber, ImportantNumberEntry, ManagerPasswordEntry, RecallWaitingEntry, InternalExtensionEntry } from '../types';

export const STANDARD_JOB_TITLES: string[] = [
  'Oil Bay',
  'Oil Bay Tech',
  'PDI Tech',
  'UCI Tech',
  'Master Diagnostic Technician',
  'ASE Master Tech',
  'A-Level Technician',
  'B-Level Technician',
  'C-Level Technician',
  'Lube / Express Tech',
  'Service Advisor',
  'Senior Service Advisor',
  'Parts Specialist',
  'Parts Manager',
  'Service Manager',
  'Shop Foreman',
  'Quality Control Inspector',
  'Warranty Administrator'
];

export const STANDARD_CERTIFICATION_LEVELS: string[] = [
  'Oil Bay',
  'PDI Tech',
  'UCI Tech',
  'Master Tech',
  'ASE Master Tech',
  'A-Level Tech',
  'B-Level Tech',
  'C-Level Tech',
  'L1 Advanced Diagnostics',
  'EV / Hybrid Certified',
  'Diesel Master Specialist',
  'Factory Certified Master',
  'Express Lube'
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_mgr_1',
    name: 'Service Manager',
    employeeNumber: '100',
    email: 'admin@precisionauto.com',
    pin: '1234',
    role: 'SERVICE_MANAGER',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Service Manager',
    phone: '(662) 287-3181',
  },
  {
    id: 'usr_adv_1',
    name: 'Cody Miller',
    employeeNumber: '101',
    email: 'cmiller@woolwinecdjr.com',
    pin: '1010',
    role: 'SERVICE_ADVISOR',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    title: 'Senior Service Advisor',
    phone: '(662) 287-3182',
  },
  {
    id: 'usr_adv_2',
    name: 'Sarah Jenkins',
    employeeNumber: '102',
    email: 'sjenkins@woolwinecdjr.com',
    pin: '1020',
    role: 'SERVICE_ADVISOR',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    title: 'Service Advisor',
    phone: '(662) 287-3183',
  },
  {
    id: 'usr_tech_1',
    name: 'Marcus Vance',
    employeeNumber: '103',
    email: 'mvance@woolwinecdjr.com',
    pin: '1030',
    role: 'TECHNICIAN',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    title: 'Master Diagnostic Technician',
    certificationLevel: 'Master Tech',
    bayNumber: 'Bay 2',
    phone: '(662) 287-3184',
  },
  {
    id: 'usr_tech_2',
    name: 'Jake Reynolds',
    employeeNumber: '104',
    email: 'jreynolds@woolwinecdjr.com',
    pin: '1040',
    role: 'TECHNICIAN',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    title: 'A-Level Technician',
    certificationLevel: 'A-Level Tech',
    bayNumber: 'Bay 4',
    phone: '(662) 287-3185',
  },
  {
    id: 'usr_parts_1',
    name: 'Bill Turner',
    employeeNumber: '105',
    email: 'bturner@woolwinecdjr.com',
    pin: '1050',
    role: 'PARTS_SPECIALIST',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    title: 'Parts Specialist',
    phone: '(662) 287-3186',
  },
];

export const INITIAL_REPAIR_ORDERS: RepairOrder[] = [
  {
    id: 'RO-37460',
    customerName: 'Woolwine Autoplex',
    customerPhone: '(662) 287-3181',
    vehicle: {
      year: 2024,
      make: 'Ram',
      model: '1500 Big Horn',
      vin: '1C6SRFHT8RN184920',
      mileage: 14250,
      licensePlate: 'DLR-401',
      color: 'Bright White',
      engine: '5.7L V8 HEMI',
    },
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
    advisorId: 'usr_mgr_1',
    advisorName: 'Service Manager',
    techId: 'usr_tech_1',
    techName: 'Marcus Vance',
    dispatchedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    bay: 'Bay 2',
    status: 'IN_DIAG',
    waitingDiagnosisAt: new Date(Date.now() - 3600000 * 3.8).toISOString(),
    diagnosisStartedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    isUrgent: false,
    isWaiter: true,
    promisedTime: new Date(Date.now() + 3600000 * 5).toISOString(),
    primaryConcern: 'Customer states check engine light is illuminated and engine stumbles at idle; squeak noise from front brakes',
    concerns: [
      'Customer states check engine light is illuminated and engine stumbles at idle.',
      'Customer states squeak noise from front brakes when coming to a gradual stop.',
      'Customer requests comprehensive 21-point vehicle inspection and tire rotation.',
    ],
    concernPayTypes: ['CUSTOMER_PAY', 'CUSTOMER_PAY', 'CUSTOMER_PAY'],
    concernTechIds: ['usr_tech_1', 'usr_tech_1', 'usr_tech_1'],
    concernTechNames: ['Marcus Vance', 'Marcus Vance', 'Marcus Vance'],
    concernCauses: [
      'Faulty cylinder 3 ignition coil and fouled spark plug caused by carbon buildup.',
      'Front brake pads worn down to 2mm with surface scoring on front rotors.',
      'Routine scheduled maintenance interval reached.',
    ],
    concernCorrections: [
      'Replaced cylinder 3 ignition coil and all 8 spark plugs. Performed fuel injection system flush and cleared DTC codes.',
      'Replaced front ceramic brake pad set and resurfaced both front rotors. Cleaned and lubricated caliper slide pins.',
      'Performed complete 21-point vehicle safety inspection, rotated tires, and adjusted tire pressures to 38 PSI.',
    ],
    concernStatuses: ['APPROVED', 'APPROVED', 'APPROVED'],
    concernSources: ['CUSTOMER', 'CUSTOMER', 'CUSTOMER'],
    parts: [
      {
        id: 'part_37460_1',
        roId: 'RO-37460',
        partNumber: 'SP-149212',
        description: 'OEM Spark Plug Kit (Set of 8)',
        quantity: 8,
        status: 'IN_STOCK',
        requestType: 'ORDER_NOW',
        vendor: 'Mopar',
        price: 14.50,
        cost: 8.50,
        estimatedArrival: 'In Stock',
        roLineNumber: 1,
        sentToEstimate: true,
      },
      {
        id: 'part_37460_2',
        roId: 'RO-37460',
        partNumber: 'IC-68214',
        description: 'Ignition Coil Pack Cylinder 3',
        quantity: 1,
        status: 'SPECIAL_ORDER_1_5_DAYS',
        requestType: 'ORDER_NOW',
        vendor: 'Mopar',
        price: 89.00,
        cost: 52.00,
        estimatedArrival: 'Special Order 1-5 Days',
        roLineNumber: 1,
        sentToEstimate: true,
      },
      {
        id: 'part_37460_3',
        roId: 'RO-37460',
        partNumber: 'BP-88401',
        description: 'Ceramic Front Brake Pad Set',
        quantity: 1,
        status: 'DAILY_ORDER',
        requestType: 'ORDER_NOW',
        vendor: 'Mopar',
        price: 125.00,
        cost: 74.00,
        estimatedArrival: 'Daily Order (Arriving ~5:00 PM)',
        roLineNumber: 2,
        sentToEstimate: true,
      },
    ],
    messages: [],
    history: [
      {
        id: 'hist_37460_1',
        status: 'WAITING_DIAGNOSTICS',
        updatedBy: 'usr_mgr_1',
        updatedByName: 'Service Manager',
        userRole: 'SERVICE_MANAGER',
        timestamp: new Date(Date.now() - 3600000 * 3.8).toISOString(),
        notes: 'RO Created & checked in for Woolwine Autoplex',
      },
      {
        id: 'hist_37460_2',
        status: 'IN_DIAG',
        updatedBy: 'usr_tech_1',
        updatedByName: 'Marcus Vance',
        userRole: 'TECHNICIAN',
        timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
        notes: 'Vehicle dispatched to Bay 2, diagnostics in progress',
      },
    ],
    quote: {
      id: 'quote_37460',
      roId: 'RO-37460',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
      initiatedByTechId: 'usr_tech_1',
      initiatedByTechName: 'Marcus Vance',
      status: 'APPROVED',
      defaultLaborRate: 150,
      laborItems: [
        {
          id: 'labor_37460_1',
          description: 'Diagnose rough idle, replace ignition coil & spark plugs',
          laborHours: 1.8,
          hourlyRate: 150,
          subtotal: 270,
          payType: 'CUSTOMER_PAY',
          roLineNumber: 1,
          concernText: 'Customer states check engine light is illuminated and engine stumbles at idle.',
          correctionText: 'Replaced cylinder 3 ignition coil and all 8 spark plugs.',
          status: 'APPROVED',
        },
        {
          id: 'labor_37460_2',
          description: 'Front brake pad replacement and rotor resurface',
          laborHours: 1.5,
          hourlyRate: 150,
          subtotal: 225,
          payType: 'CUSTOMER_PAY',
          roLineNumber: 2,
          concernText: 'Customer states squeak noise from front brakes when coming to a gradual stop.',
          correctionText: 'Replaced front ceramic brake pad set and resurfaced both front rotors.',
          status: 'APPROVED',
        },
        {
          id: 'labor_37460_3',
          description: '21-Point vehicle safety inspection and tire rotation',
          laborHours: 0.5,
          hourlyRate: 150,
          subtotal: 75,
          payType: 'CUSTOMER_PAY',
          roLineNumber: 3,
          concernText: 'Customer requests comprehensive 21-point vehicle inspection and tire rotation.',
          correctionText: 'Performed complete 21-point vehicle safety inspection, rotated tires.',
          status: 'APPROVED',
        },
      ],
      partsItems: [
        {
          id: 'qpart_37460_1',
          sourcePartId: 'part_37460_1',
          description: 'OEM Spark Plug Kit (Set of 8)',
          partNumber: 'SP-149212',
          quantity: 8,
          unitPrice: 14.50,
          subtotal: 116.00,
          roLineNumber: 1,
          status: 'APPROVED',
        },
        {
          id: 'qpart_37460_2',
          sourcePartId: 'part_37460_2',
          description: 'Ignition Coil Pack Cylinder 3',
          partNumber: 'IC-68214',
          quantity: 1,
          unitPrice: 89.00,
          subtotal: 89.00,
          roLineNumber: 1,
          status: 'APPROVED',
        },
        {
          id: 'qpart_37460_3',
          sourcePartId: 'part_37460_3',
          description: 'Ceramic Front Brake Pad Set',
          partNumber: 'BP-88401',
          quantity: 1,
          unitPrice: 125.00,
          subtotal: 125.00,
          roLineNumber: 2,
          status: 'APPROVED',
        },
      ],
      shopSuppliesFee: 35.00,
      applyShopSupplies: true,
      totalLaborHours: 3.8,
      totalLaborCost: 570.00,
      totalPartsCost: 330.00,
      taxRate: 0.07,
      taxAmount: 65.45,
      grandTotal: 1000.45,
      approvedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      approvedBy: 'Service Manager',
    },
  },
  {
    id: 'RO-10482',
    customerName: 'Michael Henderson',
    customerPhone: '(555) 234-8910',
    vehicle: {
      year: 2021,
      make: 'Jeep',
      model: 'Wrangler 3.0L EcoDiesel',
      vin: '1C4HJXDG8MW681240',
      mileage: 48200,
      licensePlate: 'MS-7821',
      color: 'Firecracker Red',
      engine: '3.0L V6 EcoDiesel',
    },
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date().toISOString(),
    advisorId: 'usr_adv_1',
    advisorName: 'Cody Miller',
    techId: 'usr_tech_2',
    techName: 'Jake Reynolds',
    bay: 'Bay 4',
    status: 'PARTS_ORDERED',
    isUrgent: true,
    isWaiter: false,
    primaryConcern: 'Safety Recall 66A: High-Pressure Fuel Pump Inspection & Replacement',
    concerns: [
      'Safety Recall 66A: High-pressure fuel pump kit replacement and fuel system flush.',
      'Customer states slight vibration at highway speeds (65-70 MPH).',
    ],
    concernPayTypes: ['WARRANTY', 'CUSTOMER_PAY'],
    concernTechIds: ['usr_tech_2', 'usr_tech_2'],
    concernTechNames: ['Jake Reynolds', 'Jake Reynolds'],
    concernCauses: [
      'NHTSA Recall 66A high pressure fuel pump internal wear bulletin.',
      'Rear driveshaft U-joint slight play detected during multi-point inspection.',
    ],
    concernCorrections: [
      'Replaced high pressure fuel pump assembly, high pressure lines, and fuel filter kit.',
      'Replaced rear driveshaft universal joints and balanced driveshaft assembly.',
    ],
    concernStatuses: ['APPROVED', 'PENDING'],
    concernSources: ['CUSTOMER', 'INSPECTION'],
    parts: [
      {
        id: 'part_10482_1',
        roId: 'RO-10482',
        partNumber: '68542994AA',
        description: 'HPFP Kit Recall 66A',
        quantity: 1,
        status: 'ORDERED',
        requestType: 'ORDER_NOW',
        vendor: 'Mopar Direct',
        price: 840.00,
        cost: 620.00,
        estimatedArrival: 'Special Order 1-5 Days',
        roLineNumber: 1,
        sentToEstimate: true,
      },
    ],
    messages: [],
    history: [
      {
        id: 'hist_10482_1',
        status: 'WAITING_DIAGNOSTICS',
        updatedBy: 'usr_adv_1',
        updatedByName: 'Cody Miller',
        userRole: 'SERVICE_ADVISOR',
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
      },
      {
        id: 'hist_10482_2',
        status: 'PARTS_ORDERED',
        updatedBy: 'usr_parts_1',
        updatedByName: 'Bill Turner',
        userRole: 'PARTS_SPECIALIST',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        notes: 'Recall pump kit ordered through Mopar PDC',
      },
    ],
  },
  {
    id: 'RO-10483',
    customerName: 'Brenda Collins',
    customerPhone: '(555) 412-7801',
    vehicle: {
      year: 2022,
      make: 'Ram',
      model: '2500 Cummins 6.7L',
      vin: '3C6UR5FL8NG219455',
      mileage: 55400,
      licensePlate: 'MS-4419',
      color: 'Delmonico Red',
      engine: '6.7L I6 Cummins Turbo Diesel',
    },
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    updatedAt: new Date().toISOString(),
    advisorId: 'usr_adv_2',
    advisorName: 'Sarah Jenkins',
    techId: 'usr_tech_1',
    techName: 'Marcus Vance',
    bay: 'Bay 2',
    status: 'WAITING_FOR_APPROVAL',
    isUrgent: false,
    isWaiter: false,
    primaryConcern: 'Recall 04A Cummins Intake Heater Relay Inspection',
    concerns: [
      'Safety Recall 04A Cummins solid state intake air heater relay inspection & replacement.',
    ],
    concernPayTypes: ['WARRANTY'],
    concernTechIds: ['usr_tech_1'],
    concernTechNames: ['Marcus Vance'],
    concernCauses: [
      'Intake heater relay solid state short-circuit bulletin per FCA 04A.',
    ],
    concernCorrections: [
      'Inspected relay part serial number; replacement unit staged.',
    ],
    concernStatuses: ['PENDING'],
    concernSources: ['CUSTOMER'],
    parts: [
      {
        id: 'part_10483_1',
        roId: 'RO-10483',
        partNumber: '68444169AA',
        description: 'Intake Air Heater Relay Kit',
        quantity: 1,
        status: 'IN_STOCK',
        requestType: 'ORDER_NOW',
        vendor: 'Mopar',
        price: 185.00,
        cost: 110.00,
        estimatedArrival: 'In Stock',
        roLineNumber: 1,
        sentToEstimate: true,
      },
    ],
    messages: [],
    history: [
      {
        id: 'hist_10483_1',
        status: 'WAITING_FOR_APPROVAL',
        updatedBy: 'usr_adv_2',
        updatedByName: 'Sarah Jenkins',
        userRole: 'SERVICE_ADVISOR',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ],
  },
  {
    id: 'RO-10484',
    customerName: 'Daniel Clark',
    customerPhone: '(555) 456-7890',
    vehicle: {
      year: 2022,
      make: 'Jeep',
      model: 'Wrangler EcoDiesel',
      vin: '1C4HJXDG4NW110823',
      mileage: 31200,
      licensePlate: 'MS-9901',
      color: 'Sarge Green',
      engine: '3.0L V6 EcoDiesel',
    },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    advisorId: 'usr_adv_1',
    advisorName: 'Cody Miller',
    status: 'WAITING_DIAGNOSTICS',
    isUrgent: false,
    isWaiter: true,
    primaryConcern: 'Customer states intermittent check engine light and extended crank when cold',
    concerns: [
      'Customer states intermittent check engine light and extended crank when cold.',
    ],
    concernPayTypes: ['CUSTOMER_PAY'],
    parts: [],
    messages: [],
    history: [
      {
        id: 'hist_10484_1',
        status: 'WAITING_DIAGNOSTICS',
        updatedBy: 'usr_adv_1',
        updatedByName: 'Cody Miller',
        userRole: 'SERVICE_ADVISOR',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ],
  },
  {
    id: 'RO-10485',
    customerName: 'Thomas Vance',
    customerPhone: '(555) 345-6712',
    vehicle: {
      year: 2021,
      make: 'Jeep',
      model: 'Gladiator 3.0L EcoDiesel',
      vin: '1C4JJXR62MW719034',
      mileage: 39500,
      licensePlate: 'MS-1284',
      color: 'Sting-Gray',
      engine: '3.0L V6 EcoDiesel',
    },
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
    advisorId: 'usr_adv_2',
    advisorName: 'Sarah Jenkins',
    techId: 'usr_tech_2',
    techName: 'Jake Reynolds',
    bay: 'Bay 4',
    status: 'REPAIR_COMPLETE',
    isUrgent: false,
    isWaiter: false,
    primaryConcern: 'Scheduled 40,000 mile maintenance, front/rear differential service, multi-point inspection',
    concerns: [
      'Scheduled 40,000 mile maintenance, front/rear differential service, multi-point inspection.',
    ],
    concernPayTypes: ['CUSTOMER_PAY'],
    concernTechIds: ['usr_tech_2'],
    concernTechNames: ['Jake Reynolds'],
    concernCauses: [
      'Routine scheduled maintenance interval reached.',
    ],
    concernCorrections: [
      'Drained and filled front and rear differentials with synthetic gear lubricant. Performed 21-point inspection.',
    ],
    concernStatuses: ['APPROVED'],
    concernSources: ['CUSTOMER'],
    parts: [
      {
        id: 'part_10485_1',
        roId: 'RO-10485',
        partNumber: 'GL-75W90',
        description: 'Mopar Synthetic Gear Lubricant 75W-90 (Quarts)',
        quantity: 4,
        status: 'RECEIVED',
        requestType: 'ORDER_NOW',
        vendor: 'Mopar',
        price: 24.50,
        cost: 14.00,
        estimatedArrival: 'In Stock',
        roLineNumber: 1,
        sentToEstimate: true,
      },
    ],
    messages: [],
    history: [
      {
        id: 'hist_10485_1',
        status: 'REPAIR_COMPLETE',
        updatedBy: 'usr_tech_2',
        updatedByName: 'Jake Reynolds',
        userRole: 'TECHNICIAN',
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        notes: 'Repair completed, quality check passed',
      },
    ],
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_woolwine_house_account',
    name: 'Woolwine CDJR',
    phone: '(662) 287-3181',
    email: 'service@woolwinecdjr.com',
    address: '3980 Highway 72 E, Corinth, MS 38834',
    isTaxExempt: true,
    taxExemptNumber: 'DEALER-RESALE',
    notes: 'Woolwine CDJR Dealership House Account • Unified Dealership Inventory & Used Vehicle Reconditioning (Internal accounts consolidated into single profile)',
    vehicles: [
      {
        year: 2024,
        make: 'Ram',
        model: '1500 Big Horn',
        vin: '1C6SRFHT8RN184920',
        mileage: 120,
        licensePlate: 'DLR-401'
      },
      {
        year: 2023,
        make: 'Jeep',
        model: 'Grand Cherokee L',
        vin: '1C4RJKBG5P8629104',
        mileage: 8450,
        licensePlate: 'DLR-402'
      }
    ],
    lastVisit: '2026-10-18T14:30:00Z',
    totalVisits: 14,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-10-18T14:30:00Z'
  },
  {
    id: 'cust_rec_1',
    name: 'Michael Henderson',
    phone: '(555) 234-8910',
    email: 'mhenderson@example.com',
    address: 'Corinth, MS',
    isTaxExempt: false,
    notes: 'Recall 66A high-pressure fuel pump kit',
    vehicles: [
      {
        year: 2021,
        make: 'Jeep',
        model: 'Wrangler 3.0L EcoDiesel',
        vin: '1C4HJXDG8MW681240',
        mileage: 48200
      }
    ],
    lastVisit: '2026-09-02T14:15:00Z',
    totalVisits: 2,
    createdAt: '2026-08-15T10:30:00Z',
    updatedAt: '2026-09-02T14:15:00Z'
  },
  {
    id: 'cust_rec_6',
    name: 'Thomas Vance',
    phone: '(555) 345-6712',
    email: 'tvance@example.com',
    address: 'Booneville, MS',
    isTaxExempt: false,
    notes: 'Recall 66A fuel pump kit',
    vehicles: [
      {
        year: 2021,
        make: 'Jeep',
        model: 'Gladiator 3.0L EcoDiesel',
        vin: '1C4JJXR62MW719034',
        mileage: 39500
      }
    ],
    lastVisit: '2026-08-28T14:00:00Z',
    totalVisits: 1,
    createdAt: '2026-08-28T14:00:00Z',
    updatedAt: '2026-08-28T14:00:00Z'
  },
  {
    id: 'cust_rec_7',
    name: 'Daniel Clark',
    phone: '(555) 456-7890',
    email: 'dclark@example.com',
    address: 'Iuka, MS',
    isTaxExempt: false,
    notes: 'Recall 66A high-pressure fuel pump',
    vehicles: [
      {
        year: 2022,
        make: 'Jeep',
        model: 'Wrangler EcoDiesel',
        vin: '1C4HJXDG4NW110823',
        mileage: 31200
      }
    ],
    lastVisit: '2026-10-12T09:30:00Z',
    totalVisits: 3,
    createdAt: '2026-09-18T11:20:00Z',
    updatedAt: '2026-10-12T09:30:00Z'
  },
  {
    id: 'cust_rec_2',
    name: 'Brenda Collins',
    phone: '(555) 412-7801',
    email: 'bcollins@example.com',
    address: 'Ripley, MS',
    isTaxExempt: false,
    notes: 'Recall 04A Cummins intake heater relay',
    vehicles: [
      {
        year: 2022,
        make: 'Ram',
        model: '2500 Cummins 6.7L',
        vin: '3C6UR5FL8NG219455',
        mileage: 55400
      }
    ],
    lastVisit: '2026-09-05T09:15:00Z',
    totalVisits: 2,
    createdAt: '2026-09-05T09:15:00Z',
    updatedAt: '2026-09-05T09:15:00Z'
  }
];

export interface FlowStepConfig {
  key: string;
  label: string;
  shortLabel: string;
  stepNumber: number;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  icon: string;
  description: string;
}

export const TICKET_FLOW_STEPS: FlowStepConfig[] = [
  {
    key: 'WAITING_DIAGNOSTICS',
    label: 'Waiting Diagnostics',
    shortLabel: 'Waiting Diag',
    stepNumber: 1,
    badgeClass: 'bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-amber-300',
    borderClass: 'border-amber-400',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-800',
    icon: 'Clock',
    description: 'Vehicle queued in staging, awaiting technician diagnostics',
  },
  {
    key: 'IN_DIAG',
    label: 'In Diag',
    shortLabel: 'In Diag',
    stepNumber: 2,
    badgeClass: 'bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-blue-300',
    borderClass: 'border-blue-400',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-800',
    icon: 'Wrench',
    description: 'Technician actively scanning, diagnosing, and inspecting',
  },
  {
    key: 'DIAG_PAUSED',
    label: 'Diag Paused',
    shortLabel: 'Diag Paused',
    stepNumber: 2,
    badgeClass: 'bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-yellow-300',
    borderClass: 'border-yellow-400',
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-800',
    icon: 'PauseCircle',
    description: 'Diagnosis paused pending customer info, parts, or tech break',
  },
  {
    key: 'ESTIMATE_DONE',
    label: 'Estimate Done',
    shortLabel: 'Estimate Done',
    stepNumber: 3,
    badgeClass: 'bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-indigo-300',
    borderClass: 'border-indigo-400',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-800',
    icon: 'Calculator',
    description: 'Diagnosis completed, parts and labor estimate calculated',
  },
  {
    key: 'WAITING_FOR_APPROVAL',
    label: 'Waiting for Approval',
    shortLabel: 'Waiting Approval',
    stepNumber: 4,
    badgeClass: 'bg-red-600 text-white text-[10px] font-black rounded-full uppercase px-2.5 py-0.5 border border-red-700 animate-pulse shadow-xs',
    borderClass: 'border-red-500',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700 font-bold',
    icon: 'AlertTriangle',
    description: 'Estimate submitted to customer, awaiting authorization',
  },
  {
    key: 'APPROVED',
    label: 'Approved',
    shortLabel: 'Approved',
    stepNumber: 5,
    badgeClass: 'bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-emerald-300',
    borderClass: 'border-emerald-400',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    icon: 'CheckCircle2',
    description: 'Customer approved estimate, cleared to proceed',
  },
  {
    key: 'DENIED',
    label: 'Denied',
    shortLabel: 'Denied',
    stepNumber: 5,
    badgeClass: 'bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-rose-300',
    borderClass: 'border-rose-400',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-800',
    icon: 'XCircle',
    description: 'Customer declined or held repairs',
  },
  {
    key: 'PARTS_ORDERED',
    label: 'Parts Ordered (ETA)',
    shortLabel: 'Parts Ordered (ETA)',
    stepNumber: 6,
    badgeClass: 'bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-purple-300',
    borderClass: 'border-purple-400',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-800',
    icon: 'Package',
    description: 'Parts ordered and tracking live ETA arrival',
  },
  {
    key: 'PARTS_IN_TO_TECH',
    label: 'Parts In / To Tech',
    shortLabel: 'Parts In / To Tech',
    stepNumber: 7,
    badgeClass: 'bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-teal-300',
    borderClass: 'border-teal-400',
    bgClass: 'bg-teal-50',
    textClass: 'text-teal-800',
    icon: 'Truck',
    description: 'Parts arrived at shop and handed off to technician',
  },
  {
    key: 'REPAIR_IN_PROGRESS',
    label: 'Repair in Progress',
    shortLabel: 'In Progress',
    stepNumber: 8,
    badgeClass: 'bg-cyan-100 text-cyan-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-cyan-300',
    borderClass: 'border-cyan-400',
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-800',
    icon: 'Play',
    description: 'Technician actively performing repairs and assembly',
  },
  {
    key: 'REPAIR_COMPLETE',
    label: 'Repair Complete',
    shortLabel: 'Repair Complete',
    stepNumber: 9,
    badgeClass: 'bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-green-300',
    borderClass: 'border-green-400',
    bgClass: 'bg-green-50',
    textClass: 'text-green-800',
    icon: 'CheckCircle',
    description: 'Repair work finished, test drive & inspection complete',
  },
  {
    key: 'READY_FOR_PICKUP',
    label: 'Ready for Pickup',
    shortLabel: 'Ready for Pickup',
    stepNumber: 10,
    badgeClass: 'bg-sky-100 text-sky-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-sky-300',
    borderClass: 'border-sky-400',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-800',
    icon: 'Car',
    description: 'Vehicle staged in front lot, customer notified for pickup',
  },
  {
    key: 'CLOSED',
    label: 'Closed',
    shortLabel: 'Closed',
    stepNumber: 11,
    badgeClass: 'bg-slate-200 text-slate-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-slate-300',
    borderClass: 'border-slate-400',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-800',
    icon: 'CheckCheck',
    description: 'Invoice settled, keys released, repair order archived',
  },
];

export const STATUS_CONFIG: Record<
  string, 
  { label: string; badgeClass: string; borderClass: string; icon: string; description: string }
> = {
  // Primary User Requested Workflow
  WAITING_DIAGNOSTICS: {
    label: 'Waiting Diagnostics',
    badgeClass: 'bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-amber-300',
    borderClass: 'border-amber-400',
    icon: 'Clock',
    description: 'Vehicle queued in staging, awaiting technician diagnostics',
  },
  IN_DIAG: {
    label: 'In Diag',
    badgeClass: 'bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-blue-300',
    borderClass: 'border-blue-400',
    icon: 'Wrench',
    description: 'Technician actively scanning, diagnosing, and inspecting',
  },
  DIAG_PAUSED: {
    label: 'Diag Paused',
    badgeClass: 'bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-yellow-300',
    borderClass: 'border-yellow-400',
    icon: 'PauseCircle',
    description: 'Diagnosis paused pending customer info, parts, or tech break',
  },
  ESTIMATE_DONE: {
    label: 'Estimate Done',
    badgeClass: 'bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-indigo-300',
    borderClass: 'border-indigo-400',
    icon: 'Calculator',
    description: 'Diagnosis completed, parts and labor estimate calculated',
  },
  WAITING_FOR_APPROVAL: {
    label: 'Waiting for Approval',
    badgeClass: 'bg-red-600 text-white text-[10px] font-black rounded-full uppercase px-2.5 py-0.5 border border-red-700 animate-pulse shadow-xs',
    borderClass: 'border-red-500',
    icon: 'AlertTriangle',
    description: 'Estimate submitted to customer, awaiting authorization',
  },
  APPROVED: {
    label: 'Approved',
    badgeClass: 'bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-emerald-300',
    borderClass: 'border-emerald-400',
    icon: 'CheckCircle2',
    description: 'Customer approved estimate, cleared to proceed',
  },
  DENIED: {
    label: 'Denied',
    badgeClass: 'bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-rose-300',
    borderClass: 'border-rose-400',
    icon: 'XCircle',
    description: 'Customer declined or held repairs',
  },
  PARTS_ORDERED: {
    label: 'Parts Ordered (ETA)',
    badgeClass: 'bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-purple-300',
    borderClass: 'border-purple-400',
    icon: 'Package',
    description: 'Parts ordered and tracking live ETA arrival',
  },
  PARTS_IN_TO_TECH: {
    label: 'Parts In / To Tech',
    badgeClass: 'bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-teal-300',
    borderClass: 'border-teal-400',
    icon: 'Truck',
    description: 'Parts arrived at shop and handed off to technician',
  },
  REPAIR_IN_PROGRESS: {
    label: 'Repair in Progress',
    badgeClass: 'bg-cyan-100 text-cyan-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-cyan-300',
    borderClass: 'border-cyan-400',
    icon: 'Play',
    description: 'Technician actively performing repairs and assembly',
  },
  REPAIR_COMPLETE: {
    label: 'Repair Complete',
    badgeClass: 'bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-green-300',
    borderClass: 'border-green-400',
    icon: 'CheckCircle',
    description: 'Repair work finished, test drive & inspection complete',
  },
  READY_FOR_PICKUP: {
    label: 'Ready for Pickup',
    badgeClass: 'bg-sky-100 text-sky-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-sky-300',
    borderClass: 'border-sky-400',
    icon: 'Car',
    description: 'Vehicle staged in front lot, customer notified for pickup',
  },
  CLOSED: {
    label: 'Closed',
    badgeClass: 'bg-slate-200 text-slate-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-slate-300',
    borderClass: 'border-slate-400',
    icon: 'CheckCheck',
    description: 'Invoice settled, keys released, repair order archived',
  },

  // Backward-compatibility aliases
  CREATED: {
    label: 'Waiting Diagnostics',
    badgeClass: 'bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-amber-300',
    borderClass: 'border-amber-400',
    icon: 'Clock',
    description: 'Vehicle queued in staging, awaiting technician diagnostics',
  },
  DISPATCHED: {
    label: 'Waiting Diagnostics',
    badgeClass: 'bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-amber-300',
    borderClass: 'border-amber-400',
    icon: 'Clock',
    description: 'Assigned to technician, awaiting diagnostics',
  },
  WAITING_DIAGNOSIS: {
    label: 'Waiting Diagnostics',
    badgeClass: 'bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-amber-300',
    borderClass: 'border-amber-400',
    icon: 'Clock',
    description: 'Vehicle staged in queue, awaiting diagnosis',
  },
  BEING_DIAGNOSED: {
    label: 'In Diag',
    badgeClass: 'bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-blue-300',
    borderClass: 'border-blue-400',
    icon: 'Wrench',
    description: 'Technician actively running diagnostics / scans',
  },
  IN_BAY: {
    label: 'In Diag',
    badgeClass: 'bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-blue-300',
    borderClass: 'border-blue-400',
    icon: 'Wrench',
    description: 'Active diagnosis or teardown underway',
  },
  GETTING_ESTIMATE: {
    label: 'Estimate Done',
    badgeClass: 'bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-indigo-300',
    borderClass: 'border-indigo-400',
    icon: 'Calculator',
    description: 'Diagnosis complete, preparing parts & labor estimate',
  },
  WAITING_APPROVAL: {
    label: 'Waiting for Approval',
    badgeClass: 'bg-orange-100 text-orange-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-orange-300 animate-pulse',
    borderClass: 'border-orange-400',
    icon: 'AlertTriangle',
    description: 'Estimate sent, awaiting customer sign-off',
  },
  WAITING_PARTS: {
    label: 'Parts Ordered (ETA)',
    badgeClass: 'bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-purple-300',
    borderClass: 'border-purple-400',
    icon: 'Package',
    description: 'Parts ordered, tracking arrival',
  },
  IN_REPAIR: {
    label: 'Repair in Progress',
    badgeClass: 'bg-cyan-100 text-cyan-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-cyan-300',
    borderClass: 'border-cyan-400',
    icon: 'Play',
    description: 'Parts in hand, repair underway',
  },
  QC_TEST: {
    label: 'Repair Complete',
    badgeClass: 'bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-green-300',
    borderClass: 'border-green-400',
    icon: 'CheckCircle',
    description: 'Repair work finished, test drive & inspection complete',
  },
  COMPLETED: {
    label: 'Closed',
    badgeClass: 'bg-slate-200 text-slate-800 text-[10px] font-bold rounded-full uppercase px-2.5 py-0.5 border border-slate-300',
    borderClass: 'border-slate-400',
    icon: 'CheckCheck',
    description: 'Vehicle ready or customer picked up',
  },
};

export function normalizeROStatus(status: string): string {
  switch (status) {
    case 'CREATED':
    case 'DISPATCHED':
    case 'WAITING_DIAGNOSIS':
    case 'WAITING_DIAGNOSTICS':
      return 'WAITING_DIAGNOSTICS';
    case 'BEING_DIAGNOSED':
    case 'IN_BAY':
    case 'IN_DIAG':
      return 'IN_DIAG';
    case 'DIAG_PAUSED':
    case 'PAUSED_DIAG':
    case 'DIAGNOSTIC_PAUSED':
      return 'DIAG_PAUSED';
    case 'GETTING_ESTIMATE':
    case 'ESTIMATE_DONE':
      return 'ESTIMATE_DONE';
    case 'WAITING_APPROVAL':
    case 'WAITING_FOR_APPROVAL':
      return 'WAITING_FOR_APPROVAL';
    case 'APPROVED':
      return 'APPROVED';
    case 'DENIED':
      return 'DENIED';
    case 'WAITING_PARTS':
    case 'PARTS_ORDERED':
      return 'PARTS_ORDERED';
    case 'PARTS_IN_TO_TECH':
      return 'PARTS_IN_TO_TECH';
    case 'IN_REPAIR':
    case 'REPAIR_IN_PROGRESS':
      return 'REPAIR_IN_PROGRESS';
    case 'QC_TEST':
    case 'REPAIR_COMPLETE':
      return 'REPAIR_COMPLETE';
    case 'READY_FOR_PICKUP':
      return 'READY_FOR_PICKUP';
    case 'COMPLETED':
    case 'CLOSED':
      return 'CLOSED';
    default:
      return status || 'WAITING_DIAGNOSTICS';
  }
}

export const INITIAL_SPECIAL_PARTS: SpecialPartNumber[] = [
  { id: 'sp_1', category: 'Oil Filters', name: '3.6L / 3.2L Oil Filter Cartridge', partNumber: '68191349AC', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'sp_2', category: 'Oil Filters', name: '5.7L Hemi Spin-On Oil Filter', partNumber: '04884899AC', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'sp_3', category: 'Drain Plugs & Gaskets', name: 'Oil Pan Drain Plug Gasket 14mm', partNumber: '6506214AA', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'sp_4', category: 'Cabin & Air Filters', name: 'Cabin Air Filter (Grand Cherokee / Durango)', partNumber: '68079487AB', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'sp_5', category: 'Batteries & Key Fobs', name: 'Key Fob Battery (CR2032 3V Lithium)', partNumber: 'CR2032-OEM', createdAt: '2026-01-01T08:00:00Z' },
];

export const INITIAL_IMPORTANT_NUMBERS: ImportantNumberEntry[] = [
  { id: 'in_1', category: 'Warranty Hotlines', name: 'Mopar Digital Warranty Helpdesk', number: '1-800-442-2666', notes: 'Claims & Prior Authorization (8am - 8pm EST)', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'in_2', category: 'Diagnostic Support', name: 'WiTECH 2.0 Diagnostic Helpdesk', number: '1-888-948-3241', notes: 'Micropod II registration & software help', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'in_3', category: 'Parts & Couriers', name: 'Local Parts Depot Courier Dispatch', number: '(555) 321-4490', notes: 'Daily afternoon run cutoff at 2:30 PM', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'in_4', category: 'Towing & Sublet', name: 'Dealership Priority Flatbed Towing', number: '(555) 882-9100', notes: 'Account #9042, 24/7 Service Drive dispatch', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'in_5', category: 'Sublet Vendors', name: 'SafeGlass Mobile Windshield Sublet', number: '(555) 774-1299', notes: 'Camera ADAS calibration on site', createdAt: '2026-01-01T08:00:00Z' },
];

export const INITIAL_MANAGER_PASSWORDS: ManagerPasswordEntry[] = [
  { id: 'pw_1', category: 'OEM Portals', title: 'DealerConnect (Stellantis / Mopar)', username: 'S9042_MGR', password: 'DC*Service2026!', websiteUrl: 'https://dealerconnect.chrysler.com', notes: 'Service & Parts administration portal', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'pw_2', category: 'Diagnostic Tools', title: 'WiTECH 2.0 Cloud Diagnostic', username: 'wo_service_lead', password: 'WiTech#Pass4491', websiteUrl: 'https://login.witechcloud.com', notes: 'Vehicle flash and ECU configuration', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'pw_3', category: 'Estimating & Labor', title: 'ProDemand / Mitchell 1', username: 'woolwine_advisor', password: 'ProDemand2026!', websiteUrl: 'https://www.prodemand.com', notes: 'Flat rate labor times & OEM procedures', createdAt: '2026-01-01T08:00:00Z' },
  { id: 'pw_4', category: 'Tire Program', title: 'Mopar National Tire Program', username: 'woolwine_tires', password: 'TireOrder#9042', websiteUrl: 'https://www.tirerackdealer.com', notes: 'OEM tire price match & distributor stock', createdAt: '2026-01-01T08:00:00Z' },
];

export const INITIAL_RECALL_WAITING_LIST: RecallWaitingEntry[] = [
  {
    id: 'rec_1',
    customerName: 'Michael Henderson',
    vin: '1C4HJXDG8MW681240',
    partNumber: '68518241AA',
    datePutOnList: '2026-08-15',
    phoneNumber: '(555) 234-8910',
    dateCalled: '2026-09-02',
    recallNumber: '66A',
    campaignCode: '66A',
    notes: '2021 Jeep Wrangler 3.0L EcoDiesel HPFP fuel pump kit',
    status: 'WAITING_ON_PART',
    createdAt: '2026-08-15T10:30:00Z',
    updatedAt: '2026-09-02T14:15:00Z'
  },
  {
    id: 'rec_6',
    customerName: 'Thomas Vance',
    vin: '1C4JJXR62MW719034',
    partNumber: '68518241AA',
    datePutOnList: '2026-08-28',
    phoneNumber: '(555) 345-6712',
    dateCalled: '',
    recallNumber: '66A',
    campaignCode: '66A',
    notes: '2021 Jeep Gladiator 3.0L EcoDiesel HPFP fuel pump kit',
    status: 'WAITING_ON_PART',
    createdAt: '2026-08-28T14:00:00Z',
    updatedAt: '2026-08-28T14:00:00Z'
  },
  {
    id: 'rec_7',
    customerName: 'Daniel Clark',
    vin: '1C4HJXDG4NW110823',
    partNumber: '68518241AA',
    datePutOnList: '2026-09-18',
    phoneNumber: '(555) 456-7890',
    dateCalled: '2026-10-12',
    recallNumber: '66A',
    campaignCode: '66A',
    notes: '2022 Jeep Wrangler EcoDiesel high pressure fuel pump',
    status: 'PART_ARRIVED',
    createdAt: '2026-09-18T11:20:00Z',
    updatedAt: '2026-10-12T09:30:00Z'
  },
  {
    id: 'rec_2',
    customerName: 'Brenda Collins',
    vin: '3C6UR5FL8NG219455',
    partNumber: '68374981AC',
    datePutOnList: '2026-09-05',
    phoneNumber: '(555) 412-7801',
    dateCalled: '',
    recallNumber: '04A',
    campaignCode: '04A',
    notes: '2022 Ram 2500 Cummins intake heater grid relay',
    status: 'WAITING_ON_PART',
    createdAt: '2026-09-05T09:15:00Z',
    updatedAt: '2026-09-05T09:15:00Z'
  },
  {
    id: 'rec_8',
    customerName: 'Gregory Scott',
    vin: '3C6UR5DL7MG640192',
    partNumber: '68374981AC',
    datePutOnList: '2026-09-29',
    phoneNumber: '(555) 567-8901',
    dateCalled: '',
    recallNumber: '04A',
    campaignCode: '04A',
    notes: '2021 Ram 3500 Cummins 6.7L intake heater relay',
    status: 'WAITING_ON_PART',
    createdAt: '2026-09-29T15:45:00Z',
    updatedAt: '2026-09-29T15:45:00Z'
  },
  {
    id: 'rec_3',
    customerName: 'David Kowalski',
    vin: '2C3CDXHG5NH190342',
    partNumber: '68249821AD',
    datePutOnList: '2026-09-22',
    phoneNumber: '(555) 890-3344',
    dateCalled: '2026-10-05',
    recallNumber: 'V07',
    campaignCode: 'V07',
    notes: '2022 Dodge Charger steering column wire harness bracket',
    status: 'WAITING_ON_PART',
    createdAt: '2026-09-22T11:45:00Z',
    updatedAt: '2026-10-05T16:20:00Z'
  },
  {
    id: 'rec_4',
    customerName: 'Sarah Jenkins',
    vin: '1C4PJLCB4KD382109',
    partNumber: '68493120AA',
    datePutOnList: '2026-10-01',
    phoneNumber: '(555) 671-9022',
    dateCalled: '2026-10-14',
    recallNumber: 'W12',
    campaignCode: 'W12',
    notes: '2019 Jeep Cherokee power liftgate module & latch',
    status: 'PART_ARRIVED',
    createdAt: '2026-10-01T14:00:00Z',
    updatedAt: '2026-10-14T11:30:00Z'
  },
  {
    id: 'rec_5',
    customerName: 'Robert Martinez',
    vin: '1C6SRFHT8NN340192',
    partNumber: '68541290AB',
    datePutOnList: '2026-10-10',
    phoneNumber: '(555) 789-1123',
    dateCalled: '',
    recallNumber: '24B',
    campaignCode: '24B',
    notes: '2022 Ram 1500 rearview camera central vision module',
    status: 'WAITING_ON_PART',
    createdAt: '2026-10-10T16:10:00Z',
    updatedAt: '2026-10-10T16:10:00Z'
  }
];

export const INITIAL_INTERNAL_EXTENSIONS: InternalExtensionEntry[] = [
  // ==========================================
  // WOOLWINE CDJR EXTENSIONS
  // ==========================================
  // Service Department
  {
    id: 'ext_cdjr_1',
    name: 'Service Manager Desk',
    extension: '201',
    department: 'Service',
    dealership: 'WOOLWINE_CDJR',
    title: 'Service Manager',
    directPhone: '(662) 287-3181 Ext 201',
    notes: 'Direct office line & dispatch escalation',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_2',
    name: 'Mark Reynolds',
    extension: '202',
    department: 'Service',
    dealership: 'WOOLWINE_CDJR',
    title: 'Lead Service Advisor',
    directPhone: '(662) 287-3181 Ext 202',
    notes: 'Lane 1 - Truck & Diesel Specialist',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_3',
    name: 'Rachel Adams',
    extension: '203',
    department: 'Service',
    dealership: 'WOOLWINE_CDJR',
    title: 'Service Advisor',
    directPhone: '(662) 287-3181 Ext 203',
    notes: 'Lane 2 - Express & Maintenance',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_4',
    name: 'Shop Foreman (Tech Floor)',
    extension: '210',
    department: 'Service',
    dealership: 'WOOLWINE_CDJR',
    title: 'Shop Foreman / Diagnostics',
    notes: 'Main shop floor desk & diagnostic lead',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_5',
    name: 'Service BDC & Appointments',
    extension: '215',
    department: 'Service',
    dealership: 'WOOLWINE_CDJR',
    title: 'BDC Appointment Coordinator',
    directPhone: '(662) 287-3181 Ext 215',
    notes: 'Inbound customer appointments & recall checks',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_6',
    name: 'Warranty Administrator',
    extension: '218',
    department: 'Service',
    dealership: 'WOOLWINE_CDJR',
    title: 'Warranty Clerk',
    notes: 'OEM claim submissions & pre-authorizations',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // Parts Department
  {
    id: 'ext_cdjr_7',
    name: 'Parts Front Counter',
    extension: '301',
    department: 'Parts',
    dealership: 'WOOLWINE_CDJR',
    title: 'Retail Counter Specialist',
    directPhone: '(662) 287-3181 Ext 301',
    notes: 'Retail customers, batteries, accessories',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_8',
    name: 'Parts Back Counter (Tech Window)',
    extension: '302',
    department: 'Parts',
    dealership: 'WOOLWINE_CDJR',
    title: 'Shop Parts Specialist',
    notes: 'Direct technician parts requests & RO issue window',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_9',
    name: 'Parts Manager Desk',
    extension: '300',
    department: 'Parts',
    dealership: 'WOOLWINE_CDJR',
    title: 'Parts Department Director',
    directPhone: '(662) 287-3181 Ext 300',
    notes: 'Vendor accounts & special purchase orders',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_10',
    name: 'Wholesale Parts Desk',
    extension: '310',
    department: 'Parts',
    dealership: 'WOOLWINE_CDJR',
    title: 'Wholesale Logistics',
    directPhone: '(662) 287-3181 Ext 310',
    notes: 'Body shop & independent repair facility orders',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_11',
    name: 'Parts Shipping & Receiving',
    extension: '305',
    department: 'Parts',
    dealership: 'WOOLWINE_CDJR',
    title: 'Warehouse & Receiving',
    notes: 'Stock check-in, freight deliveries & VOR check-in',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // Sales Department
  {
    id: 'ext_cdjr_12',
    name: 'Sales Desk / Desk Manager',
    extension: '101',
    department: 'Sales',
    dealership: 'WOOLWINE_CDJR',
    title: 'Sales Desk Manager',
    directPhone: '(662) 287-3181 Ext 101',
    notes: 'Appraisals, trade-ins, sales floor oversight',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_13',
    name: 'Finance & Insurance (F&I Office)',
    extension: '105',
    department: 'Sales',
    dealership: 'WOOLWINE_CDJR',
    title: 'Finance Director',
    directPhone: '(662) 287-3181 Ext 105',
    notes: 'Contracts, warranties, customer financing',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_14',
    name: 'Internet Sales / BDC',
    extension: '110',
    department: 'Sales',
    dealership: 'WOOLWINE_CDJR',
    title: 'BDC Director',
    directPhone: '(662) 287-3181 Ext 110',
    notes: 'Web leads, phone sales inquiries',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // Accounting & Office
  {
    id: 'ext_cdjr_15',
    name: 'Main Cashier & Reception',
    extension: '401',
    department: 'Accounting / Office',
    dealership: 'WOOLWINE_CDJR',
    title: 'Service Cashier',
    directPhone: '(662) 287-3181 Ext 401',
    notes: 'Customer payment processing, key release & loaner check-in',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_16',
    name: 'Title & Registration Office',
    extension: '405',
    department: 'Accounting / Office',
    dealership: 'WOOLWINE_CDJR',
    title: 'Title Clerk',
    notes: 'Tag & title processing, DMV paperwork',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_cdjr_17',
    name: 'Office Manager / Controller',
    extension: '410',
    department: 'Accounting / Office',
    dealership: 'WOOLWINE_CDJR',
    title: 'Dealership Controller',
    directPhone: '(662) 287-3181 Ext 410',
    notes: 'Payroll, accounts payable & financial records',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // Management
  {
    id: 'ext_cdjr_18',
    name: 'General Manager',
    extension: '100',
    department: 'Management',
    dealership: 'WOOLWINE_CDJR',
    title: 'General Manager',
    directPhone: '(662) 287-3181 Ext 100',
    notes: 'Dealership Executive Office',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // ==========================================
  // WOOLWINE FORD EXTENSIONS
  // ==========================================
  // Service Department
  {
    id: 'ext_ford_1',
    name: 'Ford Service Manager Desk',
    extension: '201',
    department: 'Service',
    dealership: 'WOOLWINE_FORD',
    title: 'Ford Service Manager',
    directPhone: '(662) 287-5501',
    notes: 'Ford Service operations & technician dispatch',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_ford_2',
    name: 'Ford Service Advisor (Main Lane)',
    extension: '202',
    department: 'Service',
    dealership: 'WOOLWINE_FORD',
    title: 'Service Advisor',
    directPhone: '(662) 287-5502',
    notes: 'F-150, Super Duty & Passenger Vehicle Intake',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_ford_3',
    name: 'Quick Lane / Express Service Desk',
    extension: '205',
    department: 'Service',
    dealership: 'WOOLWINE_FORD',
    title: 'Quick Lane Manager',
    directPhone: '(662) 287-5505',
    notes: 'Oil changes, tire rotations, brake inspections',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_ford_4',
    name: 'Ford Shop Foreman (Power Stroke Diesel)',
    extension: '210',
    department: 'Service',
    dealership: 'WOOLWINE_FORD',
    title: 'Senior Master Ford Tech / Foreman',
    notes: 'Heavy line, 6.7L Power Stroke & EV certified lead',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_ford_5',
    name: 'Ford Service BDC & Appointments',
    extension: '215',
    department: 'Service',
    dealership: 'WOOLWINE_FORD',
    title: 'BDC Appointment Coordinator',
    directPhone: '(662) 287-5515',
    notes: 'Customer service scheduling & recall alerts',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_ford_6',
    name: 'Ford Warranty Administrator',
    extension: '218',
    department: 'Service',
    dealership: 'WOOLWINE_FORD',
    title: 'Warranty Administrator',
    notes: 'Ford Motor Co. warranty claims & FSA processing',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // Parts Department
  {
    id: 'ext_ford_7',
    name: 'Ford Parts Front Counter',
    extension: '301',
    department: 'Parts',
    dealership: 'WOOLWINE_FORD',
    title: 'Motorcraft Parts Counter',
    directPhone: '(662) 287-5531',
    notes: 'Motorcraft retail parts, batteries, accessories',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_ford_8',
    name: 'Ford Parts Back Counter (Tech Window)',
    extension: '302',
    department: 'Parts',
    dealership: 'WOOLWINE_FORD',
    title: 'Shop Parts Specialist',
    notes: 'Direct technician Ford OEM parts staging',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_ford_9',
    name: 'Ford Parts Director / Manager',
    extension: '300',
    department: 'Parts',
    dealership: 'WOOLWINE_FORD',
    title: 'Parts Manager',
    directPhone: '(662) 287-5530',
    notes: 'OEM tire ordering & dealer stock management',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_ford_10',
    name: 'Ford Wholesale Parts Hotline',
    extension: '310',
    department: 'Parts',
    dealership: 'WOOLWINE_FORD',
    title: 'Wholesale Parts Specialist',
    directPhone: '(662) 287-5535',
    notes: 'Regional collision centers & fleets',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // Sales Department
  {
    id: 'ext_ford_11',
    name: 'Ford Sales Desk / Desk Manager',
    extension: '101',
    department: 'Sales',
    dealership: 'WOOLWINE_FORD',
    title: 'Sales Desk Manager',
    directPhone: '(662) 287-5510',
    notes: 'Ford vehicle appraisals, trade-ins, sales floor',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_ford_12',
    name: 'Ford Commercial & Fleet Sales',
    extension: '103',
    department: 'Sales',
    dealership: 'WOOLWINE_FORD',
    title: 'Commercial Vehicle Director',
    directPhone: '(662) 287-5512',
    notes: 'Ford Pro Transit, Super Duty chassis & fleet accounts',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_ford_13',
    name: 'Ford Finance & Insurance (F&I)',
    extension: '105',
    department: 'Sales',
    dealership: 'WOOLWINE_FORD',
    title: 'Finance Manager',
    directPhone: '(662) 287-5514',
    notes: 'Ford Credit, Ford Protect extended service plans',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // Accounting & Office
  {
    id: 'ext_ford_14',
    name: 'Ford Main Cashier & Service Billing',
    extension: '401',
    department: 'Accounting / Office',
    dealership: 'WOOLWINE_FORD',
    title: 'Cashier & Receptionist',
    directPhone: '(662) 287-5540',
    notes: 'Customer checkout, FordPass points redemption',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_ford_15',
    name: 'Ford Office Manager / Controller',
    extension: '410',
    department: 'Accounting / Office',
    dealership: 'WOOLWINE_FORD',
    title: 'Office Manager',
    directPhone: '(662) 287-5545',
    notes: 'Accounting, vehicle invoicing & dealer payroll',
    createdAt: '2026-01-01T08:00:00Z'
  },

  // Management & Body Shop
  {
    id: 'ext_ford_16',
    name: 'Ford General Manager',
    extension: '100',
    department: 'Management',
    dealership: 'WOOLWINE_FORD',
    title: 'General Manager',
    directPhone: '(662) 287-5500',
    notes: 'Woolwine Ford Executive Office',
    createdAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'ext_ford_17',
    name: 'Collision Center / Body Shop Estimator',
    extension: '501',
    department: 'Body Shop',
    dealership: 'WOOLWINE_FORD',
    title: 'Collision Center Manager',
    directPhone: '(662) 287-5550',
    notes: 'Aluminum certified body shop & insurance claims',
    createdAt: '2026-01-01T08:00:00Z'
  }
];

