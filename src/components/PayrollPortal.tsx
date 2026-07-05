import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Award, 
  CheckCircle2, 
  CreditCard, 
  FileText, 
  ChevronRight, 
  Download, 
  Printer, 
  Receipt, 
  History,
  TrendingUp,
  FileCheck2,
  AlertCircle,
  Truck,
  Users
} from 'lucide-react';
import { PayStub, DispatchLoad, Driver } from '../types';

interface PayrollPortalProps {
  payStubs: PayStub[];
  loads: DispatchLoad[];
  drivers: Driver[];
  currentUserRole: string;
  onUpdateStubStatus: (id: string, status: PayStub['status']) => void;
}

export default function PayrollPortal({
  payStubs,
  loads,
  drivers,
  currentUserRole,
  onUpdateStubStatus
}: PayrollPortalProps) {
  const [selectedStub, setSelectedStub] = useState<PayStub | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | PayStub['status']>('ALL');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');

  // Computed metrics
  const stats = useMemo(() => {
    let totalGross = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let paidCount = 0;

    payStubs.forEach(stub => {
      totalGross += stub.grossAmount;
      if (stub.status === 'Pending Review') pendingCount++;
      else if (stub.status === 'Approved') approvedCount++;
      else if (stub.status === 'Paid') paidCount++;
    });

    return {
      totalGross,
      pendingCount,
      approvedCount,
      paidCount,
      totalStubs: payStubs.length
    };
  }, [payStubs]);

  const filteredStubs = useMemo(() => {
    return payStubs.filter(stub => {
      const matchStatus = statusFilter === 'ALL' || stub.status === statusFilter;
      const matchDriver = driverFilter === 'ALL' || stub.driverId === driverFilter;
      return matchStatus && matchDriver;
    });
  }, [payStubs, statusFilter, driverFilter]);

  // Find loads details for a given stub
  const getStubLoadDetails = (stub: PayStub) => {
    return loads.filter(l => stub.loadIds.includes(l.id));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden shadow-md border border-slate-700">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/35 uppercase tracking-widest">
              Automated Operations Ledger
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-3">Driver Weekly Pay Stubs & Settlements</h1>
            <p className="text-slate-300 mt-1 max-w-2xl text-sm leading-relaxed">
              When drivers are assigned dispatch loads, their hours and miles automatically compile into clean weekly invoices. Manage direct deposit authorizations easily.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-4 border border-white/10 rounded-xl text-center shadow-xs">
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider block">Total Period Settlement</span>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              ${stats.totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Paychecks Issued</p>
          <p className="text-2xl font-black text-slate-900">{stats.totalStubs} Weekly Stubs</p>
        </div>
        <div className="bg-white p-4.5 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Awaiting Signoff</p>
          <p className="text-2xl font-black text-amber-500">{stats.pendingCount} Pending CEO Approval</p>
        </div>
        <div className="bg-white p-4.5 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Approved for Deposit</p>
          <p className="text-2xl font-black text-indigo-600">{stats.approvedCount} In Queue</p>
        </div>
        <div className="bg-white p-4.5 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Released (Paid)</p>
          <p className="text-2xl font-black text-emerald-600">{stats.paidCount} Transferred</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main List Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            
            {/* Filter Section */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Settlements Roster</h3>
                <p className="text-[10px] text-slate-400">Review pay scales generated dynamically via loads routing metrics.</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 text-[11px] outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid (Transferred)</option>
                </select>

                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 text-[11px] outline-none max-w-[130px]"
                >
                  <option value="ALL">All Operators</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List Table or cards */}
            <div className="divide-y divide-slate-150 mt-2 max-h-[500px] overflow-y-auto">
              {filteredStubs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Receipt size={24} className="mx-auto text-slate-300" />
                  <p className="font-extrabold uppercase tracking-widest text-[10px]">No Matching Settlements</p>
                  <p className="text-slate-500 max-w-xs mx-auto">Either select different filters or instruct the Dispatcher to post fresh contract loads assigned to drivers.</p>
                </div>
              ) : (
                filteredStubs.map(stub => (
                  <div 
                    key={stub.id} 
                    onClick={() => setSelectedStub(stub)}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs ${
                      selectedStub?.id === stub.id ? 'bg-slate-50/90 border-r-4 border-indigo-500' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-800 text-sm">{stub.driverName}</strong>
                        <span className="text-[10px] bg-slate-100 font-mono text-slate-500 px-1.5 rounded uppercase font-bold border border-slate-200/50">
                          ID: {stub.driverId}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                        <span>Period Ending: <strong>{stub.weekEndingDate}</strong></span>
                        <span>•</span>
                        <span>Contains <strong>{stub.loadIds.length} loads</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                      <div className="text-right">
                        <span className="text-slate-500 text-[9px] block uppercase font-mono">Accrued Weeks pay</span>
                        <strong className="text-sm font-black font-mono text-indigo-700">${stub.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border ${
                          stub.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-250/50' :
                          stub.status === 'Approved' ? 'bg-indigo-50 text-indigo-700 border-indigo-250/50' :
                          'bg-amber-50 text-amber-700 border-amber-250/50'
                        }`}>
                          {stub.status}
                        </span>
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

        {/* Detailed Invoice / Pay Stub Review Column */}
        <div className="lg:col-span-5">
          {selectedStub ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 print:border-none print:shadow-none printable-invoice">
              
              {/* stub visual preview metadata */}
              <div className="bg-slate-900 text-white p-5 space-y-2 print:hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-indigo-400 uppercase font-black tracking-widest font-mono">DOT Settlement Advice</span>
                    <h3 className="text-sm font-bold text-slate-100 mt-1">Settlement ID: #{selectedStub.id.substring(0, 10)}</h3>
                  </div>
                  <div className="flex gap-1.5 print:hidden">
                    <button 
                      onClick={handlePrint}
                      className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-[10px] font-extrabold tracking-wide uppercase transition-colors text-slate-200 flex items-center gap-1"
                      title="Print Weekly Invoice"
                    >
                      <Printer size={11} /> Print PDF
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800 text-slate-300 font-mono">
                  <span>Payee: <strong>{selectedStub.driverName}</strong></span>
                  <span>Issued: <strong>{selectedStub.issuedAt.split(' ')[0]}</strong></span>
                </div>
              </div>

              {/* simulated official invoice structure */}
              <div className="p-5 space-y-4 text-xs font-sans">
                
                {/* Hub logo and headers */}
                <div className="flex justify-between items-start text-slate-500">
                  <div>
                    <strong className="text-slate-900 block font-black uppercase text-xs">FASTGATE CARRIERS, INC.</strong>
                    <span className="text-[10px] leading-relaxed block font-medium">950 Freight Way, Chicago Corporate Hub<br/>Federal Tax ID: XX-XXX4910</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] block uppercase font-bold text-slate-400">Statement Period</span>
                    <strong className="text-slate-900 block font-mono text-xs">Week Ending {selectedStub.weekEndingDate}</strong>
                  </div>
                </div>

                {/* Loads detail breakdown table */}
                <div className="space-y-2.5 border-t border-slate-150 pt-4">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Cargo Route Settlements Included</span>
                  
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {getStubLoadDetails(selectedStub).map(load => (
                      <div key={load.id} className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg space-y-1.5 flex flex-col">
                        <div className="flex justify-between items-center font-mono">
                          <strong className="text-slate-850 bg-slate-200/50 border border-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                            {load.loadNumber}
                          </strong>
                          <span className="font-extrabold text-slate-750">${load.payout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span className="truncate max-w-[180px]">{load.originHub} → {load.destinationHub}</span>
                          <span>{load.calculatedMiles} mi @ ${load.ratePerMile}/mi</span>
                        </div>
                      </div>
                    ))}

                    {/* Fallback if load records deleted or not cached in localStorage */}
                    {getStubLoadDetails(selectedStub).length === 0 && (
                      <div className="text-[10px] text-slate-500 leading-normal bg-amber-50 p-2 border border-amber-150 rounded">
                        Note: Related active load record records were cleared or updated; retaining historical summary metrics: ${selectedStub.grossAmount.toLocaleString()} gross value, {selectedStub.totalMiles} total running miles.
                      </div>
                    )}
                  </div>
                </div>

                {/* Professional deductions & gross payout math */}
                <div className="border-t border-slate-150 pt-4 space-y-2 font-mono text-[11px] text-slate-650">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans mb-1">Payroll Deductions & Ledger Breakdown</span>
                  
                  <div className="flex justify-between">
                    <span>Base Driver Route Cargo Pay:</span>
                    <span className="text-slate-800 font-bold">${selectedStub.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1">CDL Compliant Safe Driver Bonus: <Award size={11} /></span>
                    <span>+$150.00</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Fuel Tax Surcharge Levy (Corporate):</span>
                    <span>-$45.00</span>
                  </div>
                  
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-xs text-slate-900 font-extrabold">
                    <span className="uppercase">Net Weekly Settlement:</span>
                    <span className="text-sm text-indigo-700 font-black">${(selectedStub.grossAmount + 150 - 45).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Change state actions for CEO (Safety Manager & CEO) */}
                <div className="border-t border-slate-150 pt-4 space-y-2.5 print:hidden">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Release & Authorize Funds (CEO Desk)</span>
                  
                  {currentUserRole === 'Safety Manager & CEO' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedStub.status === 'Pending Review' && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateStubStatus(selectedStub.id, 'Approved');
                            setSelectedStub(prev => prev ? { ...prev, status: 'Approved' } : null);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                        >
                          <FileCheck2 size={12} /> Approve Settlement
                        </button>
                      )}
                      
                      {(selectedStub.status === 'Pending Review' || selectedStub.status === 'Approved') && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateStubStatus(selectedStub.id, 'Paid');
                            setSelectedStub(prev => prev ? { ...prev, status: 'Paid' } : null);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 col-span-2 transition-colors"
                        >
                          <CreditCard size={12} /> Release Direct Deposit Weekly Funds
                        </button>
                      )}

                      {selectedStub.status === 'Paid' && (
                        <div className="col-span-2 bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-150 text-center flex items-center justify-center gap-1.5 font-bold text-[10px] uppercase">
                          <CheckCircle2 className="text-emerald-500" size={14} /> Settlement Complete & Released to Carrier Direct Deposit File
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-100 p-3 rounded-lg text-slate-500 text-[10px] leading-relaxed flex items-start gap-2">
                      <AlertCircle size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                      <span>
                        🔒 Authorization Denied: This pay stub settlement statement is currently **{selectedStub.status}**. Only the **Safety Manager & CEO** is permitted to release weekly funds or sign off on corporate settlements.
                      </span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 text-center rounded-2xl text-xs text-slate-400 space-y-2">
              <FileText size={32} className="mx-auto text-slate-300" />
              <p className="font-extrabold uppercase tracking-widest text-[10px]">Select Settlement File</p>
              <p className="text-slate-500 max-w-xs mx-auto leading-normal">
                Click on any operator's weekly record on the left roster list to project their formal digital settlement advice, inspect loads log breakdown, and authorize payouts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
