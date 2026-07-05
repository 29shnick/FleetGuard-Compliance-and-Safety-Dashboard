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
  Receipt
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
import { MOCK_DRIVERS, MOCK_VEHICLES } from './data';
import { Driver, Vehicle, ComplianceStatus, UserSession, AuditLogEntry, RenewalRequest, DispatchLoad, PayStub } from './types';
import RbacPanel, { SIMULATED_USERS } from './components/RbacPanel';
import DriverPortal from './components/DriverPortal';
import ActionCenter from './components/ActionCenter';
import AuditLogs from './components/AuditLogs';
import DispatchPortal from './components/DispatchPortal';
import PayrollPortal from './components/PayrollPortal';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus[]>(['Compliant', 'Warning', 'NON-COMPLIANT']);

  // --- Session Role State ---
  const [currentUser, setCurrentUser] = useState<UserSession>(() => {
    const saved = localStorage.getItem('fg_currentUser');
    return saved ? JSON.parse(saved) : SIMULATED_USERS[0]; // Admin by default
  });

  // --- Drivers Master State ---
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem('fg_drivers');
    return saved ? JSON.parse(saved) : MOCK_DRIVERS;
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
    if (saved) return JSON.parse(saved);
    return [
      { id: 'LD-1', loadNumber: 'LD-3942', originHub: 'Chicago, IL', destinationHub: 'New York, NY', calculatedMiles: 712, driverId: 'D2', driverName: 'James Wilson', truckId: 'TRK-202', ratePerMile: 2.60, payout: 1851.20, status: 'Dispatched', cargoType: 'Refrigerated Food', weightLbs: 38000, submittedAt: '2026-05-24 10:15' },
      { id: 'LD-2', loadNumber: 'LD-2051', originHub: 'Dallas, TX', destinationHub: 'Los Angeles, CA', calculatedMiles: 1400, driverId: 'D1', driverName: 'Nikola Shikaleski', truckId: 'TRK-101', ratePerMile: 3.10, payout: 4340.00, status: 'Active', cargoType: 'Electronics Secure', weightLbs: 15500, submittedAt: '2026-05-24 11:30' },
      { id: 'LD-3', loadNumber: 'LD-8103', originHub: 'Miami, FL', destinationHub: 'Atlanta, GA', calculatedMiles: 660, driverId: 'Unassigned', driverName: 'Unassigned', truckId: 'None', ratePerMile: 2.15, payout: 1419.00, status: 'Pending', cargoType: 'Dry Van General', weightLbs: 24000, submittedAt: '2026-05-24 12:45' }
    ];
  });

  // --- Weekly Pay Stubs Master State ---
  const [payStubs, setPayStubs] = useState<PayStub[]>(() => {
    const saved = localStorage.getItem('fg_paystubs');
    if (saved) return JSON.parse(saved);
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
        driverId: 'D1',
        driverName: 'Nikola Shikaleski',
        weekEndingDate: '2026-05-30',
        loadIds: ['LD-2'],
        totalMiles: 1400,
        grossAmount: 4340.00,
        status: 'Pending Review',
        issuedAt: '2026-05-24 11:30'
      }
    ];
  });

  // Forecasting simulation state
  const [fleetPaceMultiplier, setFleetPaceMultiplier] = useState<number>(1.0);

  // Modals state
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);

  // New Driver Form State
  const [newDriverData, setNewDriverData] = useState({
    name: '',
    cdlExpiry: '',
    medCertExpiry: '',
    truckId: '',
    criticalViolations: 0
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
  const logSecurityAction = (action: string, details: string, type: 'security' | 'data_edit' | 'approval') => {
    const newLog: AuditLogEntry = {
      id: `L-${Date.now()}`,
      timestamp: '2026-05-24 14:14',
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action,
      details,
      type
    };
    setAuditLogs(prev => [newLog, ...prev]);
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
        { id: 'LD-2', loadNumber: 'LD-2051', originHub: 'Dallas, TX', destinationHub: 'Los Angeles, CA', calculatedMiles: 1400, driverId: 'D1', driverName: 'Nikola Shikaleski', truckId: 'TRK-101', ratePerMile: 3.10, payout: 4340.00, status: 'Active', cargoType: 'Electronics Secure', weightLbs: 15500, submittedAt: '2026-05-24 11:30' },
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
          driverId: 'D1',
          driverName: 'Nikola Shikaleski',
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

  const handleUpdateStubStatus = (id: string, status: PayStub['status']) => {
    setPayStubs(prev => prev.map(ps => ps.id === id ? { ...ps, status } : ps));
    logSecurityAction(
      'Update Pay Stub Status',
      `CEO/Safety Manager updated weekly payroll stub ${id} status to "${status}".`,
      'approval'
    );
  };

  // --- Driver Admin write changes ---
  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'Safety Manager & CEO' && currentUser.role !== 'Administrator') {
      alert('🔒 Authorization Denied: Add driver is restricted to Safety Manager & CEO / Administrator roles.');
      return;
    }
    const newDriver: Driver = {
      id: `D${drivers.length + 1}`,
      name: newDriverData.name,
      cdlExpiry: newDriverData.cdlExpiry,
      medCertExpiry: newDriverData.medCertExpiry,
      truckId: newDriverData.truckId || 'None',
      overallStatus: calcStatus(newDriverData.cdlExpiry, newDriverData.medCertExpiry),
      criticalViolations: Number(newDriverData.criticalViolations),
      isHighRisk: Number(newDriverData.criticalViolations) > 2
    };

    setDrivers(prev => [...prev, newDriver]);
    setIsAddingDriver(false);
    setNewDriverData({ name: '', cdlExpiry: '', medCertExpiry: '', truckId: '', criticalViolations: 0 });
    logSecurityAction(
      'Insert Driver Profile',
      `Administrator created profile ID ${newDriver.id} for ${newDriver.name}.`,
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
      />

      {/* Main Core Container */}
      <div className="flex flex-1 flex-col lg:flex-row relative">
        {/* Mobile menu toggle indicator */}
        <div className="lg:hidden bg-white border-b px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-slate-500">FLEETGUARD WORKSPACE NAVIGATION</span>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="p-1 hover:bg-slate-100 rounded text-slate-700"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <aside className={`
          bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-all duration-300 z-40
          fixed inset-y-0 left-0 w-64 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:w-64 shrink-0
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

          {/* Navigation Items (Role-sensitive rendering) */}
          <nav className="flex-1 p-4 space-y-1.5 font-sans">
            {currentUser.role !== 'Driver' ? (
              <>
                <button 
                  onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <LayoutDashboard size={14} /> Global Overview
                </button>
                <button 
                  onClick={() => { setActiveTab('drivers'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'drivers' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <span className="flex items-center gap-3">
                    <Users size={14} /> Drivers Roster
                  </span>
                </button>
                <button 
                  onClick={() => { setActiveTab('vehicles'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'vehicles' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <Truck size={14} /> Vehicles Fleet
                </button>
                <button 
                  onClick={() => { setActiveTab('dispatch'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'dispatch' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <Compass size={14} /> Freight Dispatch Board
                </button>
                <button 
                  onClick={() => { setActiveTab('payroll'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'payroll' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <DollarSign size={14} /> Weekly Payroll HQ
                </button>
                <button 
                  onClick={() => { setActiveTab('inbox'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'inbox' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <span className="flex items-center gap-3">
                    <FileBadge2 size={14} /> Approvals Box
                  </span>
                  {pendingRequestsCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center animate-pulse">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => { setActiveTab('logs'); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-850'}`}
                >
                  <Fingerprint size={14} /> Audit Trail logs
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
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-8">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && currentUser.role !== 'Driver' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex md:flex-row flex-col justify-between items-start">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Active Driver Roster</p>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">REGULATORY COUNT</span>
                  </div>
                  <h3 className="text-3xl font-black mt-2">{drivers.length} Drivers</h3>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex md:flex-row flex-col justify-between items-start">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Debarred Files (Expired CDL/Med)</p>
                    <span className="text-[10px] bg-red-100 text-red-800 font-extrabold px-1.5 py-0.5 rounded">ACTION REQUIRED</span>
                  </div>
                  <h3 className={`text-3xl font-black mt-2 ${expiredDocsCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {expiredDocsCount} Drivers
                  </h3>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex md:flex-row flex-col justify-between items-start">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Qualified Compliance Score</p>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">QUALIFY SCORE</span>
                  </div>
                  <h3 className="text-3xl font-black mt-2 text-emerald-600">{fleetHealthScore}% Pass</h3>
                </div>
              </div>

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
                        <span className="font-bold text-slate-900">Drivers (Nikola/James):</span>
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

          {/* DRIVERS TAB */}
          {activeTab === 'drivers' && currentUser.role !== 'Driver' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Active Operator Roster</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage operator files, inspect critical violations, and adjust vehicle alignments.</p>
                </div>

                {currentUser.role === 'Administrator' && (
                  <button 
                    onClick={() => setIsAddingDriver(true)}
                    className="bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    <Plus size={14} /> Insert Driver Profile
                  </button>
                )}
              </div>

              {/* Roster table list */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px] text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Driver ID & Name</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Assigned Equipment</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Critical CDL Date</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Critical Med Exam Date</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Safety Exclusions</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Roster Status</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {drivers.map((driver) => (
                        <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-extrabold text-slate-900 text-sm">{driver.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">SYSTEM-ID: {driver.id}</div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-700">
                            {driver.truckId}
                          </td>
                          <td className="px-6 py-4 font-mono">
                            {driver.cdlExpiry}
                          </td>
                          <td className="px-6 py-4 font-mono">
                            {driver.medCertExpiry}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit uppercase ${
                                driver.criticalViolations > 2 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {driver.criticalViolations} Deficiencies
                              </span>
                              {driver.isHighRisk && (
                                <span className="text-rose-600 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1">
                                  ⚠️ MANDATORY AUDIT
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={driver.overallStatus} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex gap-2.5">
                              <button 
                                onClick={() => setEditingDriver(driver)}
                                className="p-1 text-slate-500 hover:text-slate-850 hover:bg-slate-100 transition-colors rounded"
                                title={currentUser.role === 'Fleet Manager' ? 'Change vehicle allocation only' : 'Modify entire record'}
                              >
                                <Edit2 size={13} />
                              </button>
                              
                              {currentUser.role === 'Administrator' && (
                                <button 
                                  onClick={() => handleDeleteDriver(driver.id)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors rounded"
                                  title="Erase record permanently"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VEHICLES TAB */}
          {activeTab === 'vehicles' && currentUser.role !== 'Driver' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Heavy Vehicle Fleet Manifest</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Track truck inspection cycles, monitor maintenance updates, and adjust route dispatching.</p>
                </div>

                {currentUser.role === 'Administrator' && (
                  <button 
                    onClick={() => setIsAddingVehicle(true)}
                    className="bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    <Plus size={14} /> Register Fleet Equipment
                  </button>
                )}
              </div>

              {/* predictive forecasting HUD */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 border border-slate-850 p-5 rounded-2xl text-white">
                {/* Active Pace Simulator */}
                <div className="md:col-span-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="text-blue-400 w-4 h-4 animate-pulse" />
                      <span className="text-[10px] uppercase font-black tracking-widest text-blue-400 font-mono">Dynamic Workload Simulator</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-105 mt-2">Active Fleet Operations Pace</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Toggle active simulated workload pace scales to instantly recalculate all safety intervals and months remaining for vehicle inspections.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mt-3">
                    {[
                      { label: 'Idle / Local', val: 0.5 },
                      { label: 'Normal Work', val: 1.0 },
                      { label: 'Ramped Route', val: 1.5 },
                      { label: 'Seasonal Rush', val: 2.0 },
                      { label: 'Extreme Pace', val: 3.0 }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setFleetPaceMultiplier(opt.val)}
                        className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                          fleetPaceMultiplier === opt.val
                            ? 'bg-blue-600 text-white shadow-xs border-transparent'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700'
                        }`}
                      >
                        {opt.val}x - {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metric 1 */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-rose-450 font-mono tracking-wider">Critical Risk Triggers</span>
                    <h4 className="text-2xl font-black text-rose-500 mt-1">{fleetForecastAnalysis.criticalCount}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Vehicles that have exceeded their recommended inspection limits.
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Fleet status:</span>
                    <span className={`font-mono font-bold text-[9px] ${fleetForecastAnalysis.criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {fleetForecastAnalysis.criticalCount > 0 ? 'HIGH RISK' : 'SECURE'}
                    </span>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-amber-450 font-mono tracking-wider">Upcoming Checkups</span>
                    <h4 className="text-2xl font-black text-amber-500 mt-1">{fleetForecastAnalysis.warningCount}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Vehicles projected to cross mileage thresholds within the next 30 days.
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Average remaining cap:</span>
                    <span className="font-mono font-bold text-indigo-300 text-[9px]">
                      {fleetForecastAnalysis.averageRemainingMiles.toLocaleString()} mi
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicle table list */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px] text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Equipment Unit #</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Current Odometer</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Distance & Safety Check Interval</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Time Horizon Forecast</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">State/Cal Status</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fleetForecastAnalysis.items.map((v) => {
                        const progressPercent = Math.min(100, Math.max(0, (v.traveledSinceCheck / v.interval) * 100));
                        return (
                          <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-extrabold text-slate-850 text-sm">{v.unitNumber}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{v.vin}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-mono font-bold text-slate-800">
                                {(v.currentMileage || 0).toLocaleString()} mi
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <TrendingUp size={11} className="text-blue-500 text-slate-400" />
                                <span>{(v.monthlyRate || 0).toLocaleString()} mi/month</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 min-w-[200px]">
                              <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 mb-1">
                                <span>{v.traveledSinceCheck.toLocaleString()} mi run</span>
                                <span>limit: {v.interval.toLocaleString()} mi</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    v.risk === 'critical' ? 'bg-rose-500' :
                                    v.risk === 'warning' ? 'bg-amber-400' :
                                    'bg-emerald-500'
                                  }`} 
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <div className="text-[10px] mt-1 font-semibold">
                                {v.overdue ? (
                                  <span className="text-rose-600 font-extrabold text-[9px] uppercase tracking-wider">OVERDUE BY {Math.abs(v.remainingMiles).toLocaleString()} mi</span>
                                ) : (
                                  <span className="text-slate-500 text-[9px] uppercase tracking-wider">{v.remainingMiles.toLocaleString()} mi left</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono">
                              {v.overdue ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-extrabold text-[9px] border border-rose-100 uppercase animate-pulse">
                                  ⚠️ Over Limit
                                </span>
                              ) : (
                                <div>
                                  <div className={`font-extrabold text-[11px] ${v.risk === 'warning' ? 'text-amber-600' : 'text-slate-750'}`}>
                                    In ~{v.monthsRemaining.toFixed(1)} months
                                  </div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">
                                    Est. Service: {
                                      (() => {
                                        try {
                                          const estDate = new Date();
                                          estDate.setMonth(estDate.getMonth() + v.monthsRemaining);
                                          return estDate.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
                                        } catch {
                                          return 'N/A';
                                        }
                                      })()
                                    }
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-mono text-slate-700 text-[10px]">{v.inspectionExpiry}</div>
                              <div className="mt-1">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  v.maintenanceStatus === 'Up to Date' ? 'bg-emerald-100 text-emerald-800' :
                                  v.maintenanceStatus === 'Scheduled' ? 'bg-amber-100 text-amber-800 font-mono' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {v.maintenanceStatus}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex gap-2">
                                <button 
                                  onClick={() => setEditingVehicle(v)}
                                  className="p-1 text-slate-500 hover:text-slate-850 hover:bg-slate-100 transition-colors rounded"
                                  title="Update maintenance or inspection stats"
                                >
                                  <Edit2 size={13} />
                                </button>
                                
                                {currentUser.role === 'Administrator' && (
                                  <button 
                                    onClick={() => handleDeleteVehicle(v.id)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors rounded"
                                    title="Unregister equipment permanently"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
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

          {/* APPROVALS TAB */}
          {activeTab === 'inbox' && currentUser.role !== 'Driver' && (
            <ActionCenter 
              requests={renewalRequests} 
              currentUser={currentUser} 
              onApprove={handleApproveRequest} 
              onDecline={handleDeclineRequest} 
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
            />
          )}

          {/* DISPATCH PORTAL ACTIVE */}
          {activeTab === 'dispatch' && currentUser.role !== 'Driver' && (
            <DispatchPortal 
              drivers={drivers} 
              loads={loads} 
              onAddLoad={handleCreateLoad} 
              onUpdateLoadStatus={handleUpdateLoadStatus} 
              onDeleteLoad={handleDeleteLoad} 
            />
          )}

          {/* WEEKLY PAYROLL HQ ACTIVE */}
          {activeTab === 'payroll' && currentUser.role !== 'Driver' && (
            <PayrollPortal 
              payStubs={payStubs}
              loads={loads}
              drivers={drivers}
              currentUserRole={currentUser.role}
              onUpdateStubStatus={handleUpdateStubStatus}
            />
          )}

        </main>
      </div>

      {/* --- ADD DRIVER MODAL (ADMIN ONLY) --- */}
      {isAddingDriver && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 outline-none p-6 max-w-md w-full shadow-2xl animate-fade-in relative">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-4 uppercase">Insert New Operator Profile</h3>
            
            <form onSubmit={handleAddDriver} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Operator Name</label>
                <input 
                  type="text" required placeholder="e.g. Sandra Bullock"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800"
                  value={newDriverData.name} onChange={e => setNewDriverData({...newDriverData, name: e.target.value})}
                />
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Assignment</label>
                  <select 
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800"
                    value={newDriverData.truckId} onChange={e => setNewDriverData({...newDriverData, truckId: e.target.value})}
                  >
                    <option value="">No Allocation</option>
                    {vehicles.map(v => <option key={v.id} value={v.unitNumber}>{v.unitNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prior Citations Count</label>
                  <input 
                    type="number" min="0" required
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-full outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                    value={newDriverData.criticalViolations} onChange={e => setNewDriverData({...newDriverData, criticalViolations: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-wider text-white py-2 px-4 rounded-lg flex-1"
                >
                  Create
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
