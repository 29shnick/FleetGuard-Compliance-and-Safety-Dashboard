import { DispatchLoad, CompanyInfo, IftaJurisdictionRecord, IftaQuarterlyReport } from '../types';

export interface StateTaxInfo {
  name: string;
  taxRate: number; // USD per gallon
}

// Certified standard IFTA Diesel Tax Rates per gallon
export const IFTA_STATE_RATES: Record<string, StateTaxInfo> = {
  AL: { name: 'Alabama', taxRate: 0.300 },
  AZ: { name: 'Arizona', taxRate: 0.260 },
  AR: { name: 'Arkansas', taxRate: 0.285 },
  CA: { name: 'California', taxRate: 0.441 },
  CO: { name: 'Colorado', taxRate: 0.205 },
  CT: { name: 'Connecticut', taxRate: 0.492 },
  DE: { name: 'Delaware', taxRate: 0.220 },
  FL: { name: 'Florida', taxRate: 0.352 },
  GA: { name: 'Georgia', taxRate: 0.354 },
  ID: { name: 'Idaho', taxRate: 0.320 },
  IL: { name: 'Illinois', taxRate: 0.613 },
  IN: { name: 'Indiana', taxRate: 0.570 },
  IA: { name: 'Iowa', taxRate: 0.325 },
  KS: { name: 'Kansas', taxRate: 0.260 },
  KY: { name: 'Kentucky', taxRate: 0.260 },
  LA: { name: 'Louisiana', taxRate: 0.200 },
  ME: { name: 'Maine', taxRate: 0.312 },
  MD: { name: 'Maryland', taxRate: 0.477 },
  MA: { name: 'Massachusetts', taxRate: 0.240 },
  MI: { name: 'Michigan', taxRate: 0.536 },
  MN: { name: 'Minnesota', taxRate: 0.285 },
  MS: { name: 'Mississippi', taxRate: 0.184 },
  MO: { name: 'Missouri', taxRate: 0.245 },
  MT: { name: 'Montana', taxRate: 0.298 },
  NE: { name: 'Nebraska', taxRate: 0.290 },
  NV: { name: 'Nevada', taxRate: 0.270 },
  NH: { name: 'New Hampshire', taxRate: 0.222 },
  NJ: { name: 'New Jersey', taxRate: 0.485 },
  NM: { name: 'New Mexico', taxRate: 0.210 },
  NY: { name: 'New York', taxRate: 0.407 },
  NC: { name: 'North Carolina', taxRate: 0.405 },
  ND: { name: 'North Dakota', taxRate: 0.230 },
  OH: { name: 'Ohio', taxRate: 0.470 },
  OK: { name: 'Oklahoma', taxRate: 0.190 },
  OR: { name: 'Oregon', taxRate: 0.000 }, // Weight-Mile tax state
  PA: { name: 'Pennsylvania', taxRate: 0.741 },
  RI: { name: 'Rhode Island', taxRate: 0.370 },
  SC: { name: 'South Carolina', taxRate: 0.280 },
  SD: { name: 'South Dakota', taxRate: 0.280 },
  TN: { name: 'Tennessee', taxRate: 0.274 },
  TX: { name: 'Texas', taxRate: 0.200 },
  UT: { name: 'Utah', taxRate: 0.364 },
  VT: { name: 'Vermont', taxRate: 0.320 },
  VA: { name: 'Virginia', taxRate: 0.308 },
  WA: { name: 'Washington', taxRate: 0.494 },
  WV: { name: 'West Virginia', taxRate: 0.357 },
  WI: { name: 'Wisconsin', taxRate: 0.329 },
  WY: { name: 'Wyoming', taxRate: 0.240 }
};

// Interstate corridor proportions for interstate trucking pairs
interface StateRatio {
  state: string;
  ratio: number;
}

