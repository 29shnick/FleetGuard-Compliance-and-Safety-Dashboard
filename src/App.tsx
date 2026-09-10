import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert,
  Search,
  TrendingUp,
  Menu,
  X,
  FileBadge2,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Fingerprint,
  RotateCcw,
  AlertCircle,
  Compass,
  DollarSign,
  Receipt,
  ShieldCheck,
  Building2,
  ArrowRight,
  Monitor,
  Smartphone,
  MonitorSmartphone,
  MoreHorizontal,
  SlidersHorizontal,
  Bell
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';
import { MOCK_DRIVERS, MOCK_VEHICLES, DEFAULT_COMPANY_INFO, MOCK_INCIDENTS, HISTORICAL_VIOLATIONS, MOCK_MAINTENANCE_INVOICES, MOCK_DRIVER_EXPENSES, MOCK_FUEL_TRANSACTIONS } from './data';
import { Driver, Vehicle, ComplianceStatus, UserSession, AuditLogEntry, RenewalRequest, DispatchLoad, PayStub, TaxClassification, CompanyInfo, IncidentReport, MaintenanceInvoice, DriverExpense, FuelTransaction } from './types';
import RbacPanel, { SIMULATED_USERS } from './components/RbacPanel';
import DriverPortal from './components/DriverPortal';
import ActionCenter from './components/ActionCenter';
import AuditLogs from './components/AuditLogs';
import DispatchPortal from './components/DispatchPortal';
import PayrollPortal from './components/PayrollPortal';
import DriverProfileModal from './components/DriverProfileModal';
import CompanySettingsModal from './components/CompanySettingsModal';
import SafetyRiskHeatmap from './components/SafetyRiskHeatmap';
import SafetyRiskTrendChart from './components/SafetyRiskTrendChart';
import SafetyHub from './components/SafetyHub';

