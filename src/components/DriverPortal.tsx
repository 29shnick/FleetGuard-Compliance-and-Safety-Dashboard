import React, { useState, useMemo } from 'react';
import { 
  Driver, 
  Vehicle, 
  RenewalRequest, 
  ComplianceStatus,
  DispatchLoad,
  PayStub,
  IncidentReport,
  DriverExpense
} from '../types';
import IncidentReportingModal from './IncidentReportingModal';
import DriverExpenseModal from './DriverExpenseModal';
import { 
  FileCheck, 
  Calendar, 
  ShieldAlert, 
  Truck, 
  Send, 
  AlertCircle, 
  History, 
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Compass,
  ArrowRight,
  DollarSign,
  Receipt,
  AlertTriangle,
  Wrench,
  Shield,
  Activity,
  PhoneCall,
  Scale,
  FileText,
  Check,
  Sparkles
} from 'lucide-react';

interface DriverPortalProps {
  driver: Driver;
  vehicles: Vehicle[];
  renewalRequests: RenewalRequest[];
  onSubmitRenewal: (type: 'CDL' | 'Medical Cert', date: string) => void;
  onSubmitIssue: (issue: string) => void;
  assignedLoads?: DispatchLoad[];
  onUpdateLoadStatus?: (id: string, status: DispatchLoad['status']) => void;
  payStubs?: PayStub[];
  incidents?: IncidentReport[];
  onReportIncident?: (incident: Omit<IncidentReport, 'id' | 'reportedAt' | 'status'>) => void;
  driverExpenses?: DriverExpense[];
  onAddDriverExpense?: (expense: Omit<DriverExpense, 'id' | 'submittedAt' | 'payrollStatus'>) => void;
  onUpdateLoadDocs?: (
    id: string,
    rateConFile?: { name: string; size: number; dataUrl?: string },
    bolFile?: { name: string; size: number; dataUrl?: string },
    invoiceDetails?: DispatchLoad['invoiceDetails'],
    lumperReceiptFile?: { name: string; size: number; dataUrl?: string; amount?: number; notes?: string },
    billingStatus?: DispatchLoad['billingStatus']
  ) => void;
}

