import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  Send, 
  Search, 
  ShieldAlert, 
  FileCheck, 
  User, 
  Truck, 
  Filter, 
  Check, 
  ChevronRight,
  AlertCircle,
  FileText,
  UploadCloud,
  Sparkles
} from 'lucide-react';
import { Driver, UserSession, RenewalRequest } from '../types';

export interface AlertsDropdownProps {
  drivers: Driver[];
  currentUser: UserSession;
  renewalRequests: RenewalRequest[];
  onInspectDriver?: (driver: Driver) => void;
  onNavigateToTab?: (tab: string) => void;
  onSubmitRenewal?: (driverId: string, type: 'CDL' | 'Medical Cert', date: string) => void;
  onLogSecurityAction?: (action: string, details: string, type: 'security' | 'data_edit' | 'approval' | 'incident') => void;
}

interface ExpirationAlert {
  id: string;
  driverId: string;
  driverName: string;
  truckId: string;
  phone?: string;
  email?: string;
  documentType: 'CDL License' | 'Medical Examination Certificate';
  docTypeKey: 'CDL' | 'Medical Cert';
  expiryDate: string;
  daysRemaining: number;
  severity: 'critical' | 'warning' | 'upcoming' | 'compliant';
  pendingRequest?: RenewalRequest;
  driver: Driver;
}

// Consistent mock reference date
const MOCK_TODAY = '2026-05-24';

