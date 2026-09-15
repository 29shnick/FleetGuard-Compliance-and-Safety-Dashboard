import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  FileBadge2, 
  Truck, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Filter, 
  AlertCircle,
  Scale,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  Building2,
  CalendarClock,
  FileText
} from 'lucide-react';
import { Driver, Vehicle, IncidentReport, RenewalRequest, UserSession, ComplianceStatus, MaintenanceInvoice } from '../types';
import { HISTORICAL_VIOLATIONS } from '../data';
import SafetyRiskHeatmap from './SafetyRiskHeatmap';
import SafetyRiskTrendChart from './SafetyRiskTrendChart';
import ActionCenter from './ActionCenter';
import VehicleMaintenanceModal from './VehicleMaintenanceModal';
import MaintenanceCostProjectionChart from './MaintenanceCostProjectionChart';

interface SafetyHubProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  incidents: IncidentReport[];
  renewalRequests: RenewalRequest[];
  currentUser: UserSession;
  activeSubTab?: 'credentials' | 'risk' | 'violations' | 'renewals' | 'vehicles';
  onSubTabChange?: (subTab: 'credentials' | 'risk' | 'violations' | 'renewals' | 'vehicles') => void;
  onInspectDriver: (driver: Driver) => void;
  onAddDriver: () => void;
  onEditDriver: (driver: Driver) => void;
  onDeleteDriver: (id: string) => void;
  onAddVehicle: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onApproveRenewal: (id: string) => void;
  onDeclineRenewal: (id: string) => void;
  fleetPaceMultiplier: number;
  onSetFleetPaceMultiplier: (pace: number) => void;
  maintenanceInvoices?: MaintenanceInvoice[];
  onAddMaintenanceInvoice?: (invoice: Omit<MaintenanceInvoice, 'id' | 'submittedAt'>, shouldResetStatus?: boolean) => void;
  onDeleteMaintenanceInvoice?: (invoiceId: string) => void;
}

// Consistent mock reference date
const MOCK_TODAY = '2026-05-24';