const CORRIDOR_RATIOS: Record<string, StateRatio[]> = {
  'IL-NY': [
    { state: 'IL', ratio: 0.14 },
    { state: 'IN', ratio: 0.21 },
    { state: 'OH', ratio: 0.34 },
    { state: 'PA', ratio: 0.22 },
    { state: 'NY', ratio: 0.09 }
  ],
  'NY-IL': [
    { state: 'NY', ratio: 0.09 },
    { state: 'PA', ratio: 0.22 },
    { state: 'OH', ratio: 0.34 },
    { state: 'IN', ratio: 0.21 },
    { state: 'IL', ratio: 0.14 }
  ],
  'TX-CA': [
    { state: 'TX', ratio: 0.38 },
    { state: 'NM', ratio: 0.12 },
    { state: 'AZ', ratio: 0.28 },
    { state: 'CA', ratio: 0.22 }
  ],
  'CA-TX': [
    { state: 'CA', ratio: 0.22 },
    { state: 'AZ', ratio: 0.28 },
    { state: 'NM', ratio: 0.12 },
    { state: 'TX', ratio: 0.38 }
  ],
  'FL-GA': [
    { state: 'FL', ratio: 0.42 },
    { state: 'GA', ratio: 0.58 }
  ],
  'GA-FL': [
    { state: 'GA', ratio: 0.58 },
    { state: 'FL', ratio: 0.42 }
  ],
  'CA-WA': [
    { state: 'CA', ratio: 0.32 },
    { state: 'OR', ratio: 0.38 },
    { state: 'WA', ratio: 0.30 }
  ],
  'WA-CA': [
    { state: 'WA', ratio: 0.30 },
    { state: 'OR', ratio: 0.38 },
    { state: 'CA', ratio: 0.32 }
  ],
  'WA-CO': [
    { state: 'WA', ratio: 0.20 },
    { state: 'ID', ratio: 0.22 },
    { state: 'UT', ratio: 0.26 },
    { state: 'WY', ratio: 0.18 },
    { state: 'CO', ratio: 0.14 }
  ],
  'CO-WA': [
    { state: 'CO', ratio: 0.14 },
    { state: 'WY', ratio: 0.18 },
    { state: 'UT', ratio: 0.26 },
    { state: 'ID', ratio: 0.22 },
    { state: 'WA', ratio: 0.20 }
  ],
  'GA-IL': [
    { state: 'GA', ratio: 0.18 },
    { state: 'TN', ratio: 0.24 },
    { state: 'KY', ratio: 0.26 },
    { state: 'IL', ratio: 0.32 }
  ],
  'IL-GA': [
    { state: 'IL', ratio: 0.32 },
    { state: 'KY', ratio: 0.26 },
    { state: 'TN', ratio: 0.24 },
    { state: 'GA', ratio: 0.18 }
  ],
  'TX-IL': [
    { state: 'TX', ratio: 0.28 },
    { state: 'OK', ratio: 0.18 },
    { state: 'MO', ratio: 0.32 },
    { state: 'IL', ratio: 0.22 }
  ],
  'IL-TX': [
    { state: 'IL', ratio: 0.22 },
    { state: 'MO', ratio: 0.32 },
    { state: 'OK', ratio: 0.18 },
    { state: 'TX', ratio: 0.28 }
  ],
  'CO-IL': [
    { state: 'CO', ratio: 0.18 },
    { state: 'NE', ratio: 0.44 },
    { state: 'IA', ratio: 0.26 },
    { state: 'IL', ratio: 0.12 }
  ],
  'IL-CO': [
    { state: 'IL', ratio: 0.12 },
    { state: 'IA', ratio: 0.26 },
    { state: 'NE', ratio: 0.44 },
    { state: 'CO', ratio: 0.18 }
  ],
  'AZ-TX': [
    { state: 'AZ', ratio: 0.25 },
    { state: 'NM', ratio: 0.32 },
    { state: 'TX', ratio: 0.43 }
  ],
  'TX-AZ': [
    { state: 'TX', ratio: 0.43 },
    { state: 'NM', ratio: 0.32 },
    { state: 'AZ', ratio: 0.25 }
  ],
  'NY-GA': [
    { state: 'NY', ratio: 0.05 },
    { state: 'NJ', ratio: 0.12 },
    { state: 'PA', ratio: 0.18 },
    { state: 'MD', ratio: 0.08 },
    { state: 'VA', ratio: 0.32 },
    { state: 'NC', ratio: 0.17 },
    { state: 'SC', ratio: 0.08 }
  ],
  'GA-NY': [
    { state: 'SC', ratio: 0.08 },
    { state: 'NC', ratio: 0.17 },
    { state: 'VA', ratio: 0.32 },
    { state: 'MD', ratio: 0.08 },
    { state: 'PA', ratio: 0.18 },
    { state: 'NJ', ratio: 0.12 },
    { state: 'NY', ratio: 0.05 }
  ]
};

