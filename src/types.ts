export interface CompanyInfo {
  legalName: string;
  dbaName?: string;
  usdotNumber: string;
  mcNumber: string;
  feinTaxId: string;
  address: string;
  phone: string;
  email: string;
  safetyManagerName: string;
  iftaAccountState: string;
  iftaAccountNumber: string;
  stateTaxWithholdingId?: string;
  bankName?: string;
  payrollRoutingNumber?: string;
  payrollAccountNumber?: string;
}

export type ComplianceStatus = 'Compliant' | 'Warning' | 'NON-COMPLIANT';

export type UserRole = 'Safety Manager & CEO' | 'Dispatcher' | 'Driver';

export interface UserSession {
  id: string; // "admin", "dispatcher-bob", or driver ID (e.g. "D1")
  name: string;
  role: UserRole;
  driverId?: string; // If role is 'Driver', points to the corresponding Driver record
}

export type TaxClassification = 'W2' | '1099-NEC';

export interface DriverProfileInfo {
  phone?: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  ssnEin?: string;
  cdlNumber?: string;
  cdlState?: string;
  endorsements?: string[];
  hireDate?: string;
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  payRatePerMile?: number;
  operatingStatus?: 'Active' | 'On Leave' | 'Inactive';
  notes?: string;
}

export interface Driver {
  id: string;
  name: string;
  cdlExpiry: string;
  medCertExpiry: string;
  truckId: string;
  overallStatus: ComplianceStatus;
  criticalViolations: number;
  isHighRisk: boolean;
  taxClassification?: TaxClassification;
  profileInfo?: DriverProfileInfo;
}

export interface Vehicle {
  id: string;
  unitNumber: string;
  vin: string;
  inspectionExpiry: string;
  overallStatus: ComplianceStatus;
  maintenanceStatus: 'Scheduled' | 'Overdue' | 'Up to Date';
  mileage?: number;               // Current mileage of the heavy vehicle
  lastInspectionMileage?: number; // Mileage at the last inspection
  inspectionIntervalMiles?: number; // Target mileage interval (e.g. 10,000 miles)
  averageMonthlyMiles?: number;    // Average mileage accumulated per month
}

export interface Alert {
  id: string;
  timestamp: string;
  type: 'Compliance' | 'Safety' | 'Maintenance';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RenewalRequest {
  id: string;
  driverId: string;
  driverName: string;
  type: 'CDL' | 'Medical Cert' | 'Vehicle Issue';
  requestedValue?: string; // New proposed expiry date or issue description
  status: 'Pending' | 'Approved' | 'Declined';
  submittedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  details: string;
  type: 'security' | 'data_edit' | 'approval' | 'incident';
}

export interface HistoricalViolation {
  id: string;
  driverId: string;
  driverName: string;
  date: string; // YYYY-MM-DD
  type: string;
  category: 'Hours of Service' | 'Vehicle Maintenance' | 'Unsafe Driving' | 'Driver Fitness';
  severity: 'Critical' | 'Warning';
  points: number;
  fmcsaCode?: string;
  location?: string;
}

export interface MonthlySafetyRiskDataPoint {
  monthKey: string;
  monthLabel: string;
  criticalViolations: number;
  unresolvedIncidents: number;
  safetyRisk: number;
  resolvedIncidents: number;
  totalIncidents: number;
  violationsList: HistoricalViolation[];
  incidentsList: IncidentReport[];
}

export type IncidentType = 
  | 'Mechanical Breakdown' 
  | 'Collision / Accident' 
  | 'Tire Blowout' 
  | 'DOT Roadside Inspection' 
  | 'Cargo Shift / HazMat Issue' 
  | 'Medical Emergency' 
  | 'Severe Weather Stoppage' 
  | 'Other Roadside Issue';

export type IncidentSeverity = 'Critical' | 'Major' | 'Minor';

export type IncidentStatus = 
  | 'Open - Dispatch Action Required' 
  | 'In Progress - Assistance Dispatched' 
  | 'Resolved / Cleared';

export interface IncidentReport {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone?: string;
  truckId: string;
  loadId?: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: string;
  reportedAt: string;
  description: string;
  isVehicleDrivable: boolean;
  injuriesReported: boolean;
  policeContacted: boolean;
  policeReportNumber?: string;
  assistanceNeeded: string[];
  photos?: { name: string; size?: number; dataUrl?: string }[];
  dispatchNotes?: string;
  serviceVendor?: string;
  etaMinutes?: number;
  resolvedAt?: string;
}

export interface DispatchLoad {
  id: string;
  loadNumber: string;
  originHub: string;
  destinationHub: string;
  calculatedMiles: number;
  driverId: string;
  driverName: string;
  truckId: string;
  ratePerMile: number;
  payout: number;
  status: 'Pending' | 'Active' | 'Dispatched' | 'Delivered';
  cargoType: string;
  weightLbs: number;
  submittedAt: string;
  notes?: string;
  rateConFile?: { name: string; size: number; dataUrl?: string };
  bolFile?: { name: string; size: number; dataUrl?: string };
  invoiceDetails?: {
    invoiceNumber: string;
    billingDate: string;
    dueDate: string;
    shipperName: string;
    consigneeName: string;
    taxId: string;
    terms: string;
    totalDue: number;
    subtotal: number;
    fees: number;
  };
}

export interface PayStub {
  id: string;
  driverId: string;
  driverName: string;
  weekEndingDate: string; // "YYYY-MM-DD" Sat ending
  loadIds: string[];
  totalMiles: number;
  grossAmount: number;
  status: 'Pending Review' | 'Approved' | 'Paid';
  issuedAt: string;
  notes?: string;
}

export interface IftaJurisdictionRecord {
  stateCode: string;
  stateName: string;
  totalMiles: number;
  taxableMiles: number;
  taxableGallons: number;
  taxPaidGallons: number;
  netTaxableGallons: number;
  taxRatePerGallon: number;
  netTaxDue: number; // positive = tax due, negative = credit/refund
  associatedLoads: {
    loadId: string;
    loadNumber: string;
    originHub: string;
    destinationHub: string;
    truckId: string;
    driverName: string;
    stateMiles: number;
    date: string;
  }[];
}

export interface IftaQuarterlyReport {
  year: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  filingDueDate: string;
  totalIftaMiles: number;
  totalTaxableMiles: number;
  totalTaxableGallons: number;
  totalTaxPaidGallons: number;
  overallMpg: number;
  grossTaxDue: number;
  taxPaidCredits: number;
  netTaxBalance: number;
  jurisdictions: IftaJurisdictionRecord[];
}


