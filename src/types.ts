export type ComplianceStatus = 'Compliant' | 'Warning' | 'NON-COMPLIANT';

export type UserRole = 'Safety Manager & CEO' | 'Dispatcher' | 'Driver';

export interface UserSession {
  id: string; // "admin", "dispatcher-bob", or driver ID (e.g. "D1")
  name: string;
  role: UserRole;
  driverId?: string; // If role is 'Driver', points to the corresponding Driver record
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
}

export interface Vehicle {
  id: string;
  unitNumber: string;
  vin: string;
  inspectionExpiry: string;
  overallStatus: ComplianceStatus;
  maintenanceStatus: 'Scheduled' | 'Overdue' | 'Up to Date';
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
  type: 'security' | 'data_edit' | 'approval';
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


