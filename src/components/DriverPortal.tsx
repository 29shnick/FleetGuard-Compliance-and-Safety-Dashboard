import React, { useState, useMemo } from 'react';
import { 
  Driver, 
  Vehicle, 
  RenewalRequest, 
  ComplianceStatus,
  DispatchLoad,
  PayStub
} from '../types';
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
  Receipt
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
}

export default function DriverPortal({ 
  driver, 
  vehicles, 
  renewalRequests, 
  onSubmitRenewal,
  onSubmitIssue,
  assignedLoads = [],
  onUpdateLoadStatus,
  payStubs = []
}: DriverPortalProps) {
  const [cdlDate, setCdlDate] = useState('');
  const [medDate, setMedDate] = useState('');
  const [issueText, setIssueText] = useState('');
  const [activeForm, setActiveForm] = useState<'cdl' | 'med' | 'issue' | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedStub, setSelectedStub] = useState<PayStub | null>(null);

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
        <div className="relative z-10">
          <span className="bg-blue-600/30 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest">
            Personal Compliance Desk
          </span>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-3">Roster Verification Unit</h1>
          <p className="text-slate-400 mt-1 max-w-xl text-sm leading-relaxed">
            Welcome back, <span className="text-white font-bold">{driver.name}</span>! This panel displays your critical DOT expiry deadlines and equipment status.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none hidden md:block"></div>
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Receipt size={16} className="text-emerald-600" /> My Weekly Settlements & Paychecks
        </h3>

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
                <div className="flex justify-between text-rose-600">
                  <span>Fuel Tax Surcharge Levy (Corp):</span>
                  <span>-$45.00</span>
                </div>
                
                <div className="flex justify-between border-t border-slate-200 pt-2 text-xs text-slate-950 font-extrabold">
                  <span className="uppercase">Net Weekly deposit:</span>
                  <span className="text-sm text-indigo-700 font-black">${(selectedStub.grossAmount + 150 - 45).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
    </div>
  );
}