export default function DriverPortal({ 
  driver, 
  vehicles, 
  renewalRequests, 
  onSubmitRenewal,
  onSubmitIssue,
  assignedLoads = [],
  onUpdateLoadStatus,
  payStubs = [],
  incidents = [],
  onReportIncident,
  driverExpenses = [],
  onAddDriverExpense,
  onUpdateLoadDocs
}: DriverPortalProps) {
  const [cdlDate, setCdlDate] = useState('');
  const [medDate, setMedDate] = useState('');
  const [issueText, setIssueText] = useState('');
  const [activeForm, setActiveForm] = useState<'cdl' | 'med' | 'issue' | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedStub, setSelectedStub] = useState<PayStub | null>(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Find their assigned vehicle
  const assignedVehicle = useMemo(() => {
    return vehicles.find(v => v.unitNumber === driver.truckId);
  }, [vehicles, driver.truckId]);

  const daysDiff = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date('2026-05-24'); // Fixed mock date
    target.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysStatusInfo = (days: number) => {
    if (days < 0) {
      return { 
        text: `${Math.abs(days)} Days Expired`, 
        color: 'text-rose-600 bg-rose-50 border-rose-100',
        badge: 'bg-rose-500 text-white'
      };
    }
    if (days <= 30) {
      return { 
        text: `Expires in ${days} Days`, 
        color: 'text-amber-600 bg-amber-50 border-amber-100',
        badge: 'bg-amber-500 text-slate-950'
      };
    }
    return { 
      text: `${days} Days Remaining`, 
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      badge: 'bg-emerald-500 text-white'
    };
  };

  const cdlDays = daysDiff(driver.cdlExpiry);
  const medDays = daysDiff(driver.medCertExpiry);

  const cdlStatus = getDaysStatusInfo(cdlDays);
  const medStatus = getDaysStatusInfo(medDays);

  const myRequests = useMemo(() => {
    return renewalRequests.filter(r => r.driverId === driver.id);
  }, [renewalRequests, driver.id]);

  const myLoads = useMemo(() => {
    return assignedLoads.filter(l => l.driverId === driver.id);
  }, [assignedLoads, driver.id]);

  const myPayStubs = useMemo(() => {
    return payStubs.filter(ps => ps.driverId === driver.id);
  }, [payStubs, driver.id]);

  const myExpenses = useMemo(() => {
    return (driverExpenses || []).filter(exp => exp.driverId === driver.id);
  }, [driverExpenses, driver.id]);

  const totalReimbursements = useMemo(() => {
    return myExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [myExpenses]);

  const myIncidents = useMemo(() => {
    return incidents.filter(inc => inc.driverId === driver.id);
  }, [incidents, driver.id]);

  const triggerSuccessMsg = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4500);
  };

  const handleCdlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cdlDate) return;
    onSubmitRenewal('CDL', cdlDate);
    setCdlDate('');
    setActiveForm(null);
    triggerSuccessMsg('Your CDL renewal credentials have been submitted to Administration for compliance verification.');
  };

  const handleMedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medDate) return;
    onSubmitRenewal('Medical Cert', medDate);
    setMedDate('');
    setActiveForm(null);
    triggerSuccessMsg('Your Medical Certification update request has been successfully filed with the Security Officer.');
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueText) return;
    onSubmitIssue(issueText);
    setIssueText('');
    setActiveForm(null);
    triggerSuccessMsg('Mechanical report successfully submitted. Vehicle maintenance schedule updated.');
  };

  const StatusCard = ({ isExpired }: { isExpired: boolean }) => {
    return (
      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
        isExpired ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
      }`}>
        {isExpired ? 'EXPIRED' : 'ACTIVE'}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Banner Card */}
      <div className="bg-slate-900 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-600/30 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest">
                Personal Compliance Desk
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                driver.taxClassification === 'W2'
                  ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400/30'
                  : 'bg-amber-500/30 text-amber-200 border-amber-400/30'
              }`}>
                {driver.taxClassification || '1099-NEC'} Pay Status
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-3">Roster Verification Unit</h1>
            <p className="text-slate-400 mt-1 max-w-xl text-sm leading-relaxed">
              Welcome back, <span className="text-white font-bold">{driver.name}</span>! This panel displays your critical DOT expiry deadlines, tax classification, and equipment status.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={() => setIsIncidentModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 border border-rose-400/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <AlertTriangle size={15} className="animate-pulse text-amber-300" />
              Report Roadside Incident
            </button>
          </div>
        </div>
      </div>

      {/* Driver Personal & Tax Profile Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Receipt className="text-indigo-600" size={16} /> Driver Profile & Tax Information
            </h3>
            <p className="text-[10px] text-slate-400">View personal information, tax status, and direct deposit routing filed with administration.</p>
          </div>

          <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
            driver.taxClassification === 'W2' 
              ? 'bg-indigo-50 text-indigo-800 border-indigo-200' 
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {driver.taxClassification === 'W2' ? 'W-2 Statutory Employee' : '1099-NEC Independent Contractor'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Box 1: Contact Details */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Personal & Contact Info</span>
            <div><strong className="text-slate-800">Phone:</strong> {driver.profileInfo?.phone || '(312) 555-0192'}</div>
            <div><strong className="text-slate-800">Email:</strong> {driver.profileInfo?.email || `${driver.name.toLowerCase().replace(' ', '.')}@fastgatelogistics.com`}</div>
            <div><strong className="text-slate-800">Address:</strong> {driver.profileInfo?.address || '1042 N Michigan Ave, Chicago, IL'}</div>
            <div><strong className="text-slate-800">Emergency Contact:</strong> {driver.profileInfo?.emergencyContactName || 'Family Contact'} ({driver.profileInfo?.emergencyContactPhone || '(312) 555-9011'})</div>
          </div>

          {/* Box 2: Tax Setup */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Tax & Pay Details</span>
            <div><strong className="text-slate-800">Tax Type:</strong> <span className="font-bold text-indigo-700">{driver.taxClassification || '1099-NEC'}</span></div>
            <div><strong className="text-slate-800">Tax ID / SSN:</strong> <span className="font-mono">{driver.profileInfo?.ssnEin || '331-XX-9812'}</span></div>
            <div><strong className="text-slate-800">Base Pay Rate:</strong> <span className="font-mono font-bold text-emerald-700">${driver.profileInfo?.payRatePerMile || 0.70}/mile</span></div>
            <p className="text-[9.5px] text-slate-500 pt-1 leading-normal italic border-t border-slate-200/60 mt-1">
              {driver.taxClassification === 'W2' 
                ? 'W-2 Status: Federal and state payroll taxes withheld automatically on weekly paystubs.'
                : '1099-NEC Status: Responsible for quarterly estimated tax filings. Form 1099-NEC issued annually.'}
            </p>
          </div>

          {/* Box 3: CDL & Direct Deposit */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">CDL & Direct Deposit</span>
            <div><strong className="text-slate-800">CDL Number:</strong> <span className="font-mono">{driver.profileInfo?.cdlNumber || 'IL-CDL-8492019'}</span> ({driver.profileInfo?.cdlState || 'IL'})</div>
            <div><strong className="text-slate-800">Endorsements:</strong> {driver.profileInfo?.endorsements?.join(', ') || 'HazMat, Tanker'}</div>
            <div><strong className="text-slate-800">Direct Deposit:</strong> {driver.profileInfo?.bankName || 'Chase Bank NA'}</div>
            <div><strong className="text-slate-800">Account #:</strong> <span className="font-mono">{driver.profileInfo?.accountNumber || '*****8492'}</span></div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 shadow-xs animate-fade-in">
          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">Document Uploaded Successfully</p>
            <p className="text-xs mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Grid: Credentials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CDL Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700">
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Commercial Driver License (CDL)</h3>
                  <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mt-0.5">DOT License</p>
                </div>
              </div>
              <StatusCard isExpired={cdlDays < 0} />
            </div>

            <div className="my-5 p-4 rounded-xl border flex justify-between items-center bg-slate-50 border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Expiration Date</p>
                <p className="text-sm font-mono font-bold text-slate-800 mt-1">{driver.cdlExpiry}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${cdlStatus.color}`}>
                {cdlStatus.text}
              </div>
            </div>
          </div>

          <button 
            onClick={() => setActiveForm(activeForm === 'cdl' ? null : 'cdl')}
            className="w-full text-center bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
          >
            <Send size={12} /> Submit License CDL Renewal
          </button>
        </div>

        {/* Medical Cert Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">FMCSA Medical Examiner Certificate</h3>
                  <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mt-0.5">Medical Cert</p>
                </div>
              </div>
              <StatusCard isExpired={medDays < 0} />
            </div>

            <div className="my-5 p-4 rounded-xl border flex justify-between items-center bg-slate-50 border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Expiration Date</p>
                <p className="text-sm font-mono font-bold text-slate-800 mt-1">{driver.medCertExpiry}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${medStatus.color}`}>
                {medStatus.text}
              </div>
            </div>
          </div>

          <button 
            onClick={() => setActiveForm(activeForm === 'med' ? null : 'med')}
            className="w-full text-center bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
          >
            <Send size={12} /> Submit Medical Exam Renewal
          </button>
        </div>
      </div>

      {/* Submission Forms Area */}
      {activeForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <PlusCircle size={16} className="text-blue-600" />
              {activeForm === 'cdl' ? 'Simulate CDL Renewal Upload' :
               activeForm === 'med' ? 'Simulate Medical Exam Certificate' :
               'Report Equipment Defect'}
            </h3>
            <button 
              onClick={() => setActiveForm(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Dismiss
            </button>
          </div>

          {activeForm === 'cdl' && (
            <form onSubmit={handleCdlSubmit} className="space-y-4">
              <p className="text-xs text-slate-500">
                Choose a new qualification expiration date. Submitting notifies the DOT auditor.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="date" 
                  required
                  min="2026-05-24"
                  className="bg-white border text-sm rounded-lg px-4 py-2 focus:ring-2 focus:ring-slate-800 outline-none flex-1 font-mono"
                  value={cdlDate}
                  onChange={(e) => setCdlDate(e.target.value)}
                />
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white uppercase tracking-wider px-6 py-2 rounded-lg transition-colors"
                >
                  File Certification
                </button>
              </div>
            </form>
          )}

          {activeForm === 'med' && (
            <form onSubmit={handleMedSubmit} className="space-y-4">
              <p className="text-xs text-slate-500">
                Choose the expiry date listed on your newly issued FMCSA medical examiner certificate form.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="date"
                  required
                  min="2026-05-24"
                  className="bg-white border text-sm rounded-lg px-4 py-2 focus:ring-2 focus:ring-slate-800 outline-none flex-1 font-mono"
                  value={medDate}
                  onChange={(e) => setMedDate(e.target.value)}
                />
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white uppercase tracking-wider px-6 py-2 rounded-lg transition-colors"
                >
                  File CDL Medical Cert
                </button>
              </div>
            </form>
          )}

          {activeForm === 'issue' && (
            <form onSubmit={handleIssueSubmit} className="space-y-4">
              <p className="text-xs text-slate-500">
                Briefly describe the safety or maintenance issue. This will flag the truck on the dispatch line and schedule repair.
              </p>
              <div className="flex flex-col gap-3">
                <textarea 
                  required
                  placeholder="Examples: Brakes spongy, Tread low on right rear axle, Check Engine Light is active..."
                  className="bg-white border text-sm rounded-lg px-4 py-2 h-20 focus:ring-2 focus:ring-slate-800 outline-none w-full"
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                />
                <button 
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white uppercase tracking-wider py-2.5 rounded-lg transition-colors self-end w-48"
                >
                  Post DVIR Mechanical Log
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Roster & Equipment Connection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Allocated vehicle status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Truck size={16} className="text-blue-600" /> Assigned Fleet Equipment Details
            </h3>

            {assignedVehicle ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Unit Number (ID)</span>
                    <span className="font-bold text-slate-800">{assignedVehicle.unitNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Equipment VIN</span>
                    <span className="font-bold text-slate-800 text-xs">{assignedVehicle.vin}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Inspection Expiration</span>
                    <span className="font-bold text-slate-800">{assignedVehicle.inspectionExpiry}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Service Scheduler</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block mt-0.5 ${
                      assignedVehicle.maintenanceStatus === 'Up to Date' ? 'bg-emerald-100 text-emerald-800' :
                      assignedVehicle.maintenanceStatus === 'Scheduled' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {assignedVehicle.maintenanceStatus}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-100 text-[11px] text-slate-500">
                  <AlertCircle size={14} className="text-blue-500" />
                  <span>Before hauling, execute-first the standard pre-trip 30-point inspection check.</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No vehicle is assigned to your profile in the dispatcher roster list.</p>
            )}
          </div>

          <button 
            onClick={() => setActiveForm(activeForm === 'issue' ? null : 'issue')}
            className="w-full text-center hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 rounded-lg transition-colors border mt-4"
          >
            Report Active Mechanical/Safety Issue on Vehicle
          </button>
        </div>

        {/* Requests tracker history */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <History size={16} className="text-slate-500" /> Upload Handshake Logs
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-56 pr-1">
            {myRequests.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                <p>No document requests filed yet.</p>
                <p className="mt-1 text-[10px]">Use license tools above to query updates.</p>
              </div>
            ) : (
              myRequests.map((req) => (
                <div key={req.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs flex flex-col gap-1.5">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-800 uppercase tracking-widest text-[9px]">{req.type}</span>
                    <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-extrabold uppercase ${
                      req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'Declined' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800 font-mono flex items-center gap-0.5'
                    }`}>
                      {req.status === 'Pending' && <Clock size={8} />}
                      {req.status}
                    </span>
                  </div>
                  <div>
                    {req.type === 'Vehicle Issue' ? (
                      <p className="text-slate-500 text-[10px] italic">"{req.requestedValue}"</p>
                    ) : (
                      <p className="text-slate-500 text-[10px]">Proposed renewal date: <span className="font-semibold text-slate-800 font-mono">{req.requestedValue}</span></p>
                    )}
                  </div>
                  <div className="flex items-center text-[9px] text-slate-400 border-t border-slate-100/70 pt-1 justify-between">
                    <span>Filed: {req.submittedAt}</span>
                    {req.status === 'Approved' && <CheckCircle size={10} className="text-emerald-500" />}
                    {req.status === 'Declined' && <XCircle size={10} className="text-rose-500" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Roadside Emergencies & Incident Center */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="text-rose-600" size={16} /> Roadside Emergencies & Incident Dispatch
              </h3>
              {myIncidents.filter(i => i.status !== 'Resolved / Cleared').length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                  {myIncidents.filter(i => i.status !== 'Resolved / Cleared').length} Active
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              FMCSA roadside breakdown & accident protocol. All events automatically sync with Central Dispatch and create permanent entries in the carrier Audit Trail.
            </p>
          </div>

          <button
            onClick={() => setIsIncidentModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all shrink-0"
          >
            <AlertTriangle size={14} />
            Report Roadside Incident
          </button>
        </div>

        {myIncidents.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-150 text-center space-y-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 mx-auto">
              <Shield size={20} />
            </div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">No Active Roadside Incidents</h4>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Your equipment and route operate under nominal safety status. If you experience a mechanical breakdown, flat tire, accident, or DOT inspection, click above to alert dispatch immediately.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myIncidents.map((incident) => (
              <div 
                key={incident.id} 
                className={`p-4 rounded-xl border text-xs space-y-3 transition-all ${
                  incident.status === 'Open - Dispatch Action Required'
                    ? 'bg-rose-50/70 border-rose-200'
                    : incident.status === 'In Progress - Assistance Dispatched'
                    ? 'bg-amber-50/60 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {incident.id}
                    </span>
                    <span className="font-bold text-slate-800">
                      {incident.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      incident.severity === 'Critical' ? 'bg-rose-600 text-white' :
                      incident.severity === 'Major' ? 'bg-amber-500 text-slate-950' :
                      'bg-blue-600 text-white'
                    }`}>
                      {incident.severity}
                    </span>
                  </div>

                  {/* Status indicator */}
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    incident.status === 'Open - Dispatch Action Required'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : incident.status === 'In Progress - Assistance Dispatched'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {incident.status === 'In Progress - Assistance Dispatched' && <Wrench size={11} />}
                    {incident.status === 'Resolved / Cleared' && <CheckCircle size={11} />}
                    {incident.status}
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-slate-150">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Location</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-rose-500 shrink-0" />
                      {incident.location}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Vehicle & Load</span>
                    <span className="font-mono text-slate-700 font-semibold block mt-0.5">
                      Truck {incident.truckId} {incident.loadId ? `• ${incident.loadId}` : '• Empty'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Drivability & Safety</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {incident.isVehicleDrivable ? '✓ Drivable' : '✕ Immobilized'} • {incident.injuriesReported ? '🚨 Injury Reported' : 'No Injuries'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Reported At</span>
                    <span className="font-mono text-slate-600 block mt-0.5">
                      {incident.reportedAt}
                    </span>
                  </div>
                </div>

                {/* Statement */}
                <p className="text-slate-700 bg-white/70 p-2.5 rounded-lg border border-slate-150 leading-relaxed text-[11px]">
                  <strong className="text-slate-900 font-bold">Driver Statement:</strong> {incident.description}
                </p>

                {/* Assistance Needed Chips */}
                {incident.assistanceNeeded.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-bold">Requested:</span>
                    {incident.assistanceNeeded.map((item, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {/* Dispatch Response Tracker */}
                {(incident.serviceVendor || incident.dispatchNotes) && (
                  <div className="bg-white border border-indigo-200 p-3 rounded-xl space-y-1 text-slate-800">
                    <div className="flex items-center justify-between text-indigo-900 font-bold text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Activity size={13} className="text-indigo-600" /> Dispatch Response Update
                      </span>
                      {incident.etaMinutes && (
                        <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded font-mono text-[10px]">
                          ETA ~{incident.etaMinutes} mins
                        </span>
                      )}
                    </div>
                    {incident.serviceVendor && (
                      <p className="text-[11px] text-slate-700">
                        <strong>Assistance Provider:</strong> {incident.serviceVendor}
                      </p>
                    )}
                    {incident.dispatchNotes && (
                      <p className="text-[10.5px] text-slate-600 italic">
                        "{incident.dispatchNotes}"
                      </p>
                    )}
                  </div>
                )}

                {incident.policeReportNumber && (
                  <div className="text-[10px] text-blue-800 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded">
                    <strong>Law Enforcement Record:</strong> {incident.policeReportNumber}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Cargo Trips Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Compass size={16} className="text-indigo-600 animate-spin-slow" /> My Assigned cargo dispatch routes
        </h3>
        
        {myLoads.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-450 space-y-1">
            <p className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">No Dispatched Trips Assigned</p>
            <p className="text-slate-400">The dispatcher has not assigned any active freight routes to your equipment index yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myLoads.map((load) => (
              <div key={load.id} className="p-4 bg-slate-50 border border-slate-250/60 rounded-xl space-y-3 px-4 py-4 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-black bg-white px-2 py-0.5 border border-slate-200 text-slate-800 rounded">
                      {load.loadNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest block mt-1">Cargo: {load.cargoType}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    load.status === 'Delivered' ? 'bg-emerald-100 text-emerald-850' :
                    load.status === 'Dispatched' ? 'bg-blue-100 text-blue-800 border border-blue-200/50 animate-pulse' :
                    'bg-amber-100 text-amber-855'
                  }`}>
                    {load.status}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-100 flex items-center justify-between text-slate-700">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin size={12} className="text-emerald-500 shrink-0" />
                    <span className="font-semibold truncate">{load.originHub}</span>
                  </div>
                  <ArrowRight size={12} className="text-slate-400 shrink-0 mx-2" />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin size={12} className="text-red-500 shrink-0" />
                    <span className="font-semibold truncate text-right">{load.destinationHub}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono border-t border-b border-slate-200/45 py-2">
                  <span className="text-slate-500">Est. Distance: <strong className="text-slate-800">{load.calculatedMiles} mi</strong></span>
                  <span className="text-slate-500">Payload Weight: <strong className="text-slate-800">{load.weightLbs.toLocaleString()} lbs</strong></span>
                </div>

                {/* Driver Documentation & Auto-Billing Workflow */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-slate-800 font-bold border-b pb-1.5">
                    <span className="flex items-center gap-1.5 text-indigo-900">
                      <FileText size={13} className="text-indigo-600" /> Trip Billing Documentation
                    </span>
                    {load.rateConFile && load.bolFile ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
                        <Check size={10} /> Billing Ready
                      </span>
                    ) : (
                      <span className="text-[9px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-mono">
                        {load.rateConFile ? '1/2 Docs' : '0/2 Docs'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {/* Rate Con Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[10px]">Dispatch Rate Con:</span>
                      {load.rateConFile ? (
                        <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                          <Check size={11} /> Attached ({load.rateConFile.name})
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">Awaiting Dispatch</span>
                      )}
                    </div>

                    {/* Driver BOL (POD) */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[10px]">Signed BOL (POD):</span>
                      {load.bolFile ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                            <Check size={11} /> Uploaded
                          </span>
                          {onUpdateLoadDocs && (
                            <label className="text-[9px] text-indigo-600 hover:text-indigo-800 underline cursor-pointer">
                              Replace
                              <input 
                                type="file" 
                                accept=".pdf,.png,.jpg,.jpeg" 
                                className="hidden" 
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    const file = e.target.files[0];
                                    const bolData = {
                                      name: file.name,
                                      size: Math.round(file.size / 1024),
                                      dataUrl: URL.createObjectURL(file)
                                    };
                                    onUpdateLoadDocs(load.id, load.rateConFile, bolData, undefined, load.lumperReceiptFile);
                                  }
                                }} 
                              />
                            </label>
                          )}
                        </div>
                      ) : (
                        onUpdateLoadDocs && (
                          <label className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1">
                            + Upload Signed BOL
                            <input 
                              type="file" 
                              accept=".pdf,.png,.jpg,.jpeg" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  const file = e.target.files[0];
                                  const bolData = {
                                    name: file.name,
                                    size: Math.round(file.size / 1024),
                                    dataUrl: URL.createObjectURL(file)
                                  };
                                  onUpdateLoadDocs(load.id, load.rateConFile, bolData, undefined, load.lumperReceiptFile);
                                }
                              }} 
                            />
                          </label>
                        )
                      )}
                    </div>

                    {/* Driver Lumper */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[10px]">Lumper Receipt:</span>
                      {load.lumperReceiptFile || (load.lumperAmount && load.lumperAmount > 0) ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-blue-700 font-bold text-[10px] flex items-center gap-1">
                            <Receipt size={11} /> ${(load.lumperAmount || load.lumperReceiptFile?.amount || 0).toFixed(2)}
                          </span>
                          {onUpdateLoadDocs && (
                            <label className="text-[9px] text-blue-600 hover:text-blue-800 underline cursor-pointer">
                              Change
                              <input 
                                type="file" 
                                accept=".pdf,.png,.jpg,.jpeg" 
                                className="hidden" 
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    const file = e.target.files[0];
                                    const amtStr = prompt('Enter reimbursable lumper amount ($ USD):', '185.00');
                                    const amt = parseFloat(amtStr || '0');
                                    if (amt > 0) {
                                      const lumperData = {
                                        name: file.name,
                                        size: Math.round(file.size / 1024),
                                        dataUrl: URL.createObjectURL(file),
                                        amount: amt
                                      };
                                      onUpdateLoadDocs(load.id, load.rateConFile, load.bolFile, undefined, lumperData);
                                    }
                                  }
                                }} 
                              />
                            </label>
                          )}
                        </div>
                      ) : (
                        onUpdateLoadDocs && (
                          <label className="text-[10px] text-indigo-600 hover:text-indigo-800 underline cursor-pointer font-semibold">
                            + Upload Lumper
                            <input 
                              type="file" 
                              accept=".pdf,.png,.jpg,.jpeg" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  const file = e.target.files[0];
                                  const amtStr = prompt('Enter reimbursable lumper amount ($ USD):', '185.00');
                                  const amt = parseFloat(amtStr || '0');
                                  if (amt > 0) {
                                    const lumperData = {
                                      name: file.name,
                                      size: Math.round(file.size / 1024),
                                      dataUrl: URL.createObjectURL(file),
                                      amount: amt
                                    };
                                    onUpdateLoadDocs(load.id, load.rateConFile, load.bolFile, undefined, lumperData);
                                  }
                                }
                              }} 
                            />
                          </label>
                        )
                      )}
                    </div>
                  </div>

                  {/* Auto-compiled Billing Notification */}
                  {load.rateConFile && load.bolFile && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-[10px] text-emerald-800 font-semibold flex items-center gap-1.5 mt-1">
                      <Sparkles size={12} className="text-emerald-600 shrink-0 animate-pulse" />
                      <span>Invoice <strong>INV-{load.loadNumber}</strong> automatically compiled & ready in Accounting Hub!</span>
                    </div>
                  )}
                </div>

                {onUpdateLoadStatus && (
                  <div className="pt-1 flex justify-end">
                    {load.status === 'Active' && (
                      <button
                        onClick={() => onUpdateLoadStatus(load.id, 'Dispatched')}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                      >
                        Start Trip (Depart Hub)
                      </button>
                    )}
                    {load.status === 'Dispatched' && (
                      <button
                        onClick={() => onUpdateLoadStatus(load.id, 'Delivered')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                      >
                        Confirm Delivery (Unload)
                      </button>
                    )}
                    {load.status === 'Delivered' && (
                      <span className="text-emerald-600 font-bold text-[10px] uppercase flex items-center gap-1">
                        ✓ Delivery Complete
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Driver Weekly Pay Stubs / Settlements section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Receipt size={16} className="text-emerald-600" /> My Weekly Settlements & Payroll
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Review completed trip compensations, itemized deductions, and upload out-of-pocket receipts to be automatically reimbursed on payroll.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle size={14} />
            Upload Out-of-Pocket Expense
          </button>
        </div>

        {myPayStubs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-450 space-y-1">
            <p className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">No Weekly Settlements Found</p>
            <p className="text-slate-400 font-medium">As dispatch loads are created and completed, your weekly paychecks will compile here dynamically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myPayStubs.map((stub) => (
              <div 
                key={stub.id} 
                onClick={() => setSelectedStub(stub)}
                className="p-4 bg-slate-50 border border-slate-200 hover:border-emerald-350 cursor-pointer rounded-xl transition-all flex flex-col justify-between gap-3 text-xs"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Statement Period</span>
                    <strong className="text-slate-800 text-sm font-semibold">Week ending {stub.weekEndingDate}</strong>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                    stub.status === 'Paid' ? 'bg-emerald-55 bg-opacity-10 text-emerald-700 border-emerald-200/50' :
                    stub.status === 'Approved' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/50 animate-pulse' :
                    'bg-amber-50 text-amber-700 border-amber-200/50'
                  }`}>
                    {stub.status}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 font-mono text-[11px]">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-sans">Accumulated Miles</span>
                    <strong className="text-slate-700">{stub.totalMiles} Miles</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block uppercase font-sans font-bold">Gross Settlement</span>
                    <strong className="text-emerald-700 text-sm font-black">${stub.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>

                <div className="text-[10px] text-indigo-600 font-bold hover:text-indigo-700 flex items-center justify-end gap-0.5">
                  View Detailed Pay stub advice →
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Driver Out-of-Pocket Reimbursement Registry */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Scale size={13} className="text-indigo-600" />
              My Submitted Out-of-Pocket Expenses (Scales, Lumpers, Tolls, Washouts)
            </h4>
            <span className="text-[11px] font-mono text-emerald-700 font-bold">
              Total Pending Reimbursements: ${totalReimbursements.toFixed(2)}
            </span>
          </div>

          {myExpenses.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 space-y-1">
              <p>No out-of-pocket expenses uploaded yet.</p>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(true)}
                className="text-emerald-600 hover:text-emerald-700 font-bold underline text-[11px]"
              >
                Upload your first receipt (CAT scale, lumper, toll, washout)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myExpenses.map((exp) => (
                <div key={exp.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {exp.category}
                      </span>
                      <p className="font-bold text-slate-800 text-xs mt-1 truncate max-w-[170px]">{exp.description}</p>
                    </div>
                    <strong className="text-emerald-700 font-mono text-sm">${exp.amount.toFixed(2)}</strong>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-200/60 pt-1.5">
                    <span>{exp.date}</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1 font-sans">
                      <CheckCircle size={10} /> {exp.payrollStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paycheck detail popover overlay */}
      {selectedStub && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:bg-white print:p-0">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-scale-up printable-invoice">
            
            <div className="bg-slate-950 p-4 font-mono text-white flex justify-between items-center print:hidden">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-indigo-400 block">Statement detail</span>
                <strong className="text-xs text-slate-200">ID: #{selectedStub.id.substring(0, 12)}</strong>
              </div>
              <button 
                onClick={() => setSelectedStub(null)}
                className="text-slate-400 hover:text-white px-2 py-1 text-xs bg-slate-850 hover:bg-slate-800 rounded-lg transition-colors font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[460px] overflow-y-auto">
              <div className="flex justify-between items-start text-slate-500">
                <div>
                  <strong className="text-slate-900 block font-black uppercase text-[11px]">FASTGATE CARRIERS, INC.</strong>
                  <span className="text-[10px] leading-relaxed block font-medium">950 Freight Way, Chicago Corporate Hub<br/>Federal Tax ID: XX-XXX4910</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] block uppercase font-bold text-slate-400">Statement week</span>
                  <strong className="text-slate-900 block font-mono">Week Ending {selectedStub.weekEndingDate}</strong>
                </div>
              </div>

              {/* Payout & status indicators */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">Funds status</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                      selectedStub.status === 'Paid' ? 'bg-emerald-500' :
                      selectedStub.status === 'Approved' ? 'bg-indigo-500' : 'bg-amber-500'
                    }`} />
                    <span className="font-bold text-slate-800 uppercase text-[10px]">{selectedStub.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">Issued on date</span>
                  <strong className="text-slate-700 font-mono font-semibold block mt-0.5">{selectedStub.issuedAt.split(' ')[0]}</strong>
                </div>
              </div>

              {/* Items math */}
              <div className="border-t border-slate-150 pt-4 space-y-2 font-mono text-slate-700">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans mb-1">Deductions & earnings ledger</span>
                
                <div className="flex justify-between">
                  <span>Base Driver Route Cargo Pay:</span>
                  <span className="text-slate-800 font-bold">${selectedStub.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>CDL Safe Driver Award Bonus:</span>
                  <span>+$150.00</span>
                </div>
                {/* Reimbursed out-of-pocket expenses (scales, lumpers, tolls) */}
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded">
                  <span>Out-of-Pocket Reimbursements (Scales / Lumpers / Tolls):</span>
                  <span>+${(selectedStub.reimbursements ?? totalReimbursements).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Fuel Tax Surcharge Levy (Corp):</span>
                  <span>-$45.00</span>
                </div>
                
                <div className="flex justify-between border-t border-slate-200 pt-2 text-xs text-slate-950 font-extrabold">
                  <span className="uppercase">Net Weekly deposit:</span>
                  <span className="text-sm text-indigo-700 font-black">
                    ${(selectedStub.grossAmount + 150 - 45 + (selectedStub.reimbursements ?? totalReimbursements)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Legal disclaimer */}
              <div className="bg-slate-50 p-2.5 border border-slate-150 rounded text-[9px] text-slate-400 leading-normal">
                This document serves as an official weekly settlement summary. All direct deposits are forwarded directly to the driver's registered routing bank accounts matching active FMCSA DOT profiles.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end print:hidden">
              <button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider transition-colors flex items-center gap-1"
              >
                🖨️ Print Settlement
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Roadside Incident Reporting Modal */}
      {isIncidentModalOpen && (
        <IncidentReportingModal
          driver={driver}
          assignedVehicle={assignedVehicle}
          assignedLoads={myLoads}
          onClose={() => setIsIncidentModalOpen(false)}
          onSubmitIncident={(incidentData) => {
            if (onReportIncident) {
              onReportIncident(incidentData);
            }
            setIsIncidentModalOpen(false);
            triggerSuccessMsg('Roadside incident reported to Central Dispatch! An official event has been recorded in the Audit Trail and dispatch assistance is alerted.');
          }}
        />
      )}

      {/* Driver Out-of-Pocket Expense Modal */}
      {isExpenseModalOpen && (
        <DriverExpenseModal
          driver={driver}
          loads={assignedLoads}
          existingExpenses={myExpenses}
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSubmitExpense={(newExp) => {
            if (onAddDriverExpense) {
              onAddDriverExpense(newExp);
            }
            triggerSuccessMsg('Expense receipt uploaded! Reimbursable amount queued for automatic payroll addition.');
          }}
        />
      )}
    </div>
  );
}