// Helper for days difference
const getDaysDifference = (expiryStr: string) => {
  const expiry = new Date(expiryStr);
  const today = new Date('2026-05-24'); // Match mock timestamp
  expiry.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Auto-recalculate compliance based on expiry dates
const calcStatus = (cdlDate: string, medDate: string): ComplianceStatus => {
  const cdlDays = getDaysDifference(cdlDate);
  const medDays = getDaysDifference(medDate);
  const minDays = Math.min(cdlDays, medDays);
  if (minDays < 0) return 'NON-COMPLIANT';
  if (minDays <= 30) return 'Warning';
  return 'Compliant';
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [safetySubTab, setSafetySubTab] = useState<'credentials' | 'risk' | 'violations' | 'renewals' | 'vehicles'>('credentials');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus[]>(['Compliant', 'Warning', 'NON-COMPLIANT']);
  
  // Viewport mode: 'auto' (fluid responsive), 'desktop' (enforce desktop), 'mobile' (enforce mobile phone view)
  const [viewportMode, setViewportMode] = useState<'auto' | 'desktop' | 'mobile'>(() => {
    const saved = localStorage.getItem('fg_viewport_mode');
    return (saved === 'desktop' || saved === 'mobile' || saved === 'auto') ? saved : 'auto';
  });

  useEffect(() => {
    localStorage.setItem('fg_viewport_mode', viewportMode);
  }, [viewportMode]);

  // --- Session Role State ---
  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    const saved = localStorage.getItem('fg_currentUser');
    if (saved) {
      const u = JSON.parse(saved);
      if (!u.name?.toLowerCase().includes('nikola')) return u;
    }
    return SIMULATED_USERS[0]; // Admin by default
  });

  // --- Drivers Master State (purges any lingering Nikola from previous caches) ---
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem('fg_drivers');
    if (saved) {
      const parsed: Driver[] = JSON.parse(saved);
      return parsed.filter(d => !d.name.toLowerCase().includes('nikola'));
    }
    return MOCK_DRIVERS;
  });

  // --- Vehicles Master State ---
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('fg_vehicles');
    return saved ? JSON.parse(saved) : MOCK_VEHICLES;
  });

  // --- Renewal requests state ---
  const [renewalRequests, setRenewalRequests] = useState<RenewalRequest[]>(() => {
    const saved = localStorage.getItem('fg_renewals');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'REQ-1', driverId: 'D2', driverName: 'James Wilson', type: 'CDL', requestedValue: '2027-04-10', status: 'Pending', submittedAt: '2026-05-24 11:20' },
      { id: 'REQ-2', driverId: 'D5', driverName: 'Linda Garcia', type: 'Medical Cert', requestedValue: '2027-10-30', status: 'Approved', submittedAt: '2026-05-24 12:45' }
    ];
  });

  // --- Security Audit Log items ---
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('fg_audit_logs');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'L-1', timestamp: '2026-05-24 10:00', userId: 'system', userName: 'FATCA-10 DOT Gateway', role: 'Safety Manager & CEO', action: 'System initialization', details: 'Enforced encryption keys and linked csv rosters.', type: 'security' },
      { id: 'L-2', timestamp: '2026-05-24 11:00', userId: 'system', userName: 'FATCA-10 DOT Gateway', role: 'Safety Manager & CEO', action: 'Enforced security rules', details: 'Segregated drivers accounts to avoid data leakages.', type: 'security' },
      { id: 'L-3', timestamp: '2026-05-24 14:10', userId: 'admin-alice', userName: 'Alice Vance', role: 'Safety Manager & CEO', action: 'Secure login initialized', details: 'Alice Vance authorized with Safety Manager & CEO privileges.', type: 'security' }
    ];
  });

  // --- Shipping Loads State ---
  const [loads, setLoads] = useState<DispatchLoad[]>(() => {
    const saved = localStorage.getItem('fg_loads');
    if (saved) {
      const parsed: DispatchLoad[] = JSON.parse(saved);
      return parsed.map(l => l.driverName.toLowerCase().includes('nikola') ? { ...l, driverId: 'D5', driverName: 'Linda Garcia' } : l);
    }
    return [
      { id: 'LD-1', loadNumber: 'LD-3942', originHub: 'Chicago, IL', destinationHub: 'New York, NY', calculatedMiles: 712, driverId: 'D2', driverName: 'James Wilson', truckId: 'TRK-202', ratePerMile: 2.60, payout: 1851.20, status: 'Dispatched', cargoType: 'Refrigerated Food', weightLbs: 38000, submittedAt: '2026-05-24 10:15' },
      { id: 'LD-2', loadNumber: 'LD-2051', originHub: 'Dallas, TX', destinationHub: 'Los Angeles, CA', calculatedMiles: 1400, driverId: 'D5', driverName: 'Linda Garcia', truckId: 'TRK-101', ratePerMile: 3.10, payout: 4340.00, status: 'Active', cargoType: 'Electronics Secure', weightLbs: 15500, submittedAt: '2026-05-24 11:30' },
      { id: 'LD-3', loadNumber: 'LD-8103', originHub: 'Miami, FL', destinationHub: 'Atlanta, GA', calculatedMiles: 660, driverId: 'Unassigned', driverName: 'Unassigned', truckId: 'None', ratePerMile: 2.15, payout: 1419.00, status: 'Pending', cargoType: 'Dry Van General', weightLbs: 24000, submittedAt: '2026-05-24 12:45' }
    ];
  });

  // --- Weekly Pay Stubs Master State ---
  const [payStubs, setPayStubs] = useState<PayStub[]>(() => {
    const saved = localStorage.getItem('fg_paystubs');
    if (saved) {
      const parsed: PayStub[] = JSON.parse(saved);
      return parsed.map(p => p.driverName.toLowerCase().includes('nikola') ? { ...p, driverId: 'D5', driverName: 'Linda Garcia' } : p);
    }
    return [
      {
        id: 'PS-1',
        driverId: 'D2',
        driverName: 'James Wilson',
        weekEndingDate: '2026-05-30',
        loadIds: ['LD-1'],
        totalMiles: 712,
        grossAmount: 1851.20,
        status: 'Approved',
        issuedAt: '2026-05-24 10:15'
      },
      {
        id: 'PS-2',
        driverId: 'D5',
        driverName: 'Linda Garcia',
        weekEndingDate: '2026-05-30',
        loadIds: ['LD-2'],
        totalMiles: 1400,
        grossAmount: 4340.00,
        status: 'Pending Review',
        issuedAt: '2026-05-24 11:30'
      }
    ];
  });

  // Company Details State
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
    const saved = localStorage.getItem('fg_company_info');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_COMPANY_INFO;
  });

  // Roadside Incidents State
  const [incidents, setIncidents] = useState<IncidentReport[]>(() => {
    const saved = localStorage.getItem('fg_incidents');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return MOCK_INCIDENTS;
  });

  // Maintenance Invoices State (for Unit Invoices upload)
  const [maintenanceInvoices, setMaintenanceInvoices] = useState<MaintenanceInvoice[]>(() => {
    const saved = localStorage.getItem('fg_maintenance_invoices');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return MOCK_MAINTENANCE_INVOICES;
  });

  // Driver Expenses State (Scales, Lumpers, Tolls, Washouts)
  const [driverExpenses, setDriverExpenses] = useState<DriverExpense[]>(() => {
    const saved = localStorage.getItem('fg_driver_expenses');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return MOCK_DRIVER_EXPENSES;
  });

  // Fleet Fuel Account Transactions (from CSV uploads)
  const [fuelTransactions, setFuelTransactions] = useState<FuelTransaction[]>(() => {
    const saved = localStorage.getItem('fg_fuel_transactions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return MOCK_FUEL_TRANSACTIONS;
  });

  // Forecasting simulation state
  const [fleetPaceMultiplier, setFleetPaceMultiplier] = useState<number>(1.0);

  // Modals state
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);

  // New Driver Form State
  const [newDriverData, setNewDriverData] = useState({
    name: '',
    cdlExpiry: '',
    medCertExpiry: '',
    truckId: '',
    criticalViolations: 0,
    taxClassification: 'W2' as TaxClassification,
    phone: '',
    email: '',
    ssnEin: ''
  });

  // New Vehicle Form State
  const [newVehicleData, setNewVehicleData] = useState({
    unitNumber: '',
    vin: '',
    inspectionExpiry: '',
    maintenanceStatus: 'Up to Date' as any,
    mileage: 50000,
    lastInspectionMileage: 45000,
    inspectionIntervalMiles: 10000,
    averageMonthlyMiles: 3000
  });

  // --- Persist States to Local Storage ---
  useEffect(() => {
    localStorage.setItem('fg_currentUser', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('fg_drivers', JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem('fg_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('fg_renewals', JSON.stringify(renewalRequests));
  }, [renewalRequests]);

  useEffect(() => {
    localStorage.setItem('fg_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('fg_loads', JSON.stringify(loads));
  }, [loads]);

  useEffect(() => {
    localStorage.setItem('fg_paystubs', JSON.stringify(payStubs));
  }, [payStubs]);

  useEffect(() => {
    localStorage.setItem('fg_company_info', JSON.stringify(companyInfo));
  }, [companyInfo]);

  useEffect(() => {
    localStorage.setItem('fg_incidents', JSON.stringify(incidents));
  }, [incidents]);

  // Count active unresolved roadside incidents
  const activeIncidentsCount = useMemo(() => {
    return incidents.filter(i => i.status !== 'Resolved / Cleared').length;
  }, [incidents]);

  // Adjust active tab based on active user role
  useEffect(() => {
    if (currentUser.role === 'Driver') {
      setActiveTab('portal');
    } else if (currentUser.role === 'Dispatcher') {
      setActiveTab('dispatch');
    } else if (activeTab === 'portal' || activeTab === 'dispatch') {
      setActiveTab('overview');
    }
  }, [currentUser]);

  // --- Log Security Action Utility ---
  const logSecurityAction = (action: string, details: string, type: 'security' | 'data_edit' | 'approval' | 'incident') => {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newLog: AuditLogEntry = {
      id: `L-${Date.now()}`,
      timestamp,
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action,
      details,
      type
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // --- Roadside Incident Handlers ---
  const handleReportIncident = (incidentData: Omit<IncidentReport, 'id' | 'reportedAt' | 'status'>) => {
    const newIncidentId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const reportedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newIncident: IncidentReport = {
      ...incidentData,
      id: newIncidentId,
      reportedAt,
      status: 'Open - Dispatch Action Required'
    };

    setIncidents(prev => [newIncident, ...prev]);

    // Automatically generate an entry in the Audit Trail
    logSecurityAction(
      `ROADSIDE INCIDENT REPORTED (${newIncident.type.toUpperCase()})`,
      `Driver ${incidentData.driverName} reported roadside incident ${newIncidentId} (${incidentData.type}, Severity: ${incidentData.severity}) at location "${incidentData.location}". Drivable: ${incidentData.isVehicleDrivable ? 'Yes' : 'No'}, Injuries: ${incidentData.injuriesReported ? 'Yes' : 'No'}. Dispatched alert triggered across Dispatch Board.`,
      'incident'
    );
  };

  const handleUpdateIncident = (
    incidentId: string, 
    status: IncidentReport['status'], 
    dispatchNotes?: string, 
    serviceVendor?: string, 
    etaMinutes?: number
  ) => {
    const now = new Date();
    const resolvedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setIncidents(prev => prev.map(inc => {
      if (inc.id !== incidentId) return inc;
      return {
        ...inc,
        status,
        dispatchNotes: dispatchNotes !== undefined ? dispatchNotes : inc.dispatchNotes,
        serviceVendor: serviceVendor !== undefined ? serviceVendor : inc.serviceVendor,
        etaMinutes: etaMinutes !== undefined ? etaMinutes : inc.etaMinutes,
        resolvedAt: status === 'Resolved / Cleared' ? (inc.resolvedAt || resolvedTimestamp) : inc.resolvedAt
      };
    }));

    // Log coordination update into Audit Trail
    logSecurityAction(
      `INCIDENT DISPATCH COORDINATED (${incidentId})`,
      `Status transitioned to "${status}". Assigned Service Vendor: "${serviceVendor || 'None'}", ETA: ${etaMinutes ? `${etaMinutes}m` : 'N/A'}. Dispatcher Notes: "${dispatchNotes || 'Updated'}".`,
      'incident'
    );
  };

  // Switch simulated users
  const handleUserChange = (newUser: UserSession) => {
    setCurrentUser(newUser);
    // Log login change
    const details = `${newUser.name} authenticated into dashboard workspace.`;
    const newLog: AuditLogEntry = {
      id: `L-${Date.now()}`,
      timestamp: '2026-05-24 14:14',
      userId: newUser.id,
      userName: newUser.name,
      role: newUser.role,
      action: 'Secure SSO Login Switch',
      details,
      type: 'security'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Centralized Tab Router
  const handleNavigateToTab = (tab: string, sub?: 'credentials' | 'risk' | 'violations' | 'renewals' | 'vehicles') => {
    if (tab === 'drivers') {
      setActiveTab('safety');
      setSafetySubTab('credentials');
    } else if (tab === 'vehicles') {
      setActiveTab('safety');
      setSafetySubTab('vehicles');
    } else if (tab === 'inbox') {
      setActiveTab('safety');
      setSafetySubTab('renewals');
    } else if (tab === 'payroll') {
      setActiveTab('accounting');
    } else {
      setActiveTab(tab);
      if (sub) {
        setSafetySubTab(sub);
      }
    }
    setIsMobileMenuOpen(false);
  };

  // Reset demo state
  const handleResetDemo = () => {
    if (confirm('Are you sure you want to restore default demo credentials?')) {
      localStorage.removeItem('fg_drivers');
      localStorage.removeItem('fg_vehicles');
      localStorage.removeItem('fg_renewals');
      localStorage.removeItem('fg_audit_logs');
      localStorage.removeItem('fg_paystubs');
      localStorage.removeItem('fg_loads');
      setDrivers(MOCK_DRIVERS);
      setVehicles(MOCK_VEHICLES);
      setRenewalRequests([
        { id: 'REQ-1', driverId: 'D2', driverName: 'James Wilson', type: 'CDL', requestedValue: '2027-04-10', status: 'Pending', submittedAt: '2026-05-24 11:20' },
        { id: 'REQ-2', driverId: 'D5', driverName: 'Linda Garcia', type: 'Medical Cert', requestedValue: '2027-10-30', status: 'Approved', submittedAt: '2026-05-24 12:45' }
      ]);
      setLoads([
        { id: 'LD-1', loadNumber: 'LD-3942', originHub: 'Chicago, IL', destinationHub: 'New York, NY', calculatedMiles: 712, driverId: 'D2', driverName: 'James Wilson', truckId: 'TRK-202', ratePerMile: 2.60, payout: 1851.20, status: 'Dispatched', cargoType: 'Refrigerated Food', weightLbs: 38000, submittedAt: '2026-05-24 10:15' },
        { id: 'LD-2', loadNumber: 'LD-2051', originHub: 'Dallas, TX', destinationHub: 'Los Angeles, CA', calculatedMiles: 1400, driverId: 'D5', driverName: 'Linda Garcia', truckId: 'TRK-101', ratePerMile: 3.10, payout: 4340.00, status: 'Active', cargoType: 'Electronics Secure', weightLbs: 15500, submittedAt: '2026-05-24 11:30' },
        { id: 'LD-3', loadNumber: 'LD-8103', originHub: 'Miami, FL', destinationHub: 'Atlanta, GA', calculatedMiles: 660, driverId: 'Unassigned', driverName: 'Unassigned', truckId: 'None', ratePerMile: 2.15, payout: 1419.00, status: 'Pending', cargoType: 'Dry Van General', weightLbs: 24000, submittedAt: '2026-05-24 12:45' }
      ]);
      setPayStubs([
        {
          id: 'PS-1',
          driverId: 'D2',
          driverName: 'James Wilson',
          weekEndingDate: '2026-05-30',
          loadIds: ['LD-1'],
          totalMiles: 712,
          grossAmount: 1851.20,
          status: 'Approved',
          issuedAt: '2026-05-24 10:15'
        },
        {
          id: 'PS-2',
          driverId: 'D5',
          driverName: 'Linda Garcia',
          weekEndingDate: '2026-05-30',
          loadIds: ['LD-2'],
          totalMiles: 1400,
          grossAmount: 4340.00,
          status: 'Pending Review',
          issuedAt: '2026-05-24 11:30'
        }
      ]);
      setAuditLogs([
        { id: 'L-1', timestamp: '2026-05-24 10:00', userId: 'system', userName: 'FATCA-10 DOT Gateway', role: 'Safety Manager & CEO', action: 'System initialization', details: 'Enforced encryption keys and linked csv rosters.', type: 'security' },
        { id: 'L-2', timestamp: '2026-05-24 11:20', userId: 'admin-alice', userName: 'Alice Vance', role: 'Safety Manager & CEO', action: 'Secured state re-establishment', details: 'Reset configurations to base mock parameters.', type: 'security' }
      ]);
    }
  };

  // Filter Driver matching currentUser if Driver role is active
  const activeDriverScope = useMemo(() => {
    if (currentUser.role !== 'Driver') return null;
    return drivers.find(d => d.id === currentUser.driverId) || drivers[0];
  }, [drivers, currentUser]);

  // Calculations for current general view
  const fleetHealthScore = useMemo(() => {
    const total = drivers.length;
    if (total === 0) return 100;
    const compliant = drivers.filter(d => d.overallStatus === 'Compliant').length;
    return Math.round((compliant / total) * 100);
  }, [drivers]);

  const expiredDocsCount = useMemo(() => 
    drivers.filter(d => d.overallStatus === 'NON-COMPLIANT').length, 
  [drivers]);

  const complianceData = useMemo(() => [
    { name: 'Compliant', value: drivers.filter(d => d.overallStatus === 'Compliant').length, color: '#10b981' },
    { name: 'Warning', value: drivers.filter(d => d.overallStatus === 'Warning').length, color: '#f59e0b' },
    { name: 'NON-COMPLIANT', value: drivers.filter(d => d.overallStatus === 'NON-COMPLIANT').length, color: '#f43f5e' },
  ], [drivers]);

  // Calculations for Fleet Maintenance Mileage-Based Forecasting
  const fleetForecastAnalysis = useMemo(() => {
    let criticalCount = 0;
    let warningCount = 0;
    let compliantCount = 0;
    let totalMonthlyMiles = 0;
    let totalRemainingMiles = 0;
    let validVehiclesCount = 0;

    const items = vehicles.map(v => {
      const current = v.mileage ?? 50000;
      const last = v.lastInspectionMileage ?? 45000;
      const limit = v.inspectionIntervalMiles ?? 10000;
      const rate = (v.averageMonthlyMiles ?? 3000) * fleetPaceMultiplier;

      const diff = current - last;
      const remains = limit - diff;
      const isOverdue = diff >= limit || remains <= 0;
      
      const monthsLeft = rate > 0 ? (isOverdue ? 0 : remains / rate) : 120; // 10 years fallback if idle

      if (isOverdue) {
        criticalCount++;
      } else if (remains < 1500 || monthsLeft <= 1.0) {
        warningCount++;
      } else {
        compliantCount++;
      }

      totalMonthlyMiles += rate;
      totalRemainingMiles += isOverdue ? 0 : remains;
      validVehiclesCount++;

      return {
        ...v,
        currentMileage: current,
        lastCheck: last,
        interval: limit,
        monthlyRate: rate,
        traveledSinceCheck: diff,
        remainingMiles: remains,
        overdue: isOverdue,
        monthsRemaining: monthsLeft,
        risk: isOverdue ? 'critical' : (remains < 1500 || monthsLeft <= 1.0 ? 'warning' : 'compliant') as 'critical' | 'warning' | 'compliant'
      };
    });

    const averageRemainingMiles = validVehiclesCount > 0 ? Math.round(totalRemainingMiles / validVehiclesCount) : 0;

    return {
      items,
      criticalCount,
      warningCount,
      compliantCount,
      totalMonthlyMiles,
      averageRemainingMiles
    };
  }, [vehicles, fleetPaceMultiplier]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => 
      statusFilter.includes(d.overallStatus) &&
      (d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.truckId.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [drivers, statusFilter, searchQuery]);

  // --- Driver Portal Handlers ---
  const handleDriverRenewalSubmit = (type: 'CDL' | 'Medical Cert', date: string) => {
    if (!activeDriverScope) return;
    const newReq: RenewalRequest = {
      id: `REQ-${Date.now()}`,
      driverId: activeDriverScope.id,
      driverName: activeDriverScope.name,
      type,
      requestedValue: date,
      status: 'Pending',
      submittedAt: '2026-05-24 14:14'
    };
    setRenewalRequests(prev => [newReq, ...prev]);
    logSecurityAction(
      'Document Filing',
      `${activeDriverScope.name} uploaded renewal cert for ${type} expiring ${date}.`,
      'approval'
    );
  };

  const handleAlertRenewalSubmit = (driverId: string, type: 'CDL' | 'Medical Cert', date: string) => {
    const targetDriver = drivers.find(d => d.id === driverId);
    const driverName = targetDriver ? targetDriver.name : currentUser.name;
    const newReq: RenewalRequest = {
      id: `REQ-${Date.now()}`,
      driverId,
      driverName,
      type,
      requestedValue: date,
      status: 'Pending',
      submittedAt: '2026-05-24 14:14'
    };
    setRenewalRequests(prev => [newReq, ...prev]);
    logSecurityAction(
      'Document Filing',
      `${driverName} submitted renewal for ${type} (New Proposed Expiry: ${date}).`,
      'approval'
    );
  };

  const handleDriverIssueSubmit = (details: string) => {
    if (!activeDriverScope) return;
    // Auto flag truck as Scheduled for repair
    const updatedVehicles = vehicles.map(v => {
      if (v.unitNumber === activeDriverScope.truckId) {
        return { ...v, maintenanceStatus: 'Scheduled' as const };
      }
      return v;
    });
    setVehicles(updatedVehicles);

    const newReq: RenewalRequest = {
      id: `REQ-${Date.now()}`,
      driverId: activeDriverScope.id,
      driverName: activeDriverScope.name,
      type: 'Vehicle Issue',
      requestedValue: details,
      status: 'Pending',
      submittedAt: '2026-05-24 14:14'
    };
    setRenewalRequests(prev => [newReq, ...prev]);
    logSecurityAction(
      'Report Mechanical Defect',
      `${activeDriverScope.name} logged DVIR statement: "${details}" on assignment ${activeDriverScope.truckId}.`,
      'data_edit'
    );
  };

  // --- Inbox Approvals Action Handlers ---
  const handleApproveRequest = (id: string) => {
    const req = renewalRequests.find(r => r.id === id);
    if (!req) return;

    // Apply integration to driver records
    let targetDetails = '';
    if (req.type === 'Vehicle Issue') {
      // Flagged as Up to date or Scheduled
      setVehicles(prev => prev.map(v => {
        const d = drivers.find(driver => driver.id === req.driverId);
        if (d && v.unitNumber === d.truckId) {
          return { ...v, maintenanceStatus: 'Scheduled', overallStatus: 'Compliant' as const };
        }
        return v;
      }));
      targetDetails = `Approved mechanical inspection and scheduled maintenance for truck matching user ${req.driverName}.`;
    } else {
      // Update Driver Expiries
      setDrivers(prev => prev.map(d => {
        if (d.id === req.driverId) {
          const nextCdl = req.type === 'CDL' ? (req.requestedValue || d.cdlExpiry) : d.cdlExpiry;
          const nextMed = req.type === 'Medical Cert' ? (req.requestedValue || d.medCertExpiry) : d.medCertExpiry;
          const nextStatus = calcStatus(nextCdl, nextMed);
          return {
            ...d,
            cdlExpiry: nextCdl,
            medCertExpiry: nextMed,
            overallStatus: nextStatus
          };
        }
        return d;
      }));
      targetDetails = `Authorized Driver ${req.driverName}'s regulatory credentials updating ${req.type} Expiry to ${req.requestedValue}.`;
    }

    setRenewalRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
    logSecurityAction(
      'Approve Compliance Request',
      targetDetails,
      'approval'
    );
  };

  const handleDeclineRequest = (id: string) => {
    const req = renewalRequests.find(r => r.id === id);
    if (!req) return;

    setRenewalRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Declined' } : r));
    logSecurityAction(
      'Decline Compliance Request',
      `Audit officer rejected ${req.type} credentials renewal filed by ${req.driverName}.`,
      'approval'
    );
  };

  // Helper for week ending Saturday
  const getWeekEndingSaturday = (dateStr: string): string => {
    try {
      const d = new Date(dateStr.split(' ')[0]);
      if (isNaN(d.getTime())) return '2026-05-30';
      const day = d.getDay(); // 0 is Sunday, 6 is Saturday
      const daysToAdd = 6 - day;
      d.setDate(d.getDate() + daysToAdd);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateVal = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${dateVal}`;
    } catch {
      return '2026-05-30';
    }
  };

  // --- Shipping Loads Logic Handlers ---
  const handleCreateLoad = (newLoadData: Omit<DispatchLoad, 'id' | 'submittedAt'>) => {
    const timeNow = '2026-05-24 14:14';
    const newLoad: DispatchLoad = {
      ...newLoadData,
      id: `LD-${Date.now()}`,
      submittedAt: timeNow
    };

    setLoads(prev => [newLoad, ...prev]);
    logSecurityAction(
      'Create Cargo Contract',
      `Dispatcher created freight load ${newLoad.loadNumber} (Origin: ${newLoad.originHub} → Dest: ${newLoad.destinationHub}), assigned driver: ${newLoad.driverName}.`,
      'data_edit'
    );

    // Create / Accumulate Pay Stub automatically!
    if (newLoad.driverId && newLoad.driverId !== 'Unassigned') {
      const weekEnding = getWeekEndingSaturday(timeNow);
      
      setPayStubs(prev => {
        const existingIdx = prev.findIndex(ps => ps.driverId === newLoad.driverId && ps.weekEndingDate === weekEnding);
        
        if (existingIdx > -1) {
          const updated = [...prev];
          const curr = updated[existingIdx];
          updated[existingIdx] = {
            ...curr,
            loadIds: [...curr.loadIds, newLoad.id],
            totalMiles: curr.totalMiles + newLoad.calculatedMiles,
            grossAmount: curr.grossAmount + newLoad.payout
          };
          return updated;
        } else {
          const newStub: PayStub = {
            id: `PS-${Date.now()}`,
            driverId: newLoad.driverId,
            driverName: newLoad.driverName,
            weekEndingDate: weekEnding,
            loadIds: [newLoad.id],
            totalMiles: newLoad.calculatedMiles,
            grossAmount: newLoad.payout,
            status: 'Pending Review',
            issuedAt: timeNow
          };
          return [newStub, ...prev];
        }
      });
    }
  };

  const handleUpdateLoadStatus = (id: string, status: DispatchLoad['status']) => {
    setLoads(prev => prev.map(l => {
      if (l.id === id) {
        return { ...l, status };
      }
      return l;
    }));
    
    // Log async logic
    const targetLoad = loads.find(l => l.id === id);
    if (targetLoad) {
      logSecurityAction(
        'Update Cargo Status',
        `Cargo consignment ${targetLoad.loadNumber} state adjusted to "${status}".`,
        'data_edit'
      );
    }
  };

  const handleDeleteLoad = (id: string) => {
    const targetLoad = loads.find(l => l.id === id);
    setLoads(prev => prev.filter(l => l.id !== id));
    
    if (targetLoad) {
      logSecurityAction(
        'Delete Cargo Booking',
        `Dispatcher canceled cargo shipment contract ${targetLoad.loadNumber}.`,
        'data_edit'
      );

      // Decrement or clean up from paystubs automatically!
      setPayStubs(prev => {
        return prev.map(ps => {
          if (ps.loadIds.includes(id)) {
            const updatedLoadIds = ps.loadIds.filter(lid => lid !== id);
            return {
              ...ps,
              loadIds: updatedLoadIds,
              totalMiles: Math.max(0, ps.totalMiles - targetLoad.calculatedMiles),
              grossAmount: Math.max(0, ps.grossAmount - targetLoad.payout)
            };
          }
          return ps;
        }).filter(ps => ps.loadIds.length > 0);
      });
    }
  };

  const handleUpdateLoadDocs = (
    id: string,
    rateConFile?: { name: string; size: number; dataUrl?: string },
    bolFile?: { name: string; size: number; dataUrl?: string },
    invoiceDetails?: DispatchLoad['invoiceDetails']
  ) => {
    setLoads(prev => prev.map(l => {
      if (l.id === id) {
        return {
          ...l,
          rateConFile: rateConFile !== undefined ? rateConFile : l.rateConFile,
          bolFile: bolFile !== undefined ? bolFile : l.bolFile,
          invoiceDetails: invoiceDetails !== undefined ? invoiceDetails : l.invoiceDetails
        };
      }
      return l;
    }));
  };

  const handleUpdateStubStatus = (id: string, status: PayStub['status']) => {
    setPayStubs(prev => prev.map(ps => ps.id === id ? { ...ps, status } : ps));
    logSecurityAction(
      'Update Pay Stub Status',
      `CEO/Safety Manager updated weekly payroll stub ${id} status to "${status}".`,
      'approval'
    );
  };

  // --- Maintenance Unit Invoices Handlers ---
  const handleAddMaintenanceInvoice = (
    invoiceData: Omit<MaintenanceInvoice, 'id' | 'submittedAt'>,
    shouldResetStatus: boolean = true
  ) => {
    const newId = `INV-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newInv: MaintenanceInvoice = {
      ...invoiceData,
      id: newId,
      submittedAt: timestamp
    };

    setMaintenanceInvoices(prev => {
      const next = [newInv, ...prev];
      localStorage.setItem('fg_maintenance_invoices', JSON.stringify(next));
      return next;
    });

    // Automatically update vehicle status and odometer if service was performed
    if (shouldResetStatus && (invoiceData.serviceType === 'Oil Change & PM' || invoiceData.serviceType === 'DOT Annual Periodic Inspection' || invoiceData.serviceType === 'Engine Repair')) {
      setVehicles(prev => {
        const next = prev.map(v => {
          if (v.id === invoiceData.vehicleId) {
            const currentOdo = invoiceData.odometerReading || v.odometer;
            return {
              ...v,
              maintenanceStatus: 'Up to Date' as const,
              odometer: Math.max(v.odometer, currentOdo),
              lastServiceDate: invoiceData.date,
              lastServiceMileage: currentOdo
            };
          }
          return v;
        });
        localStorage.setItem('fg_vehicles', JSON.stringify(next));
        return next;
      });
    }

    logSecurityAction(
      'Maintenance Invoice Recorded',
      `Direct invoice ${newInv.invoiceNumber} ($${newInv.amount.toFixed(2)}) uploaded for vehicle ${newInv.unitNumber} (${newInv.serviceType}). Fleet maintenance ledger updated.`,
      'data_edit'
    );
  };

  const handleDeleteMaintenanceInvoice = (invoiceId: string) => {
    setMaintenanceInvoices(prev => {
      const next = prev.filter(inv => inv.id !== invoiceId);
      localStorage.setItem('fg_maintenance_invoices', JSON.stringify(next));
      return next;
    });
  };

  // --- Driver Out-of-Pocket Expense Handlers (Automatic Payroll Addition) ---
  const handleAddDriverExpense = (expenseData: Omit<DriverExpense, 'id' | 'submittedAt'>) => {
    const newId = `EXP-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newExp: DriverExpense = {
      ...expenseData,
      id: newId,
      submittedAt: timestamp,
      status: 'Approved'
    };

    setDriverExpenses(prev => {
      const next = [newExp, ...prev];
      localStorage.setItem('fg_driver_expenses', JSON.stringify(next));
      return next;
    });

    // Automatically credit onto driver's payroll (paystub)
    setPayStubs(prev => {
      const driverStubIndex = prev.findIndex(ps => ps.driverId === expenseData.driverId && ps.status !== 'Paid');
      if (driverStubIndex >= 0) {
        const updated = [...prev];
        const stub = updated[driverStubIndex];
        updated[driverStubIndex] = {
          ...stub,
          reimbursements: (stub.reimbursements || 0) + expenseData.amount
        };
        localStorage.setItem('fg_paystubs', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });

    logSecurityAction(
      'Driver Expense Uploaded',
      `Driver ${expenseData.driverName} submitted ${expenseData.category} expense of $${expenseData.amount.toFixed(2)} (${expenseData.description}). Automatically added to payroll.`,
      'approval'
    );
  };

  // --- Fuel Account Transactions Import Handler ---
  const handleImportFuelTransactions = (newTransactions: FuelTransaction[]) => {
    setFuelTransactions(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const filteredNew = newTransactions.filter(t => !existingIds.has(t.id));
      const next = [...filteredNew, ...prev];
      localStorage.setItem('fg_fuel_transactions', JSON.stringify(next));
      return next;
    });

    logSecurityAction(
      'Fuel CSV Ingestion',
      `Imported ${newTransactions.length} fuel transactions from fleet fuel card account CSV into corporate accounting ledger.`,
      'data_edit'
    );
  };

  // --- Driver Admin write changes ---
  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'Safety Manager & CEO' && currentUser.role !== 'Administrator') {
      alert('🔒 Authorization Denied: Add driver is restricted to Safety Manager & CEO / Administrator roles.');
      return;
    }
    const newId = `D${drivers.length + 1}`;
    const newDriver: Driver = {
      id: newId,
      name: newDriverData.name,
      cdlExpiry: newDriverData.cdlExpiry,
      medCertExpiry: newDriverData.medCertExpiry,
      truckId: newDriverData.truckId || 'None',
      overallStatus: calcStatus(newDriverData.cdlExpiry, newDriverData.medCertExpiry),
      criticalViolations: Number(newDriverData.criticalViolations),
      isHighRisk: Number(newDriverData.criticalViolations) > 2,
      taxClassification: newDriverData.taxClassification,
      profileInfo: {
        phone: newDriverData.phone || '(312) 555-0192',
        email: newDriverData.email || `${newDriverData.name.toLowerCase().replace(' ', '.')}@fastgatelogistics.com`,
        ssnEin: newDriverData.ssnEin || '331-XX-9812',
        hireDate: new Date().toISOString().split('T')[0],
        operatingStatus: 'Active',
        payRatePerMile: newDriverData.taxClassification === '1099-NEC' ? 0.82 : 0.70
      }
    };

    setDrivers(prev => [...prev, newDriver]);
    setIsAddingDriver(false);
    setNewDriverData({
      name: '',
      cdlExpiry: '',
      medCertExpiry: '',
      truckId: '',
      criticalViolations: 0,
      taxClassification: 'W2',
      phone: '',
      email: '',
      ssnEin: ''
    });
    logSecurityAction(
      'Insert Driver Profile',
      `Administrator created profile ID ${newDriver.id} for ${newDriver.name} with ${newDriver.taxClassification} tax status.`,
      'data_edit'
    );
  };

  const handleSaveEditDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;

    // Permissions logic
    if (currentUser.role === 'Driver') return;

    const original = drivers.find(d => d.id === editingDriver.id);
    if (!original) return;

    // Check what changed and what is permitted
    if (currentUser.role === 'Dispatcher') {
      // Dispatched loads managers can ONLY edit truck assignments
      const isSensitiveChanged = 
        original.name !== editingDriver.name ||
        original.cdlExpiry !== editingDriver.cdlExpiry ||
        original.medCertExpiry !== editingDriver.medCertExpiry ||
        original.criticalViolations !== editingDriver.criticalViolations;

      if (isSensitiveChanged) {
        alert('🔒 Authorization Denied: CDL licenses, Medical exam expirations, and regulatory profiles must be authenticated and altered by a Safety Manager & CEO.');
        return;
      }
    }

    // Save
    setDrivers(prev => prev.map(d => {
      if (d.id === editingDriver.id) {
        const nextStatus = calcStatus(editingDriver.cdlExpiry, editingDriver.medCertExpiry);
        return {
          ...editingDriver,
          overallStatus: nextStatus,
          isHighRisk: editingDriver.criticalViolations > 2
        };
      }
      return d;
    }));

    setEditingDriver(null);
    logSecurityAction(
      'Update Roster Profile',
      `Modified record for ${editingDriver.name}. Assignment set to ${editingDriver.truckId}.`,
      'data_edit'
    );
  };

  const handleDeleteDriver = (id: string) => {
    const driver = drivers.find(d => d.id === id);
    if (!driver) return;

    if (currentUser.role !== 'Administrator') {
      alert('🔒 Access Denied: Profile delete requires Administrator level privileges.');
      return;
    }

    if (confirm(`Remove driver ${driver.name} permanently from security rosters?`)) {
      setDrivers(prev => prev.filter(d => d.id !== id));
      logSecurityAction(
        'Delete Driver Profile',
        `Permanent erasure of driver ID ${id} (${driver.name}) requested by Administrator.`,
        'security'
      );
    }
  };

  // --- Vehicle Admin write changes ---
  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'Administrator') {
      alert('🔒 Authorization Denied: Adding vehicle fleet registry is restricted to Administrators.');
      return;
    }

    const calculatedStatus: ComplianceStatus = getDaysDifference(newVehicleData.inspectionExpiry) < 0 ? 'NON-COMPLIANT' : 'Compliant';

    const newVeh: Vehicle = {
      id: `V${Date.now()}`,
      unitNumber: newVehicleData.unitNumber,
      vin: newVehicleData.vin,
      inspectionExpiry: newVehicleData.inspectionExpiry,
      overallStatus: calculatedStatus,
      maintenanceStatus: newVehicleData.maintenanceStatus,
      mileage: Number(newVehicleData.mileage) || 0,
      lastInspectionMileage: Number(newVehicleData.lastInspectionMileage) || 0,
      inspectionIntervalMiles: Number(newVehicleData.inspectionIntervalMiles) || 10000,
      averageMonthlyMiles: Number(newVehicleData.averageMonthlyMiles) || 3000
    };

    setVehicles(prev => [...prev, newVeh]);
    setIsAddingVehicle(false);
    setNewVehicleData({
      unitNumber: '',
      vin: '',
      inspectionExpiry: '',
      maintenanceStatus: 'Up to Date',
      mileage: 50000,
      lastInspectionMileage: 45000,
      inspectionIntervalMiles: 10000,
      averageMonthlyMiles: 3000
    });
    logSecurityAction(
      'Insert Fleet Equipment',
      `Registered unit ${newVeh.unitNumber} (${newVeh.vin}) into database with mileage ${newVeh.mileage} miles.`,
      'data_edit'
    );
  };

  const handleSaveEditVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    // Both Admin and Fleet Manager are permitted to edit vehicle records
    const calculatedStatus: ComplianceStatus = getDaysDifference(editingVehicle.inspectionExpiry) < 0 ? 'NON-COMPLIANT' : 'Compliant';

    setVehicles(prev => prev.map(v => {
      if (v.id === editingVehicle.id) {
        return {
          ...editingVehicle,
          overallStatus: calculatedStatus
        };
      }
      return v;
    }));

    setEditingVehicle(null);
    logSecurityAction(
      'Update Equipment Details',
      `Modified unit ${editingVehicle.unitNumber}. Inspection slated for ${editingVehicle.inspectionExpiry} (${editingVehicle.maintenanceStatus}).`,
      'data_edit'
    );
  };

  const handleDeleteVehicle = (id: string) => {
    const veh = vehicles.find(v => v.id === id);
    if (!veh) return;

    if (currentUser.role !== 'Administrator') {
      alert('🔒 Access Denied: Erasing heavy fleet assets from database requires Administrator authorization.');
      return;
    }

    if (confirm(`Remove vehicle unit ${veh.unitNumber} from fleet indices?`)) {
      setVehicles(prev => prev.filter(v => v.id !== id));
      logSecurityAction(
        'Delete Vehicle Equipment',
        `Asset registers for unit ${veh.unitNumber} purged by Administrator.`,
        'security'
      );
    }
  };

  // Status Badge visual styles
  const StatusBadge = ({ status }: { status: ComplianceStatus }) => {
    const styles = {
      'Compliant': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      'Warning': 'bg-amber-100 text-amber-800 border-amber-300',
      'NON-COMPLIANT': 'bg-rose-100 text-rose-800 border-rose-300',
    };
    
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border uppercase tracking-wider ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getComplianceText = (status: ComplianceStatus) => {
    switch (status) {
      case 'Compliant': return 'Up to Date / Cleared';
      case 'Warning': return 'Expiring Inside 30 Days';
      case 'NON-COMPLIANT': return 'EXPIRED / DEBARRED';
    }
  };

  const pendingRequestsCount = useMemo(() => renewalRequests.filter(r => r.status === 'Pending').length, [renewalRequests]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Dynamic Security & SSO Context Bar */}
      <RbacPanel 
        currentUser={currentUser} 
        onUserChange={handleUserChange} 
        pendingInboxCount={pendingRequestsCount}
        drivers={drivers}
        renewalRequests={renewalRequests}
        onInspectDriver={(driver) => setEditingDriver(driver)}
        onNavigateToTab={handleNavigateToTab}
        onSubmitRenewal={handleAlertRenewalSubmit}
        onLogSecurityAction={logSecurityAction}
        viewportMode={viewportMode}
        onViewportModeChange={setViewportMode}
      />

      {/* Viewport Simulation Banner (when explicitly forcing mobile or desktop) */}
      {viewportMode !== 'auto' && (
        <div className="bg-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 font-mono">
            {viewportMode === 'mobile' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold uppercase tracking-wider text-emerald-300">📱 Mobile Handheld Viewport Active</span>
                <span className="text-slate-400 hidden sm:inline">— Previewing smartphone touch-optimized UI</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="font-bold uppercase tracking-wider text-blue-300">🖥️ Desktop Viewport Enforced</span>
                <span className="text-slate-400 hidden sm:inline">— Full wide dashboard layout & sidebars</span>
              </>
            )}
          </div>
          <button
            onClick={() => setViewportMode('auto')}
            className="text-[11px] font-bold underline text-slate-300 hover:text-white transition-colors"
          >
            Reset to Auto
          </button>
        </div>
      )}

      {/* Main Core Container */}
      <div className={`flex flex-1 ${viewportMode === 'desktop' ? 'flex-row' : viewportMode === 'mobile' ? 'flex-col max-w-md mx-auto w-full border-x border-slate-200 shadow-sm' : 'flex-col lg:flex-row'} relative`}>
        
        {/* Mobile Slide-Over Backdrop Overlay */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
            aria-label="Close menu backdrop"
          />
        )}

        {/* Mobile Top App Bar (Thumb-Accessible Header) */}
        <div className={`${viewportMode === 'desktop' ? 'hidden' : 'lg:hidden'} bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs sticky top-0 z-30`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-base shadow-xs">🛡️</div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900">FleetGuard</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-bold uppercase tracking-wider border border-blue-200">
                  {activeTab === 'overview' ? 'Overview' : activeTab === 'safety' ? 'Safety' : activeTab === 'dispatch' ? 'Dispatch' : activeTab === 'accounting' ? 'Payroll' : activeTab === 'logs' ? 'Logs' : 'Portal'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Logged in as {currentUser.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Viewport switch fast icon */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[10px]">
              <button
                type="button"
                onClick={() => setViewportMode(viewportMode === 'mobile' ? 'auto' : 'mobile')}
                className={`p-1.5 rounded-md font-bold transition-all ${viewportMode === 'mobile' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                title="Toggle Mobile View"
              >
                <Smartphone size={13} />
              </button>
              <button
                type="button"
                onClick={() => setViewportMode(viewportMode === 'desktop' ? 'auto' : 'desktop')}
                className={`p-1.5 rounded-md font-bold transition-all ${viewportMode === 'desktop' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                title="Toggle Desktop View"
              >
                <Monitor size={13} />
              </button>
            </div>

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <aside className={`
          bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-all duration-300 z-50
          fixed inset-y-0 left-0 w-72 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          ${viewportMode === 'desktop' ? 'lg:relative lg:translate-x-0 lg:w-64' : viewportMode === 'mobile' ? (isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full') : 'lg:relative lg:translate-x-0 lg:w-64'} 
          shrink-0 shadow-2xl lg:shadow-none
        `}>
          <div className="p-6 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg">🛡️</div>
              <div>
                <h1 className="text-white font-extrabold text-sm leading-tight uppercase tracking-wider">FleetGuard</h1>
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mt-0.5">RBAC Portal</p>
              </div>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 border-b border-slate-800/60 bg-slate-950/40">
            <div className="flex items-center gap-2.5 text-xs">
              <Fingerprint size={14} className="text-blue-500 shrink-0" />
              <div>
                <p className="font-bold text-white leading-none">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-none">Security Level {
                  currentUser.role === 'Safety Manager & CEO' ? '3' :
                  currentUser.role === 'Dispatcher' ? '2' : '1'
                }</p>
              </div>
            </div>
          </div>

          {/* Navigation Items (Categorized Clean Architecture) */}
          <nav className="flex-1 p-4 space-y-1.5 font-sans overflow-y-auto">
            {currentUser.role !== 'Driver' ? (
              <>
                <button 
                  onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <LayoutDashboard size={14} /> Executive Overview
                </button>
                <button 
                  onClick={() => { handleNavigateToTab('safety'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'safety' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <span className="flex items-center gap-3">
                    <ShieldAlert size={14} /> Safety & Compliance
                  </span>
                  {(expiredDocsCount > 0 || pendingRequestsCount > 0) && (
                    <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      {expiredDocsCount + pendingRequestsCount}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => { handleNavigateToTab('dispatch'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'dispatch' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <span className="flex items-center gap-3">
                    <Compass size={14} /> Dispatch & Operations
                  </span>
                  {activeIncidentsCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      🚨 {activeIncidentsCount}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => { handleNavigateToTab('accounting'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'accounting' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <span className="flex items-center gap-3">
                    <DollarSign size={14} /> Accounting & Payroll
                  </span>
                  {payStubs.filter(s => s.status === 'Pending Review').length > 0 && (
                    <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                      {payStubs.filter(s => s.status === 'Pending Review').length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => { setActiveTab('logs'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <Fingerprint size={14} /> Audit Trail & Logs
                </button>
                <button 
                  onClick={() => { setIsEditingCompany(true); setIsMobileMenuOpen(false); }} 
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider bg-slate-800/80 hover:bg-slate-800 text-indigo-300 border border-slate-700/60 mt-2"
                  title="Configure company legal details, USDOT#, FEIN tax ID, address, and bank accounts"
                >
                  <span className="flex items-center gap-3">
                    <Building2 size={14} className="text-indigo-400" /> Company Profile
                  </span>
                  <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-mono font-bold">SETUP</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => { setActiveTab('portal'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'portal' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <Fingerprint size={14} /> My Profile Desk
                </button>
              </>
            )}
          </nav>

          {/* Quick-switch details to restore default values */}
          <div className="p-4 border-t border-slate-800 space-y-4">
            {/* Viewport switcher inside drawer */}
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Display Version</p>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-md text-[10px] font-bold">
                <button
                  onClick={() => { setViewportMode('auto'); setIsMobileMenuOpen(false); }}
                  className={`py-1 rounded text-center transition-colors ${viewportMode === 'auto' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Auto
                </button>
                <button
                  onClick={() => { setViewportMode('desktop'); setIsMobileMenuOpen(false); }}
                  className={`py-1 rounded text-center transition-colors ${viewportMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => { setViewportMode('mobile'); setIsMobileMenuOpen(false); }}
                  className={`py-1 rounded text-center transition-colors ${viewportMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Mobile
                </button>
              </div>
            </div>

            {currentUser.role !== 'Driver' && (
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Filter Compliance</p>
                <div className="space-y-2">
                  {(['Compliant', 'Warning', 'NON-COMPLIANT'] as ComplianceStatus[]).map((s) => (
                    <label key={s} className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-400 hover:text-white transition-colors">
                      <input 
                        type="checkbox" 
                        checked={statusFilter.includes(s)}
                        onChange={(e) => {
                          if (e.target.checked) setStatusFilter([...statusFilter, s]);
                          else setStatusFilter(statusFilter.filter(item => item !== s));
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleResetDemo}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-extrabold uppercase bg-red-950 hover:bg-red-900 border border-red-800 text-red-350 rounded-md transition-colors"
            >
              <RotateCcw size={12} /> Reset Roster State
            </button>
          </div>
        </aside>

        {/* Content body wrapper */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-8 pb-28 lg:pb-8">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && currentUser.role !== 'Driver' && (
            <div className="space-y-8 animate-fade-in">
              {/* Executive Pillar Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pillar 1: Safety */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Safety & Compliance</p>
                          <p className="text-[10px] text-slate-400 font-mono">PILLAR 1 • DOT AUDIT</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded">
                        {fleetHealthScore}% PASS
                      </span>
                    </div>
                    <div className="mt-4 space-y-1 text-xs text-slate-600">
                      <p className="flex justify-between">
                        <span>Active Operators:</span>
                        <span className="font-bold text-slate-900">{drivers.length} Drivers</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Debarred / Action Required:</span>
                        <span className={`font-bold ${expiredDocsCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{expiredDocsCount} Drivers</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Pending Approvals:</span>
                        <span className="font-bold text-amber-600">{pendingRequestsCount} Requests</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleNavigateToTab('safety')}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors uppercase tracking-wider"
                  >
                    Open Safety Hub <ArrowRight size={13} />
                  </button>
                </div>

                {/* Pillar 2: Dispatch */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <Compass size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dispatch & Operations</p>
                          <p className="text-[10px] text-slate-400 font-mono">PILLAR 2 • FREIGHT OPS</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded">
                        {loads.filter(l => l.status === 'Active' || l.status === 'Dispatched').length} ACTIVE
                      </span>
                    </div>
                    <div className="mt-4 space-y-1 text-xs text-slate-600">
                      <p className="flex justify-between">
                        <span>Active Dispatched Miles:</span>
                        <span className="font-bold text-slate-900">{loads.reduce((acc, l) => acc + l.calculatedMiles, 0).toLocaleString()} mi</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Total Manifest Loads:</span>
                        <span className="font-bold text-slate-900">{loads.length} Shipments</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Roadside Incidents:</span>
                        <span className={`font-bold ${activeIncidentsCount > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                          {activeIncidentsCount > 0 ? `🚨 ${activeIncidentsCount} Breakdown` : 'Zero Active'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleNavigateToTab('dispatch')}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors uppercase tracking-wider"
                  >
                    Open Dispatch Board <ArrowRight size={13} />
                  </button>
                </div>

                {/* Pillar 3: Accounting */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          <DollarSign size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Accounting & Payroll</p>
                          <p className="text-[10px] text-slate-400 font-mono">PILLAR 3 • SETTLEMENTS</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded">
                        WEEKLY CYCLE
                      </span>
                    </div>
                    <div className="mt-4 space-y-1 text-xs text-slate-600">
                      <p className="flex justify-between">
                        <span>Weekly Gross Settlement:</span>
                        <span className="font-bold text-slate-900">${payStubs.reduce((acc, s) => acc + s.grossAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Stubs Pending Review:</span>
                        <span className={`font-bold ${payStubs.filter(s => s.status === 'Pending Review').length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                          {payStubs.filter(s => s.status === 'Pending Review').length} Stubs
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span>Fuel Tax Filing:</span>
                        <span className="font-bold text-emerald-600">IFTA Q2 2026 Ready</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleNavigateToTab('accounting')}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors uppercase tracking-wider"
                  >
                    Open Accounting Hub <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Safety Risk Heatmap Visual Card */}
              <SafetyRiskHeatmap
                drivers={drivers}
                incidents={incidents}
                onSelectDriver={(driver) => setEditingDriver(driver)}
                onNavigateToDrivers={() => handleNavigateToTab('safety', 'risk')}
                currentUserId={currentUser.id}
              />

              {/* 6-Month Safety Risk Trend Line Chart */}
              <SafetyRiskTrendChart
                incidents={incidents}
                onSelectDriver={(driverId) => {
                  const d = drivers.find(dr => dr.id === driverId);
                  if (d) setEditingDriver(d);
                }}
              />

              {/* Roster visual distribution and details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="text-sm font-black mb-6 hover:text-slate-700 tracking-wider text-slate-800 uppercase flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-600" /> Driver Security & Certification Audit Levels
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={complianceData}>
                        <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} fontSize={11} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {complianceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert size={16} className="text-blue-600" /> Multi-Role Simulation Center
                  </h3>
                  <div className="text-xs text-slate-600 space-y-3.5 leading-relaxed">
                    <p>
                      This compliance dashboard operates with three distinct access categories, fully securing sensitive personal identifier credentials:
                    </p>
                    <div className="p-3 bg-slate-50 rounded-lg space-y-2 border">
                      <div className="flex gap-1.5 items-center">
                        <Lock size={12} className="text-rose-500" />
                        <span className="font-bold text-slate-900">Administrator (Alice):</span>
                        <span className="text-[9px] text-slate-500">Edit Expiries/Add Roster</span>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <Lock size={12} className="text-amber-500" />
                        <span className="font-bold text-slate-900">Fleet Manager (Bob):</span>
                        <span className="text-[9px] text-slate-500">Scheduled Inspections Only</span>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <Lock size={12} className="text-blue-500" />
                        <span className="font-bold text-slate-900">Drivers (James/Linda):</span>
                        <span className="text-[9px] text-slate-500">Personal Portal / Submission Desk</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 italic">
                      💡 Tip: Use the 'Simulate Log In' dropdown at the top to toggle active user roles and confirm role restriction behaviors.
                    </p>
                  </div>
                </div>
              </div>

              {/* Roster expiring soon */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Fast-Expiration Compliance roster</h3>
                  <div className="flex items-center gap-2 relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input 
                      type="text" 
                      placeholder="Filter roster..."
                      className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-800"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-3.5 font-bold uppercase tracking-wider text-slate-500">Driver Name</th>
                        <th className="px-6 py-3.5 font-bold uppercase tracking-wider text-slate-500">CDL License Expiration</th>
                        <th className="px-6 py-3.5 font-bold uppercase tracking-wider text-slate-500">Med Exam Expiration</th>
                        <th className="px-6 py-3.5 font-bold uppercase tracking-wider text-slate-500">Assigned Equipment</th>
                        <th className="px-6 py-3.5 font-bold uppercase tracking-wider text-slate-500">Roster Clearance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDrivers.map((d) => {
                        const isExpired = d.overallStatus === 'NON-COMPLIANT';
                        return (
                          <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-black text-slate-850 text-sm">
                              {d.name}
                            </td>
                            <td className="px-6 py-4 font-mono font-medium">
                              {d.cdlExpiry} <span className="text-[10px] text-slate-400">({getDaysDifference(d.cdlExpiry)}d left)</span>
                            </td>
                            <td className="px-6 py-4 font-mono font-medium">
                              {d.medCertExpiry} <span className="text-[10px] text-slate-400">({getDaysDifference(d.medCertExpiry)}d left)</span>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-slate-700">
                              {d.truckId}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <StatusBadge status={d.overallStatus} />
                                <span className="text-[10px] text-slate-400 hidden md:inline">{getComplianceText(d.overallStatus)}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SAFETY & COMPLIANCE TAB (Consolidated Safety Hub) */}
          {(activeTab === 'safety' || activeTab === 'drivers' || activeTab === 'vehicles' || activeTab === 'inbox') && currentUser.role !== 'Driver' && (
            <SafetyHub
              drivers={drivers}
              vehicles={vehicles}
              incidents={incidents}
              renewalRequests={renewalRequests}
              currentUser={currentUser}
              activeSubTab={safetySubTab}
              onSubTabChange={(sub) => setSafetySubTab(sub)}
              onInspectDriver={(driver) => setEditingDriver(driver)}
              onAddDriver={() => setIsAddingDriver(true)}
              onEditDriver={(driver) => setEditingDriver(driver)}
              onDeleteDriver={handleDeleteDriver}
              onAddVehicle={() => setIsAddingVehicle(true)}
              onEditVehicle={(vehicle) => setEditingVehicle(vehicle)}
              onDeleteVehicle={handleDeleteVehicle}
              onApproveRenewal={handleApproveRequest}
              onDeclineRenewal={handleDeclineRequest}
              fleetPaceMultiplier={fleetPaceMultiplier}
              onSetFleetPaceMultiplier={setFleetPaceMultiplier}
              maintenanceInvoices={maintenanceInvoices}
              onAddMaintenanceInvoice={handleAddMaintenanceInvoice}
              onDeleteMaintenanceInvoice={handleDeleteMaintenanceInvoice}
            />
          )}

          {/* AUDIT LOGS TAB */}
          {activeTab === 'logs' && currentUser.role !== 'Driver' && (
            <AuditLogs 
              logs={auditLogs} 
              currentUser={currentUser} 
              onClear={() => {
                if (confirm('Erase security archives matching current session?')) {
                  setAuditLogs([]);
                }
              }} 
            />
          )}

          {/* DRIVER PORTAL ACTIVE */}
          {activeTab === 'portal' && currentUser.role === 'Driver' && activeDriverScope && (
            <DriverPortal 
              driver={activeDriverScope} 
              vehicles={vehicles} 
              renewalRequests={renewalRequests} 
              onSubmitRenewal={handleDriverRenewalSubmit} 
              onSubmitIssue={handleDriverIssueSubmit} 
              assignedLoads={loads}
              onUpdateLoadStatus={handleUpdateLoadStatus}
              payStubs={payStubs}
              incidents={incidents}
              onReportIncident={handleReportIncident}
              driverExpenses={driverExpenses}
              onAddDriverExpense={handleAddDriverExpense}
            />
          )}

          {/* DISPATCH PORTAL ACTIVE */}
          {activeTab === 'dispatch' && currentUser.role !== 'Driver' && (
            <DispatchPortal 
              drivers={drivers} 
              loads={loads} 
              companyInfo={companyInfo}
              incidents={incidents}
              onAddLoad={handleCreateLoad} 
              onUpdateLoadStatus={handleUpdateLoadStatus} 
              onDeleteLoad={handleDeleteLoad} 
              onUpdateIncident={handleUpdateIncident}
              onUpdateLoadDocs={handleUpdateLoadDocs}
            />
          )}

          {/* ACCOUNTING & PAYROLL HQ ACTIVE */}
          {(activeTab === 'accounting' || activeTab === 'payroll') && currentUser.role !== 'Driver' && (
            <PayrollPortal 
              payStubs={payStubs}
              loads={loads}
              drivers={drivers}
              currentUserRole={currentUser.role}
              companyInfo={companyInfo}
              onUpdateStubStatus={handleUpdateStubStatus}
              maintenanceInvoices={maintenanceInvoices}
              driverExpenses={driverExpenses}
              fuelTransactions={fuelTransactions}
              onImportFuelTransactions={handleImportFuelTransactions}
            />
          )}

        </main>

        {/* Sticky Mobile Bottom Navigation Bar (Handheld Quick-Switch Rail) */}
        <nav 
          aria-label="Mobile Bottom Navigation"
          className={`${viewportMode === 'desktop' ? 'hidden' : 'lg:hidden'} fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1.5 shadow-lg flex items-center justify-around`}
        >
          {currentUser.role !== 'Driver' ? (
            <>
              <button
                type="button"
                onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
                className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
                  activeTab === 'overview' ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard size={18} />
                <span className="text-[10px] mt-0.5 font-semibold">Overview</span>
              </button>

              <button
                type="button"
                onClick={() => { handleNavigateToTab('safety'); setIsMobileMenuOpen(false); }}
                className={`flex flex-col items-center py-1 px-3 rounded-lg relative transition-colors ${
                  activeTab === 'safety' ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ShieldAlert size={18} />
                <span className="text-[10px] mt-0.5 font-semibold">Safety</span>
                {(expiredDocsCount > 0 || pendingRequestsCount > 0) && (
                  <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>

              <button
                type="button"
                onClick={() => { handleNavigateToTab('dispatch'); setIsMobileMenuOpen(false); }}
                className={`flex flex-col items-center py-1 px-3 rounded-lg relative transition-colors ${
                  activeTab === 'dispatch' ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Compass size={18} />
                <span className="text-[10px] mt-0.5 font-semibold">Dispatch</span>
                {activeIncidentsCount > 0 && (
                  <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => { handleNavigateToTab('accounting'); setIsMobileMenuOpen(false); }}
                className={`flex flex-col items-center py-1 px-3 rounded-lg relative transition-colors ${
                  activeTab === 'accounting' || activeTab === 'payroll' ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <DollarSign size={18} />
                <span className="text-[10px] mt-0.5 font-semibold">Payroll</span>
                {payStubs.filter(s => s.status === 'Pending Review').length > 0 && (
                  <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
                  isMobileMenuOpen || activeTab === 'logs' ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <MoreHorizontal size={18} />
                <span className="text-[10px] mt-0.5 font-semibold">More</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setActiveTab('portal'); setIsMobileMenuOpen(false); }}
                className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
                  activeTab === 'portal' ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Fingerprint size={18} />
                <span className="text-[10px] mt-0.5 font-semibold">My Desk</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('portal'); setIsMobileMenuOpen(false); }}
                className="flex flex-col items-center py-1 px-3 rounded-lg text-slate-500 hover:text-slate-900"
              >
                <FileBadge2 size={18} />
                <span className="text-[10px] mt-0.5 font-semibold">Certs</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex flex-col items-center py-1 px-3 rounded-lg text-slate-500 hover:text-slate-900"
              >
                <MoreHorizontal size={18} />
                <span className="text-[10px] mt-0.5 font-semibold">Menu</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* --- ADD DRIVER MODAL (ADMIN ONLY) --- */}
      {isAddingDriver && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 outline-none p-6 max-w-lg w-full shadow-2xl animate-fade-in relative">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-1 uppercase">Insert New Operator Profile</h3>
            <p className="text-[10px] text-slate-400 font-medium mb-4">Register new driver with complete contact, CDL, and IRS tax status.</p>
            
            <form onSubmit={handleAddDriver} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Legal Name</label>
                <input 
                  type="text" required placeholder="e.g. Sandra Bullock"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800"
                  value={newDriverData.name} onChange={e => setNewDriverData({...newDriverData, name: e.target.value})}
                />
              </div>

              {/* Tax Classification Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tax & Payment Classification</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewDriverData({ ...newDriverData, taxClassification: 'W2' })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      newDriverData.taxClassification === 'W2'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-[11px] font-black uppercase">W-2 Employee</span>
                    <span className="block text-[9px] text-slate-500">Statutory payroll tax withholding</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewDriverData({ ...newDriverData, taxClassification: '1099-NEC' })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      newDriverData.taxClassification === '1099-NEC'
                        ? 'border-amber-600 bg-amber-50/80 text-amber-950 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-[11px] font-black uppercase">1099-NEC Contractor</span>
                    <span className="block text-[9px] text-slate-500">Independent owner-operator</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input 
                    type="text" placeholder="(312) 555-0192"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                    value={newDriverData.phone} onChange={e => setNewDriverData({...newDriverData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Corporate Email</label>
                  <input 
                    type="email" placeholder="driver@fastgate.com"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800"
                    value={newDriverData.email} onChange={e => setNewDriverData({...newDriverData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SSN or Tax ID (Masked)</label>
                  <input 
                    type="text" placeholder="331-XX-9812"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                    value={newDriverData.ssnEin} onChange={e => setNewDriverData({...newDriverData, ssnEin: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Assignment</label>
                  <select 
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-bold text-slate-800"
                    value={newDriverData.truckId} onChange={e => setNewDriverData({...newDriverData, truckId: e.target.value})}
                  >
                    <option value="">No Allocation</option>
                    {vehicles.map(v => <option key={v.id} value={v.unitNumber}>{v.unitNumber}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CDL Expiration</label>
                  <input 
                    type="date" required 
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                    value={newDriverData.cdlExpiry} onChange={e => setNewDriverData({...newDriverData, cdlExpiry: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Medical Cert Expiration</label>
                  <input 
                    type="date" required 
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                    value={newDriverData.medCertExpiry} onChange={e => setNewDriverData({...newDriverData, medCertExpiry: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  className="bg-slate-900 hover:bg-slate-800 font-bold uppercase tracking-wider text-white py-2 px-4 rounded-lg flex-1 shadow-xs"
                >
                  Create Profile
                </button>
                <button 
                  type="button" onClick={() => setIsAddingDriver(false)}
                  className="bg-slate-100 hover:bg-slate-200 border text-slate-700 font-bold uppercase tracking-wider py-2 px-4 rounded-lg flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD VEHICLE MODAL (ADMIN ONLY) --- */}
      {isAddingVehicle && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 outline-none p-6 max-w-md w-full shadow-2xl animate-fade-in relative">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-4 uppercase">Register Heavy Equipment Assets</h3>
            
            <form onSubmit={handleAddVehicle} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Unit Number</label>
                <input 
                  type="text" required placeholder="e.g. TRK-2000"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800"
                  value={newVehicleData.unitNumber} onChange={e => setNewVehicleData({...newVehicleData, unitNumber: e.target.value})}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">VIN Key</label>
                <input 
                  type="text" required placeholder="e.g. 1FVAC11204Y..."
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                  value={newVehicleData.vin} onChange={e => setNewVehicleData({...newVehicleData, vin: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State Inspection Expiry</label>
                  <input 
                    type="date" required 
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                    value={newVehicleData.inspectionExpiry} onChange={e => setNewVehicleData({...newVehicleData, inspectionExpiry: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Maintenance Status</label>
                  <select 
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800"
                    value={newVehicleData.maintenanceStatus} onChange={e => setNewVehicleData({...newVehicleData, maintenanceStatus: e.target.value as any})}
                  >
                    <option value="Up to Date">Up to Date</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider block mb-2">Predictive Mileage Parameters</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-650 mb-0.5">Current Odometer (Hl.)</label>
                    <input 
                      type="number" min="0" required placeholder="e.g. 120000"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                      value={newVehicleData.mileage} onChange={e => setNewVehicleData({...newVehicleData, mileage: Number(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-650 mb-0.5">Last Check Odometer</label>
                    <input 
                      type="number" min="0" required placeholder="e.g. 110000"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                      value={newVehicleData.lastInspectionMileage} onChange={e => setNewVehicleData({...newVehicleData, lastInspectionMileage: Number(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block font-bold text-slate-650 mb-0.5">Interval Limit (mi.)</label>
                    <input 
                      type="number" min="100" required placeholder="e.g. 10000"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                      value={newVehicleData.inspectionIntervalMiles} onChange={e => setNewVehicleData({...newVehicleData, inspectionIntervalMiles: Number(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-650 mb-0.5">Est. Monthly Miles</label>
                    <input 
                      type="number" min="0" required placeholder="e.g. 3500"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                      value={newVehicleData.averageMonthlyMiles} onChange={e => setNewVehicleData({...newVehicleData, averageMonthlyMiles: Number(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider text-white py-2 px-4 rounded-lg flex-1"
                >
                  Register
                </button>
                <button 
                  type="button" onClick={() => setIsAddingVehicle(false)}
                  className="bg-slate-100 hover:bg-slate-200 border text-slate-700 font-bold uppercase tracking-wider py-2 px-4 rounded-lg flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- COMPANY SETTINGS MODAL --- */}
      {isEditingCompany && (
        <CompanySettingsModal
          companyInfo={companyInfo}
          currentUserRole={currentUser.role}
          onClose={() => setIsEditingCompany(false)}
          onSave={(updated) => setCompanyInfo(updated)}
        />
      )}

      {/* --- EDIT DRIVER MODAL (ROLE SENSITIVE CONTROLS) --- */}
      {editingDriver && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 outline-none p-6 max-w-md w-full shadow-2xl animate-fade-in relative">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-1 uppercase text-slate-800">
              Operator Master Record Detail
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-4">
              Security Authority Check: {currentUser.role} Level
            </p>
            
            <form onSubmit={handleSaveEditDriver} className="space-y-4 text-xs">
              {currentUser.role === 'Fleet Manager' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-150 flex gap-2 text-amber-800 leading-normal">
                  <Lock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px]">
                    <strong>Manager Scope Policy:</strong> Sensitive CDL/Medical dates & citations can only be altered by an Administrator. You may adjust Vehicle Assignments.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Operator Name</label>
                <input 
                  type="text" required 
                  disabled={currentUser.role === 'Fleet Manager'}
                  className={`border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 ${
                    currentUser.role === 'Fleet Manager' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'
                  }`}
                  value={editingDriver.name} onChange={e => setEditingDriver({...editingDriver, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CDL Expiration</label>
                  <input 
                    type="date" required 
                    disabled={currentUser.role === 'Fleet Manager'}
                    className={`border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono ${
                      currentUser.role === 'Fleet Manager' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'
                    }`}
                    value={editingDriver.cdlExpiry} onChange={e => setEditingDriver({...editingDriver, cdlExpiry: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Medical Cert Expiration</label>
                  <input 
                    type="date" required 
                    disabled={currentUser.role === 'Fleet Manager'}
                    className={`border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono ${
                      currentUser.role === 'Fleet Manager' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'
                    }`}
                    value={editingDriver.medCertExpiry} onChange={e => setEditingDriver({...editingDriver, medCertExpiry: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Assignment</label>
                  <select 
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-semibold"
                    value={editingDriver.truckId} onChange={e => setEditingDriver({...editingDriver, truckId: e.target.value})}
                  >
                    <option value="None">No Allocation</option>
                    {vehicles.map(v => <option key={v.id} value={v.unitNumber}>{v.unitNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prior Citations Count</label>
                  <input 
                    type="number" min="0" required
                    disabled={currentUser.role === 'Fleet Manager'}
                    className={`border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono ${
                      currentUser.role === 'Fleet Manager' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'
                    }`}
                    value={editingDriver.criticalViolations} onChange={e => setEditingDriver({...editingDriver, criticalViolations: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider text-white py-2 px-4 rounded-lg flex-1"
                >
                  Save Changes
                </button>
                <button 
                  type="button" onClick={() => setEditingDriver(null)}
                  className="bg-slate-100 hover:bg-slate-200 border text-slate-700 font-bold uppercase tracking-wider py-2 px-4 rounded-lg flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT VEHICLE MODAL (ADMIN & FLEET MANAGER ON EQUAL TERMS) --- */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 outline-none p-6 max-w-md w-full shadow-2xl animate-fade-in relative">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-4 uppercase">Update Fleet Registry Asset</h3>
            
            <form onSubmit={handleSaveEditVehicle} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Unit ID (Read Only)</label>
                <input 
                  type="text" disabled
                  className="bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200 rounded-lg px-3 py-2 w-full outline-none font-bold"
                  value={editingVehicle.unitNumber}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">VIN Code</label>
                <input 
                  type="text" required
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                  value={editingVehicle.vin} onChange={e => setEditingVehicle({...editingVehicle, vin: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Inspection Deadline</label>
                  <input 
                    type="date" required 
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono animate-fade-in"
                    value={editingVehicle.inspectionExpiry} onChange={e => setEditingVehicle({...editingVehicle, inspectionExpiry: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Maintenance Status</label>
                  <select 
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-semibold"
                    value={editingVehicle.maintenanceStatus} onChange={e => setEditingVehicle({...editingVehicle, maintenanceStatus: e.target.value as any})}
                  >
                    <option value="Up to Date">Up to Date</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider block mb-2">Predictive Mileage Parameters</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-650 mb-0.5">Current Odometer (Hl.)</label>
                    <input 
                      type="number" min="0" required placeholder="e.g. 120000"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                      value={editingVehicle.mileage ?? 0} onChange={e => setEditingVehicle({...editingVehicle, mileage: Number(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-650 mb-0.5">Last Check Odometer</label>
                    <input 
                      type="number" min="0" required placeholder="e.g. 110000"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                      value={editingVehicle.lastInspectionMileage ?? 0} onChange={e => setEditingVehicle({...editingVehicle, lastInspectionMileage: Number(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block font-bold text-slate-650 mb-0.5">Interval Limit (mi.)</label>
                    <input 
                      type="number" min="100" required placeholder="e.g. 10000"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                      value={editingVehicle.inspectionIntervalMiles ?? 10000} onChange={e => setEditingVehicle({...editingVehicle, inspectionIntervalMiles: Number(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-650 mb-0.5">Est. Monthly Miles</label>
                    <input 
                      type="number" min="0" required placeholder="e.g. 3500"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                      value={editingVehicle.averageMonthlyMiles ?? 3000} onChange={e => setEditingVehicle({...editingVehicle, averageMonthlyMiles: Number(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider text-white py-2 px-4 rounded-lg flex-1"
                >
                  Save Changes
                </button>
                <button 
                  type="button" onClick={() => setEditingVehicle(null)}
                  className="bg-slate-100 hover:bg-slate-200 border text-slate-700 font-bold uppercase tracking-wider py-2 px-4 rounded-lg flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