const getDaysDifference = (expiryStr: string): number => {
  if (!expiryStr) return 0;
  const expiry = new Date(expiryStr);
  const today = new Date(MOCK_TODAY);
  expiry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function SafetyHub({
  drivers,
  vehicles,
  incidents,
  renewalRequests,
  currentUser,
  activeSubTab = 'credentials',
  onSubTabChange,
  onInspectDriver,
  onAddDriver,
  onEditDriver,
  onDeleteDriver,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onApproveRenewal,
  onDeclineRenewal,
  fleetPaceMultiplier,
  onSetFleetPaceMultiplier,
  maintenanceInvoices = [],
  onAddMaintenanceInvoice,
  onDeleteMaintenanceInvoice
}: SafetyHubProps) {
  const [internalSubTab, setInternalSubTab] = useState<'credentials' | 'risk' | 'violations' | 'renewals' | 'vehicles'>(activeSubTab);
  const [selectedVehicleForMaintenance, setSelectedVehicleForMaintenance] = useState<Vehicle | null>(null);

  const currentTab = onSubTabChange ? activeSubTab : internalSubTab;
  const setTab = (tab: 'credentials' | 'risk' | 'violations' | 'renewals' | 'vehicles') => {
    if (onSubTabChange) onSubTabChange(tab);
    else setInternalSubTab(tab);
  };

  // Credentials Search and Filter State
  const [driverSearch, setDriverSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus[]>(['Compliant', 'Warning', 'NON-COMPLIANT']);

  // Violations Category and Search State
  const [violationCategory, setViolationCategory] = useState<string>('ALL');
  const [violationSearch, setViolationSearch] = useState('');

  // Vehicle Search
  const [vehicleSearch, setVehicleSearch] = useState('');

  // Filtered Drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const matchSearch = 
        d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.id.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.truckId.toLowerCase().includes(driverSearch.toLowerCase());
      const matchStatus = statusFilter.includes(d.overallStatus);
      return matchSearch && matchStatus;
    });
  }, [drivers, driverSearch, statusFilter]);

  // Violations List filtered
  const filteredViolations = useMemo(() => {
    return HISTORICAL_VIOLATIONS.filter(v => {
      const matchCat = violationCategory === 'ALL' || v.category === violationCategory;
      const matchQuery = 
        v.driverName.toLowerCase().includes(violationSearch.toLowerCase()) ||
        v.type.toLowerCase().includes(violationSearch.toLowerCase()) ||
        v.fmcsaCode.toLowerCase().includes(violationSearch.toLowerCase()) ||
        v.location.toLowerCase().includes(violationSearch.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [violationCategory, violationSearch]);

  // Filtered Vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.unitNumber.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.vin.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.maintenanceStatus.toLowerCase().includes(vehicleSearch.toLowerCase())
    );
  }, [vehicles, vehicleSearch]);

  // Overall Safety Metrics
  const expiredDocsCount = useMemo(() => 
    drivers.filter(d => d.overallStatus === 'NON-COMPLIANT').length, 
  [drivers]);

  const warningDocsCount = useMemo(() => 
    drivers.filter(d => d.overallStatus === 'Warning').length, 
  [drivers]);

  const highRiskDriversCount = useMemo(() => 
    drivers.filter(d => d.isHighRisk).length, 
  [drivers]);

  const pendingRenewalsCount = useMemo(() => 
    renewalRequests.filter(r => r.status === 'Pending').length, 
  [renewalRequests]);

  const overdueVehiclesCount = useMemo(() => 
    vehicles.filter(v => v.maintenanceStatus === 'Overdue').length, 
  [vehicles]);

  const complianceRate = useMemo(() => {
    if (drivers.length === 0) return 100;
    const compliant = drivers.filter(d => d.overallStatus === 'Compliant').length;
    return Math.round((compliant / drivers.length) * 100);
  }, [drivers]);

  const totalViolationPoints = useMemo(() => 
    HISTORICAL_VIOLATIONS.reduce((acc, v) => acc + v.points, 0), 
  []);

  // Status Badge Helper
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

  return (
    <div className="space-y-6 animate-fade-in" id="safety-hub-root">
      
      {/* Safety Header & Executive KPI Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <ShieldAlert size={20} />
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Safety & DOT Compliance Hub
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Unified compliance center for driver credential tracking, FMCSA roadside inspections, risk analytics, and renewal approvals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border ${
              expiredDocsCount > 0 ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {expiredDocsCount > 0 ? <AlertTriangle size={14} className="text-rose-500" /> : <CheckCircle2 size={14} className="text-emerald-500" />}
              {expiredDocsCount > 0 ? `${expiredDocsCount} Debarred File(s)` : 'Full Roster Authorized'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              <UserCheck size={14} className="text-slate-500" />
              {complianceRate}% Compliance Pass
            </span>
          </div>
        </div>

        {/* High-Level Safety KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qualified Drivers</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">
              {drivers.length - expiredDocsCount} <span className="text-xs font-semibold text-slate-400">/ {drivers.length}</span>
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expiring &lt;30d</p>
            <p className={`text-lg font-black mt-0.5 ${warningDocsCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {warningDocsCount} <span className="text-xs font-semibold text-slate-400">files</span>
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">High Risk Flagged</p>
            <p className={`text-lg font-black mt-0.5 ${highRiskDriversCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {highRiskDriversCount} <span className="text-xs font-semibold text-slate-400">drivers</span>
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Renewals</p>
            <p className={`text-lg font-black mt-0.5 ${pendingRenewalsCount > 0 ? 'text-blue-600' : 'text-slate-900'}`}>
              {pendingRenewalsCount} <span className="text-xs font-semibold text-slate-400">actions</span>
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overdue Trucks</p>
            <p className={`text-lg font-black mt-0.5 ${overdueVehiclesCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {overdueVehiclesCount} <span className="text-xs font-semibold text-slate-400">units</span>
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Sub-Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/80 rounded-xl overflow-x-auto">
        <button
          id="safety-tab-credentials"
          onClick={() => setTab('credentials')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            currentTab === 'credentials'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Users size={14} />
          <span>Driver Credentials & Expirations</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-mono">
            {drivers.length}
          </span>
        </button>

        <button
          id="safety-tab-risk"
          onClick={() => setTab('risk')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            currentTab === 'risk'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <TrendingUp size={14} />
          <span>Risk Heatmap & Trends</span>
        </button>

        <button
          id="safety-tab-violations"
          onClick={() => setTab('violations')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            currentTab === 'violations'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Scale size={14} />
          <span>FMCSA Violations & Citations</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-mono">
            {HISTORICAL_VIOLATIONS.length}
          </span>
        </button>

        <button
          id="safety-tab-renewals"
          onClick={() => setTab('renewals')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            currentTab === 'renewals'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileBadge2 size={14} />
          <span>Renewal Approvals</span>
          {pendingRenewalsCount > 0 ? (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-black animate-pulse">
              {pendingRenewalsCount}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-mono">
              ✓
            </span>
          )}
        </button>

        <button
          id="safety-tab-vehicles"
          onClick={() => setTab('vehicles')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
            currentTab === 'vehicles'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Truck size={14} />
          <span>Fleet Equipment Safety</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-mono">
            {vehicles.length}
          </span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 1. SUB-TAB: DRIVER CREDENTIALS & EXPIRATIONS                */}
      {/* ============================================================ */}
      {currentTab === 'credentials' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            {/* Search and status filters */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input 
                  type="text" 
                  placeholder="Search operator name, ID, or truck..."
                  className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-800 w-full outline-none"
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                {(['Compliant', 'Warning', 'NON-COMPLIANT'] as ComplianceStatus[]).map((s) => (
                  <label key={s} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-slate-600 hover:text-slate-900">
                    <input 
                      type="checkbox" 
                      checked={statusFilter.includes(s)}
                      onChange={(e) => {
                        if (e.target.checked) setStatusFilter([...statusFilter, s]);
                        else setStatusFilter(statusFilter.filter(item => item !== s));
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            {currentUser.role === 'Safety Manager & CEO' && (
              <button 
                onClick={onAddDriver}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm flex items-center gap-1.5 uppercase tracking-wider shrink-0"
              >
                <Plus size={14} /> Insert Driver Profile
              </button>
            )}
          </div>

          {/* Mobile Driver Cards (Visible on mobile/tablet viewports) */}
          <div className="md:hidden space-y-3">
            {filteredDrivers.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                No operators matching current query or filters.
              </div>
            ) : (
              filteredDrivers.map((driver) => {
                const cdlDays = getDaysDifference(driver.cdlExpiry);
                const medDays = getDaysDifference(driver.medCertExpiry);

                return (
                  <div key={driver.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button 
                          type="button" 
                          onClick={() => onInspectDriver(driver)}
                          className="font-extrabold text-slate-900 text-sm hover:text-blue-600 flex items-center gap-1 text-left"
                        >
                          {driver.name}
                          <ChevronRight size={14} className="text-slate-400" />
                        </button>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {driver.id} • Unit: <span className="font-bold text-slate-700">{driver.truckId}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={driver.overallStatus} />
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          driver.taxClassification === 'W2' 
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200' 
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}>
                          {driver.taxClassification || '1099-NEC'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs font-mono">
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-400 font-sans block">CDL Expiry</span>
                        <p className="font-bold text-slate-800 text-[11px] mt-0.5">{driver.cdlExpiry}</p>
                        <span className={`text-[9px] font-bold ${cdlDays < 0 ? 'text-rose-600 font-black' : cdlDays <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {cdlDays < 0 ? `Expired (${Math.abs(cdlDays)}d ago)` : `${cdlDays}d remaining`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-400 font-sans block">Med Cert</span>
                        <p className="font-bold text-slate-800 text-[11px] mt-0.5">{driver.medCertExpiry}</p>
                        <span className={`text-[9px] font-bold ${medDays < 0 ? 'text-rose-600 font-black' : medDays <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {medDays < 0 ? `Expired (${Math.abs(medDays)}d ago)` : `${medDays}d remaining`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div>
                        {driver.criticalViolations > 0 ? (
                          <span className={`inline-flex items-center gap-1 font-bold font-mono px-2 py-0.5 rounded text-[10px] ${
                            driver.isHighRisk ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            <AlertTriangle size={11} /> {driver.criticalViolations} citations
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[10px]">0 Clean Citations</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onInspectDriver(driver)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[10px] uppercase transition-colors"
                        >
                          Inspect
                        </button>
                        {currentUser.role !== 'Driver' && (
                          <button
                            type="button"
                            onClick={() => onEditDriver(driver)}
                            className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] uppercase transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        {currentUser.role === 'Safety Manager & CEO' && (
                          <button
                            type="button"
                            onClick={() => onDeleteDriver(driver.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Driver"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Driver Roster Table (Hidden on small mobile screens) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Driver ID & Operator</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">IRS Tax Setup</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Assigned Equipment</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">CDL Expiration</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Medical Cert Expiration</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Citations</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Status</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                        No operators matching current query or filters.
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((driver) => {
                      const cdlDays = getDaysDifference(driver.cdlExpiry);
                      const medDays = getDaysDifference(driver.medCertExpiry);

                      return (
                        <tr key={driver.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => onInspectDriver(driver)}
                              className="font-extrabold text-slate-900 text-sm hover:text-blue-600 transition-colors text-left flex items-center gap-1.5"
                            >
                              {driver.name}
                              <ChevronRight size={14} className="text-slate-400" />
                            </button>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                              ID: {driver.id} • {driver.profileInfo?.phone || '(312) 555-0192'}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => onInspectDriver(driver)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                                driver.taxClassification === 'W2'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200/80 hover:bg-indigo-100'
                                  : 'bg-amber-50 text-amber-900 border-amber-200/80 hover:bg-amber-100'
                              }`}
                              title="Click to view tax and financial profile"
                            >
                              {driver.taxClassification || '1099-NEC'}
                            </button>
                          </td>

                          <td className="px-6 py-4 font-mono font-bold text-slate-700">
                            {driver.truckId}
                          </td>

                          <td className="px-6 py-4 font-mono">
                            <div>{driver.cdlExpiry}</div>
                            <span className={`text-[10px] font-semibold ${
                              cdlDays < 0 ? 'text-rose-600 font-black' : cdlDays <= 30 ? 'text-amber-600 font-bold' : 'text-slate-400'
                            }`}>
                              {cdlDays < 0 ? `EXPIRED (${Math.abs(cdlDays)}d ago)` : `${cdlDays} days left`}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-mono">
                            <div>{driver.medCertExpiry}</div>
                            <span className={`text-[10px] font-semibold ${
                              medDays < 0 ? 'text-rose-600 font-black' : medDays <= 30 ? 'text-amber-600 font-bold' : 'text-slate-400'
                            }`}>
                              {medDays < 0 ? `EXPIRED (${Math.abs(medDays)}d ago)` : `${medDays} days left`}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            {driver.criticalViolations > 0 ? (
                              <span className={`inline-flex items-center gap-1 font-bold font-mono px-2 py-0.5 rounded text-[10px] ${
                                driver.isHighRisk ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                <AlertTriangle size={11} /> {driver.criticalViolations} citations
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">0 Clean</span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <StatusBadge status={driver.overallStatus} />
                          </td>

                          <td className="px-6 py-4 text-right space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onInspectDriver(driver)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Inspect Full Safety File"
                            >
                              <UserCheck size={16} />
                            </button>

                            {currentUser.role !== 'Driver' && (
                              <button
                                type="button"
                                onClick={() => onEditDriver(driver)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Driver Parameters"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}

                            {currentUser.role === 'Safety Manager & CEO' && (
                              <button
                                type="button"
                                onClick={() => onDeleteDriver(driver.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Operator File"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SUB-TAB: RISK HEATMAP & TRENDS                           */}
      {/* ============================================================ */}
      {currentTab === 'risk' && (
        <div className="space-y-6">
          <SafetyRiskHeatmap
            drivers={drivers}
            incidents={incidents}
            onSelectDriver={(driver) => onInspectDriver(driver)}
            onNavigateToDrivers={() => setTab('credentials')}
            currentUserId={currentUser.id}
          />

          <SafetyRiskTrendChart
            incidents={incidents}
            onSelectDriver={(driverId) => {
              const d = drivers.find(dr => dr.id === driverId);
              if (d) onInspectDriver(d);
            }}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. SUB-TAB: FMCSA VIOLATIONS & CITATIONS                    */}
      {/* ============================================================ */}
      {currentTab === 'violations' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Scale size={18} className="text-rose-600" /> FMCSA Roadside Inspections & Safety Violations
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official FMCSA inspection records, categorized by Safety Measurement System (SMS) BASICs and penalty weights.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-400 font-bold uppercase text-[10px] mr-1.5">Total Points:</span>
                <span className="font-mono font-black text-rose-600">{totalViolationPoints} pts</span>
              </div>
              <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-400 font-bold uppercase text-[10px] mr-1.5">Inspections:</span>
                <span className="font-mono font-black text-slate-800">{HISTORICAL_VIOLATIONS.length} citations</span>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Category pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All Categories' },
                { id: 'Hours of Service', label: 'Hours of Service' },
                { id: 'Vehicle Maintenance', label: 'Vehicle Maintenance' },
                { id: 'Unsafe Driving', label: 'Unsafe Driving' },
                { id: 'Driver Fitness', label: 'Driver Fitness' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setViolationCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    violationCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input 
                type="text"
                placeholder="Search code, driver, location..."
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-800 w-full outline-none"
                value={violationSearch}
                onChange={(e) => setViolationSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Violations Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Date & Station</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Driver Involved</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">FMCSA Code</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Violation Description</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Category</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Severity</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Points</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredViolations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                        No citations matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredViolations.map((v) => {
                      const matchedDriver = drivers.find(d => d.id === v.driverId);

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-mono font-bold text-slate-900">{v.date}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{v.location}</div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-extrabold text-slate-900">{v.driverName}</span>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {v.driverId}</div>
                          </td>

                          <td className="px-6 py-4 font-mono font-bold text-blue-700 bg-blue-50/40">
                            § {v.fmcsaCode}
                          </td>

                          <td className="px-6 py-4 max-w-xs font-medium text-slate-700 leading-relaxed">
                            {v.type}
                          </td>

                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {v.category}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border uppercase ${
                              v.severity === 'Critical'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {v.severity}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-mono font-black text-rose-600">
                            +{v.points}
                          </td>

                          <td className="px-6 py-4 text-right">
                            {matchedDriver ? (
                              <button
                                type="button"
                                onClick={() => onInspectDriver(matchedDriver)}
                                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors"
                              >
                                View File
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. SUB-TAB: RENEWAL APPROVALS (ACTION CENTER)               */}
      {/* ============================================================ */}
      {currentTab === 'renewals' && (
        <ActionCenter
          requests={renewalRequests}
          currentUser={currentUser}
          onApprove={onApproveRenewal}
          onDecline={onDeclineRenewal}
        />
      )}

      {/* ============================================================ */}
      {/* 5. SUB-TAB: FLEET EQUIPMENT SAFETY                          */}
      {/* ============================================================ */}
      {currentTab === 'vehicles' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Truck size={18} className="text-blue-600" /> Commercial Vehicle Safety & Periodic Inspections
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Annual DOT periodic inspection deadlines, vehicle maintenance status, and predictive mileage intervals.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-48 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input 
                  type="text"
                  placeholder="Filter unit or VIN..."
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-slate-800 w-full outline-none"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                />
              </div>

              {currentUser.role === 'Safety Manager & CEO' && (
                <button 
                  onClick={onAddVehicle}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-sm flex items-center gap-1.5 uppercase tracking-wider shrink-0"
                >
                  <Plus size={14} /> Register Unit
                </button>
              )}
            </div>
          </div>

          {/* Predictive Forecasting HUD & Pace Multiplier */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-blue-400 w-4 h-4 animate-pulse" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-blue-400 font-mono">
                    Predictive Inspection Pace Engine
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mt-1">Simulated Fleet Mileage Burn Rate</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adjust active workload pace to dynamically project odometer wear against inspection tolerances.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Idle / Local', val: 0.5 },
                  { label: 'Normal (1.0x)', val: 1.0 },
                  { label: 'Ramped (1.5x)', val: 1.5 },
                  { label: 'Rush (2.0x)', val: 2.0 },
                  { label: 'Extreme (3.0x)', val: 3.0 }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => onSetFleetPaceMultiplier(opt.val)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      fleetPaceMultiplier === opt.val
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-widest font-mono">Total Equipment</span>
                <p className="text-lg font-bold text-white mt-0.5">{vehicles.length} Units</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-widest font-mono">Up to Date</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">
                  {vehicles.filter(v => v.maintenanceStatus === 'Up to Date').length} Units
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-widest font-mono">Scheduled</span>
                <p className="text-lg font-bold text-amber-400 mt-0.5">
                  {vehicles.filter(v => v.maintenanceStatus === 'Scheduled').length} Units
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase tracking-widest font-mono">Inspection Overdue</span>
                <p className="text-lg font-bold text-rose-400 mt-0.5">
                  {vehicles.filter(v => v.maintenanceStatus === 'Overdue').length} Units
                </p>
              </div>
            </div>
          </div>

          {/* 6-Month Projected Maintenance Cost Bar Chart Component */}
          <MaintenanceCostProjectionChart
            vehicles={vehicles}
            fleetPaceMultiplier={fleetPaceMultiplier}
            maintenanceInvoices={maintenanceInvoices}
          />

          {/* Mobile Equipment Cards (Visible on mobile/tablet screens) */}
          <div className="md:hidden space-y-3">
            {filteredVehicles.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                No equipment units matching query.
              </div>
            ) : (
              filteredVehicles.map((vehicle) => {
                const daysLeft = getDaysDifference(vehicle.inspectionExpiry);
                const current = vehicle.mileage ?? 50000;
                const last = vehicle.lastInspectionMileage ?? 45000;
                const interval = vehicle.inspectionIntervalMiles ?? 10000;
                const milesDrivenSinceLast = current - last;
                const milesRemaining = interval - milesDrivenSinceLast;

                const baseMilesPerDay = 150;
                const activeMilesPerDay = baseMilesPerDay * fleetPaceMultiplier;
                const daysUntilMileageExpiry = activeMilesPerDay > 0 ? Math.round(milesRemaining / activeMilesPerDay) : 999;
                const monthsUntilMileageExpiry = (daysUntilMileageExpiry / 30.4).toFixed(1);

                const statusPill = vehicle.maintenanceStatus === 'Up to Date'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : vehicle.maintenanceStatus === 'Scheduled'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200';

                return (
                  <div key={vehicle.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-base">Unit {vehicle.unitNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${statusPill}`}>
                            {vehicle.maintenanceStatus}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">VIN: {vehicle.vin}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedVehicleForMaintenance(vehicle)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[9px] uppercase transition-colors flex items-center gap-1 border border-blue-200"
                          title="Upload and inspect repair & oil change invoices"
                        >
                          <FileText size={10} /> Invoices
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditVehicle(vehicle)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] uppercase transition-colors"
                        >
                          Edit
                        </button>
                        {currentUser.role === 'Safety Manager & CEO' && (
                          <button
                            type="button"
                            onClick={() => onDeleteVehicle(vehicle.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs font-mono">
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-400 font-sans block">Inspection Due</span>
                        <p className="font-bold text-slate-800 text-[11px] mt-0.5">{vehicle.inspectionExpiry}</p>
                        <span className={`text-[9px] font-bold ${daysLeft < 0 ? 'text-rose-600 font-black' : daysLeft <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {daysLeft < 0 ? `Overdue (${Math.abs(daysLeft)}d)` : `${daysLeft}d left`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-400 font-sans block">Current Odometer</span>
                        <p className="font-bold text-slate-800 text-[11px] mt-0.5">{current.toLocaleString()} mi</p>
                        <span className="text-[9px] text-slate-400">Pace: {fleetPaceMultiplier}x</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1 font-mono">
                        <span>Tolerance: {milesRemaining.toLocaleString()} mi left</span>
                        <span className={`font-bold ${milesRemaining < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                          {milesRemaining < 0 ? 'Exceeded' : `In ~${monthsUntilMileageExpiry} mos`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full transition-all ${milesRemaining < 0 ? 'bg-rose-500' : milesRemaining < 2000 ? 'bg-amber-500' : 'bg-blue-600'}`}
                          style={{ width: `${Math.min(100, Math.max(0, (milesDrivenSinceLast / interval) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Vehicles Table (Hidden on mobile screens) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px] text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Unit ID</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">VIN / Chassis</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Inspection Deadline</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Maintenance Status</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Current Odometer</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Predictive Remaining</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                        No equipment units matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((vehicle) => {
                      const daysLeft = getDaysDifference(vehicle.inspectionExpiry);
                      const current = vehicle.mileage ?? 50000;
                      const last = vehicle.lastInspectionMileage ?? 45000;
                      const interval = vehicle.inspectionIntervalMiles ?? 10000;
                      const milesDrivenSinceLast = current - last;
                      const milesRemaining = interval - milesDrivenSinceLast;

                      return (
                        <tr key={vehicle.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 font-black text-slate-900 text-sm">
                            {vehicle.unitNumber}
                          </td>

                          <td className="px-6 py-4 font-mono text-slate-600">
                            {vehicle.vin}
                          </td>

                          <td className="px-6 py-4 font-mono">
                            <div>{vehicle.inspectionExpiry}</div>
                            <span className={`text-[10px] font-semibold ${
                              daysLeft < 0 ? 'text-rose-600 font-bold' : daysLeft <= 30 ? 'text-amber-600' : 'text-slate-400'
                            }`}>
                              {daysLeft < 0 ? `EXPIRED (${Math.abs(daysLeft)}d ago)` : `${daysLeft} days left`}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                              vehicle.maintenanceStatus === 'Up to Date'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : vehicle.maintenanceStatus === 'Scheduled'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}>
                              {vehicle.maintenanceStatus}
                            </span>
                          </td>

                          <td className="px-6 py-4 font-mono">
                            {current.toLocaleString()} mi
                          </td>

                          <td className="px-6 py-4 font-mono">
                            <span className={`font-bold ${milesRemaining <= 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                              {milesRemaining <= 0 ? 'OVERDUE' : `${milesRemaining.toLocaleString()} mi`}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setSelectedVehicleForMaintenance(vehicle)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[10px] uppercase transition-colors inline-flex items-center gap-1 border border-blue-200"
                              title="Upload and inspect repair & oil change invoices"
                            >
                              <FileText size={12} />
                              Invoices
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditVehicle(vehicle)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Vehicle Details"
                            >
                              <Edit2 size={15} />
                            </button>

                            {currentUser.role === 'Safety Manager & CEO' && (
                              <button
                                type="button"
                                onClick={() => onDeleteVehicle(vehicle.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Vehicle Unit"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Maintenance & Invoice Upload Modal */}
      {selectedVehicleForMaintenance && (
        <VehicleMaintenanceModal
          vehicle={selectedVehicleForMaintenance}
          invoices={maintenanceInvoices}
          isOpen={!!selectedVehicleForMaintenance}
          onClose={() => setSelectedVehicleForMaintenance(null)}
          onAddInvoice={onAddMaintenanceInvoice || (() => {})}
          onDeleteInvoice={onDeleteMaintenanceInvoice}
          currentUserRole={currentUser.role}
        />
      )}
    </div>
  );
}