// Helper: Extract 2-letter state code from string like "Chicago, IL"
export function extractStateCode(hubString: string): string {
  if (!hubString) return 'IL';
  const match = hubString.trim().match(/\b([A-Z]{2})\b$/);
  if (match && IFTA_STATE_RATES[match[1]]) {
    return match[1];
  }
  // Try comma split
  const parts = hubString.split(',');
  if (parts.length >= 2) {
    const code = parts[parts.length - 1].trim().toUpperCase().substring(0, 2);
    if (IFTA_STATE_RATES[code]) return code;
  }
  return 'IL';
}

// Decompose a load's calculated distance into individual states
export function decomposeLoadMilesByState(load: DispatchLoad): { stateCode: string; miles: number }[] {
  const originState = extractStateCode(load.originHub);
  const destState = extractStateCode(load.destinationHub);
  const totalMiles = Number(load.calculatedMiles) || 0;

  if (totalMiles <= 0) return [];

  // If origin and destination are the same state
  if (originState === destState) {
    return [{ stateCode: originState, miles: totalMiles }];
  }

  const corridorKey = `${originState}-${destState}`;
  const ratios = CORRIDOR_RATIOS[corridorKey];

  if (ratios && ratios.length > 0) {
    let accumulatedMiles = 0;
    const result: { stateCode: string; miles: number }[] = [];

    ratios.forEach((r, idx) => {
      // Last element takes rounding difference to ensure exact total match
      const isLast = idx === ratios.length - 1;
      const miles = isLast 
        ? Math.max(0, totalMiles - accumulatedMiles) 
        : Math.round(totalMiles * r.ratio);
      accumulatedMiles += miles;
      result.push({ stateCode: r.state, miles });
    });

    return result;
  }

  // Fallback split for any state pair not explicitly in corridor table:
  // 50% origin state, 50% destination state
  const halfMiles = Math.round(totalMiles / 2);
  const remMiles = totalMiles - halfMiles;
  return [
    { stateCode: originState, miles: halfMiles },
    { stateCode: destState, miles: remMiles }
  ];
}

// Standard quarter definition dates
export function getQuarterInfo(quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4', year: string = '2026') {
  switch (quarter) {
    case 'Q1':
      return {
        label: `${year} First Quarter (Q1)`,
        dateRange: `January 1, ${year} – March 31, ${year}`,
        dueDate: `April 30, ${year}`,
        monthsPrefix: [`${year}-01`, `${year}-02`, `${year}-03`]
      };
    case 'Q2':
      return {
        label: `${year} Second Quarter (Q2)`,
        dateRange: `April 1, ${year} – June 30, ${year}`,
        dueDate: `July 31, ${year}`,
        monthsPrefix: [`${year}-04`, `${year}-05`, `${year}-06`]
      };
    case 'Q3':
      return {
        label: `${year} Third Quarter (Q3)`,
        dateRange: `July 1, ${year} – September 30, ${year}`,
        dueDate: `October 31, ${year}`,
        monthsPrefix: [`${year}-07`, `${year}-08`, `${year}-09`]
      };
    case 'Q4':
      return {
        label: `${year} Fourth Quarter (Q4)`,
        dateRange: `October 1, ${year} – December 31, ${year}`,
        dueDate: `January 31, ${parseInt(year, 10) + 1}`,
        monthsPrefix: [`${year}-10`, `${year}-11`, `${year}-12`]
      };
  }
}