export const getDaysDifference = (expiryStr: string, referenceDateStr: string = MOCK_TODAY): number => {
  if (!expiryStr) return 0;
  const expiry = new Date(expiryStr);
  const today = new Date(referenceDateStr);
  expiry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function AlertsDropdown({
  drivers,
  currentUser,
  renewalRequests,
  onInspectDriver,
  onNavigateToTab,
  onSubmitRenewal,
  onLogSecurityAction
}: AlertsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'cdl' | 'med'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ id: string; message: string } | null>(null);
  
  // Quick Driver Renewal Form State
  const [renewingAlert, setRenewingAlert] = useState<ExpirationAlert | null>(null);
  const [renewalDate, setRenewalDate] = useState('');
  const [renewalFileName, setRenewalFileName] = useState('');
  const [renewalNotes, setRenewalNotes] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setRenewingAlert(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setRenewingAlert(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  // Generate expiration alert records
  const allAlerts = useMemo<ExpirationAlert[]>(() => {
    const alerts: ExpirationAlert[] = [];

    drivers.forEach((driver) => {
      // 1. CDL License
      if (driver.cdlExpiry) {
        const cdlDays = getDaysDifference(driver.cdlExpiry);
        const cdlPending = renewalRequests.find(
          r => r.driverId === driver.id && r.type === 'CDL' && r.status === 'Pending'
        );

        let severity: ExpirationAlert['severity'] = 'compliant';
        if (cdlDays < 0) {
          severity = 'critical';
        } else if (cdlDays <= 30) {
          severity = 'warning';
        } else if (cdlDays <= 60) {
          severity = 'upcoming';
        }

        // Include all non-compliant/warning/upcoming, or if current user is this driver include all
        if (severity !== 'compliant' || (currentUser.role === 'Driver' && (currentUser.driverId === driver.id || currentUser.name === driver.name))) {
          alerts.push({
            id: `${driver.id}-cdl`,
            driverId: driver.id,
            driverName: driver.name,
            truckId: driver.truckId,
            phone: driver.profileInfo?.phone,
            email: driver.profileInfo?.email,
            documentType: 'CDL License',
            docTypeKey: 'CDL',
            expiryDate: driver.cdlExpiry,
            daysRemaining: cdlDays,
            severity,
            pendingRequest: cdlPending,
            driver
          });
        }
      }

      // 2. Medical Examiner Certificate
      if (driver.medCertExpiry) {
        const medDays = getDaysDifference(driver.medCertExpiry);
        const medPending = renewalRequests.find(
          r => r.driverId === driver.id && r.type === 'Medical Cert' && r.status === 'Pending'
        );

        let severity: ExpirationAlert['severity'] = 'compliant';
        if (medDays < 0) {
          severity = 'critical';
        } else if (medDays <= 30) {
          severity = 'warning';
        } else if (medDays <= 60) {
          severity = 'upcoming';
        }

        if (severity !== 'compliant' || (currentUser.role === 'Driver' && (currentUser.driverId === driver.id || currentUser.name === driver.name))) {
          alerts.push({
            id: `${driver.id}-med`,
            driverId: driver.id,
            driverName: driver.name,
            truckId: driver.truckId,
            phone: driver.profileInfo?.phone,
            email: driver.profileInfo?.email,
            documentType: 'Medical Examination Certificate',
            docTypeKey: 'Medical Cert',
            expiryDate: driver.medCertExpiry,
            daysRemaining: medDays,
            severity,
            pendingRequest: medPending,
            driver
          });
        }
      }
    });

    // Sort: most urgent first (negative days ascending, then smallest positive days)
    return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [drivers, renewalRequests, currentUser]);

  // Context-aware alerts for the active user
  const relevantAlerts = useMemo(() => {
    if (currentUser.role === 'Driver') {
      return allAlerts.filter(
        a => a.driverId === currentUser.driverId || a.driverName.toLowerCase() === currentUser.name.toLowerCase()
      );
    }
    // Administrator or Dispatcher sees all fleet-wide expirations
    return allAlerts;
  }, [allAlerts, currentUser]);

  // Filtered by UI tabs & search
  const filteredAlerts = useMemo(() => {
    return relevantAlerts.filter(alert => {
      // Tab filter
      if (filterType === 'critical' && alert.severity !== 'critical') return false;
      if (filterType === 'cdl' && alert.docTypeKey !== 'CDL') return false;
      if (filterType === 'med' && alert.docTypeKey !== 'Medical Cert') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = alert.driverName.toLowerCase().includes(q);
        const matchesTruck = alert.truckId.toLowerCase().includes(q);
        const matchesDoc = alert.documentType.toLowerCase().includes(q);
        if (!matchesName && !matchesTruck && !matchesDoc) return false;
      }

      return true;
    });
  }, [relevantAlerts, filterType, searchQuery]);

  // Counts for badges
  const criticalCount = useMemo(() => relevantAlerts.filter(a => a.severity === 'critical').length, [relevantAlerts]);
  const warningCount = useMemo(() => relevantAlerts.filter(a => a.severity === 'warning').length, [relevantAlerts]);
  const upcomingCount = useMemo(() => relevantAlerts.filter(a => a.severity === 'upcoming').length, [relevantAlerts]);
  const totalAlertCount = criticalCount + warningCount;

  // Handle reminder action
  const handleSendReminder = (alert: ExpirationAlert) => {
    const contactMethod = alert.email || alert.phone || 'registered driver phone';
    const message = `Reminder sent to ${alert.driverName} via ${contactMethod}`;
    setActionFeedback({ id: alert.id, message });

    if (onLogSecurityAction) {
      onLogSecurityAction(
        'Dispatch Expiration Notice',
        `Urgent compliance notification dispatched to ${alert.driverName} for expiring ${alert.documentType} (Exp: ${alert.expiryDate}).`,
        'approval'
      );
    }
  };

  // Handle Driver Quick Renewal Submission
  const handleStartRenewal = (alert: ExpirationAlert) => {
    setRenewingAlert(alert);
    // Suggest a date 1 year from now
    const nextYear = new Date('2027-05-24');
    const formatted = nextYear.toISOString().split('T')[0];
    setRenewalDate(formatted);
    setRenewalFileName(`${alert.docTypeKey === 'CDL' ? 'CDL_Renewal_Certified' : 'DOT_Medical_Card'}.pdf`);
  };

  const handleConfirmRenewalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingAlert || !renewalDate) return;

    if (onSubmitRenewal) {
      onSubmitRenewal(renewingAlert.driverId, renewingAlert.docTypeKey, renewalDate);
    }

    const docName = renewingAlert.documentType;
    setActionFeedback({
      id: renewingAlert.id,
      message: `Renewal request submitted for ${docName}! Pending safety review.`
    });

    setRenewingAlert(null);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Top Header Notification Bell Button */}
      <button
        type="button"
        id="top-header-alerts-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-semibold ${
          isOpen
            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500/20'
            : criticalCount > 0
            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 shadow-xs'
            : warningCount > 0
            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 shadow-xs'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
        }`}
        aria-label="View Document Expiration Alerts"
        aria-expanded={isOpen}
      >
        <div className="relative flex items-center">
          <Bell 
            size={16} 
            className={
              criticalCount > 0 
                ? 'text-rose-600 animate-bounce' 
                : warningCount > 0 
                ? 'text-amber-600' 
                : 'text-slate-500'
            } 
          />
          {criticalCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
            </span>
          )}
        </div>

        <span className="hidden sm:inline font-bold">Alerts</span>

        {/* Dynamic Badge Counter */}
        {criticalCount > 0 ? (
          <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none shadow-xs">
            {criticalCount}
          </span>
        ) : warningCount > 0 ? (
          <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none shadow-xs">
            {warningCount}
          </span>
        ) : (
          <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center leading-none">
            0
          </span>
        )}
      </button>

      {/* Alerts Dropdown Panel */}
      {isOpen && (
        <div 
          id="alerts-dropdown-panel"
          className="absolute right-0 mt-2.5 w-[370px] sm:w-[460px] max-w-[94vw] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col font-sans animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${criticalCount > 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-blue-500/20 text-blue-400'}`}>
                <ShieldAlert size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm tracking-tight text-white">
                    {currentUser.role === 'Driver' ? 'My Document Expirations' : 'Fleet Compliance Alerts'}
                  </h3>
                  {criticalCount > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                      Action Required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {currentUser.role === 'Driver' 
                    ? `CDL License & Medical Examiner Cert for ${currentUser.name}`
                    : 'Real-time tracking of critical CDL & Medical card deadlines'}
                </p>
              </div>
            </div>

            <button
              onClick={() => { setIsOpen(false); setRenewingAlert(null); }}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Close notification panel"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs">
            <div className={`p-2 rounded-lg border text-center ${criticalCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-white border-slate-200 text-slate-600'}`}>
              <span className="text-[10px] uppercase font-black tracking-wider block opacity-75">Critical Expired</span>
              <span className="text-base font-black leading-tight">{criticalCount}</span>
            </div>
            <div className={`p-2 rounded-lg border text-center ${warningCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-slate-200 text-slate-600'}`}>
              <span className="text-[10px] uppercase font-black tracking-wider block opacity-75">Within 30 Days</span>
              <span className="text-base font-black leading-tight">{warningCount}</span>
            </div>
            <div className="p-2 rounded-lg border bg-white border-slate-200 text-slate-600 text-center">
              <span className="text-[10px] uppercase font-black tracking-wider block opacity-75">30-60 Day Window</span>
              <span className="text-base font-black leading-tight">{upcomingCount}</span>
            </div>
          </div>

          {/* Actions Feedback Banner */}
          {actionFeedback && (
            <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                {actionFeedback.message}
              </span>
              <button 
                onClick={() => setActionFeedback(null)}
                className="text-emerald-700 hover:text-emerald-900"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Filter Bar (for Admins / Dispatchers) */}
          {currentUser.role !== 'Driver' && (
            <div className="p-3 border-b border-slate-100 bg-white space-y-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                    filterType === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  All ({relevantAlerts.length})
                </button>
                <button
                  onClick={() => setFilterType('critical')}
                  className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                    filterType === 'critical'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                  }`}
                >
                  <AlertTriangle size={11} /> Critical Expired ({criticalCount})
                </button>
                <button
                  onClick={() => setFilterType('cdl')}
                  className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                    filterType === 'cdl'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                  }`}
                >
                  CDL Only
                </button>
                <button
                  onClick={() => setFilterType('med')}
                  className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                    filterType === 'med'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                  }`}
                >
                  Medical Only
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter driver, truck unit (e.g. TRK-101)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Renewal Modal / Form Drawer */}
          {renewingAlert && (
            <div className="p-4 bg-blue-50/70 border-b border-blue-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <UploadCloud size={15} className="text-blue-600" />
                  <span>Submit {renewingAlert.documentType} Renewal</span>
                </div>
                <button 
                  onClick={() => setRenewingAlert(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleConfirmRenewalSubmit} className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    New Expiration Date (Approved Medical / CDL)
                  </label>
                  <input
                    type="date"
                    required
                    value={renewalDate}
                    onChange={(e) => setRenewalDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Attach Medical Examiner / CDL Scan File
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={renewalFileName}
                      onChange={(e) => setRenewalFileName(e.target.value)}
                      placeholder="e.g. CDL_State_Scan_2026.pdf"
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-1 rounded font-bold">
                      VERIFIED PDF
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRenewingAlert(null)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <Check size={13} />
                    Submit to Safety Officer
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Alerts */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">All Clear! No Active Expirations</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {currentUser.role === 'Driver'
                    ? 'Your CDL license and Medical certificate are current and compliant.'
                    : 'No drivers match the selected document filter criteria.'}
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isOverdue = alert.daysRemaining < 0;
                const isUrgent = alert.daysRemaining >= 0 && alert.daysRemaining <= 30;

                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isOverdue
                        ? 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50/80'
                        : isUrgent
                        ? 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/80'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        {/* Driver & Truck line */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1">
                            <User size={12} className="text-slate-400" />
                            {alert.driverName}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                            <Truck size={10} /> {alert.truckId}
                          </span>
                          {alert.driver.isHighRisk && (
                            <span className="text-[9px] bg-rose-100 text-rose-800 font-black px-1.5 py-0.5 rounded uppercase">
                              High Risk
                            </span>
                          )}
                        </div>

                        {/* Document type tag */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1 ${
                            alert.docTypeKey === 'CDL' 
                              ? 'bg-blue-50 text-blue-800 border-blue-200' 
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            <FileText size={10} />
                            {alert.documentType}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="font-mono text-slate-600 font-semibold text-[11px]">
                            {alert.expiryDate}
                          </span>
                        </div>
                      </div>

                      {/* Expiration Countdown Badge */}
                      <div className="shrink-0 text-right">
                        {isOverdue ? (
                          <div className="bg-rose-600 text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                            <AlertTriangle size={11} />
                            <span>EXPIRED {Math.abs(alert.daysRemaining)}D AGO</span>
                          </div>
                        ) : isUrgent ? (
                          <div className="bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                            <Clock size={11} />
                            <span>{alert.daysRemaining}D LEFT</span>
                          </div>
                        ) : (
                          <div className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 border border-slate-200">
                            <Calendar size={11} />
                            <span>{alert.daysRemaining}d remaining</span>
                          </div>
                        )}
                        <p className="text-[9px] text-slate-400 mt-1 uppercase font-semibold">
                          {isOverdue ? 'DEBARRED FROM DISPATCH' : isUrgent ? 'URGENT RENEWAL' : 'UPCOMING NOTICE'}
                        </p>
                      </div>
                    </div>

                    {/* Pending Renewal Request Flag if exists */}
                    {alert.pendingRequest && (
                      <div className="mt-2.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-[11px] text-indigo-900">
                        <span className="flex items-center gap-1.5 font-medium">
                          <FileCheck size={13} className="text-indigo-600 shrink-0" />
                          Renewal filed ({alert.pendingRequest.requestedValue}) • Pending Admin Approval
                        </span>
                        {currentUser.role !== 'Driver' && onNavigateToTab && (
                          <button
                            onClick={() => {
                              onNavigateToTab('inbox');
                              setIsOpen(false);
                            }}
                            className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 underline uppercase"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        {isOverdue ? (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <AlertCircle size={11} /> Operating Out of Compliance
                          </span>
                        ) : isUrgent ? (
                          <span className="text-amber-700 font-medium">
                            Requires updated DOT medical/license
                          </span>
                        ) : (
                          <span>Within 60-day renewal cycle</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Driver View Actions */}
                        {currentUser.role === 'Driver' ? (
                          alert.pendingRequest ? (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-bold border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 size={11} /> Under Review
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartRenewal(alert)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold shadow-xs flex items-center gap-1"
                            >
                              <UploadCloud size={11} /> Submit Renewal
                            </button>
                          )
                        ) : (
                          /* Admin & Dispatcher View Actions */
                          <>
                            <button
                              type="button"
                              onClick={() => handleSendReminder(alert)}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title={`Send urgent email/SMS notice to ${alert.driverName}`}
                            >
                              <Send size={10} className="text-slate-500" /> Reminder
                            </button>

                            {onInspectDriver && (
                              <button
                                type="button"
                                onClick={() => {
                                  onInspectDriver(alert.driver);
                                  setIsOpen(false);
                                }}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs"
                                title="Open full driver compliance dossier to inspect or edit"
                              >
                                Inspect Profile <ChevronRight size={11} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 font-medium">
              Reference: <strong>{MOCK_TODAY}</strong> (DOT Compliance Clock)
            </span>

            <div className="flex items-center gap-2">
              {currentUser.role !== 'Driver' && onNavigateToTab && (
                <>
                  <button
                    onClick={() => {
                      onNavigateToTab('drivers');
                      setIsOpen(false);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1"
                  >
                    Full Roster <ExternalLink size={11} />
                  </button>
                </>
              )}
              {currentUser.role === 'Driver' && onNavigateToTab && (
                <button
                  onClick={() => {
                    onNavigateToTab('portal');
                    setIsOpen(false);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1"
                >
                  My Driver Desk <ExternalLink size={11} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