// Supplementary historical/quarterly freight loads to ensure complete multi-state quarterly reporting
export const SUPPLEMENTARY_IFTA_LOADS: DispatchLoad[] = [
  // Q1 2026 Loads (Jan - Mar)
  {
    id: 'IFTA-Q1-1',
    loadNumber: 'LD-1092',
    originHub: 'Chicago, IL',
    destinationHub: 'New York, NY',
    calculatedMiles: 712,
    driverId: 'D5',
    driverName: 'Linda Garcia',
    truckId: 'TRK-101',
    ratePerMile: 2.80,
    payout: 1993.60,
    status: 'Delivered',
    cargoType: 'Consumer Goods',
    weightLbs: 34000,
    submittedAt: '2026-02-10 08:30'
  },
  {
    id: 'IFTA-Q1-2',
    loadNumber: 'LD-1180',
    originHub: 'Dallas, TX',
    destinationHub: 'Los Angeles, CA',
    calculatedMiles: 1400,
    driverId: 'D2',
    driverName: 'James Wilson',
    truckId: 'TRK-202',
    ratePerMile: 3.00,
    payout: 4200.00,
    status: 'Delivered',
    cargoType: 'Refrigerated Produce',
    weightLbs: 41000,
    submittedAt: '2026-02-22 14:15'
  },
  {
    id: 'IFTA-Q1-3',
    loadNumber: 'LD-1240',
    originHub: 'Seattle, WA',
    destinationHub: 'Denver, CO',
    calculatedMiles: 1305,
    driverId: 'D7',
    driverName: 'Emily Davis',
    truckId: 'TRK-707',
    ratePerMile: 2.75,
    payout: 3588.75,
    status: 'Delivered',
    cargoType: 'Dry Van Industrial',
    weightLbs: 36000,
    submittedAt: '2026-03-14 09:00'
  },
  // Q2 2026 Supplementary Loads (Apr - Jun)
  {
    id: 'IFTA-Q2-1',
    loadNumber: 'LD-2410',
    originHub: 'Chicago, IL',
    destinationHub: 'Dallas, TX',
    calculatedMiles: 925,
    driverId: 'D6',
    driverName: 'Michael Chen',
    truckId: 'TRK-606',
    ratePerMile: 2.90,
    payout: 2682.50,
    status: 'Delivered',
    cargoType: 'Industrial Machinery',
    weightLbs: 42000,
    submittedAt: '2026-04-18 11:00'
  },
  {
    id: 'IFTA-Q2-2',
    loadNumber: 'LD-2690',
    originHub: 'Los Angeles, CA',
    destinationHub: 'Seattle, WA',
    calculatedMiles: 1135,
    driverId: 'D8',
    driverName: 'David Martinez',
    truckId: 'TRK-808',
    ratePerMile: 3.15,
    payout: 3575.25,
    status: 'Delivered',
    cargoType: 'Refrigerated Dairy',
    weightLbs: 39500,
    submittedAt: '2026-05-10 13:45'
  },
  {
    id: 'IFTA-Q2-3',
    loadNumber: 'LD-2880',
    originHub: 'Atlanta, GA',
    destinationHub: 'Chicago, IL',
    calculatedMiles: 720,
    driverId: 'D5',
    driverName: 'Sarah Jenkins',
    truckId: 'TRK-505',
    ratePerMile: 2.85,
    payout: 2052.00,
    status: 'Delivered',
    cargoType: 'Automotive Parts',
    weightLbs: 33000,
    submittedAt: '2026-06-05 10:20'
  },
  // Q3 2026 Supplementary Loads (Jul - Sep)
  {
    id: 'IFTA-Q3-1',
    loadNumber: 'LD-3201',
    originHub: 'Denver, CO',
    destinationHub: 'Chicago, IL',
    calculatedMiles: 1000,
    driverId: 'D10',
    driverName: 'Kevin Lee',
    truckId: 'TRK-1010',
    ratePerMile: 2.70,
    payout: 2700.00,
    status: 'Delivered',
    cargoType: 'Grain & Feed',
    weightLbs: 44000,
    submittedAt: '2026-07-16 09:15'
  },
  {
    id: 'IFTA-Q3-2',
    loadNumber: 'LD-3450',
    originHub: 'Phoenix, AZ',
    destinationHub: 'Dallas, TX',
    calculatedMiles: 1015,
    driverId: 'D3',
    driverName: 'Robert Brown',
    truckId: 'TRK-303',
    ratePerMile: 2.95,
    payout: 2994.25,
    status: 'Delivered',
    cargoType: 'Building Materials',
    weightLbs: 40000,
    submittedAt: '2026-08-08 14:30'
  }
];

// Baseline fuel receipts purchased in states (standard Love's, Pilot, TA truck stops)
export const DEFAULT_STATE_FUEL_PURCHASES: Record<string, Record<string, number>> = {
  // Q1
  'Q1': {
    IL: 120,
    IN: 90,
    OH: 140,
    PA: 80,
    TX: 220,
    NM: 80,
    AZ: 180,
    CA: 100,
    WA: 110,
    ID: 90,
    UT: 120,
    WY: 80,
    CO: 70
  },
  // Q2
  'Q2': {
    IL: 180,
    IN: 100,
    OH: 150,
    PA: 90,
    NY: 40,
    TX: 310,
    NM: 80,
    AZ: 190,
    CA: 190,
    FL: 140,
    GA: 210,
    TN: 110,
    KY: 120,
    MO: 150,
    OK: 90,
    OR: 160,
    WA: 140
  },
  // Q3
  'Q3': {
    CO: 120,
    NE: 180,
    IA: 140,
    IL: 90,
    AZ: 120,
    NM: 140,
    TX: 200
  },
  // Q4
  'Q4': {
    IL: 100,
    IN: 80,
    OH: 110,
    PA: 90,
    TX: 140
  }
};
