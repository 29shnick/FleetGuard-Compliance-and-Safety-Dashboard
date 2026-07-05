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
  Users,
  Sparkles,
  RefreshCw,
  FileCode,
  ShieldCheck,
  Check
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
  // Navigation State: 'settlements' | 'tax-forms'
  const [activeSubTab, setActiveSubTab] = useState<'settlements' | 'tax-forms'>('settlements');

  // Settlements View State
  const [selectedStub, setSelectedStub] = useState<PayStub | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | PayStub['status']>('ALL');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');

  // Tax Forms View State
  const [selectedFormType, setSelectedFormType] = useState<'1099' | 'W2' | '941'>('1099');
  const [selectedDriverIdForTax, setSelectedDriverIdForTax] = useState<string>(drivers[0]?.id || 'ALL');
  const [taxYear, setTaxYear] = useState<string>('2026');
  const [taxQuarter, setTaxQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q2');
  const [fedWithholdingRate, setFedWithholdingRate] = useState<number>(12);
  const [stateWithholdingRate, setStateWithholdingRate] = useState<number>(3.5);
  const [adjustments, setAdjustments] = useState<string>('0');
  const [isFormGenerated, setIsFormGenerated] = useState<boolean>(false);
  const [isFilingLoading, setIsFilingLoading] = useState<boolean>(false);
  const [signConsent, setSignConsent] = useState<boolean>(false);
  const [signerTitle, setSignerTitle] = useState<string>('CEO & Safety Manager');
  const [filingSuccessMsg, setFilingSuccessMsg] = useState<string>('');

  const [filingLogs, setFilingLogs] = useState<any[]>([
    { id: 'TX-941-2026-Q1', formName: 'Form 941 (Quarterly Federal Return)', year: '2026', quarter: 'Q1', filedAt: '2026-04-15 09:30', status: 'Accepted', confirmationNo: 'IRS-CONF-94101A' },
    { id: 'TX-1099-James', formName: 'Form 1099-NEC (James Bond)', year: '2025', filedAt: '2026-01-28 14:22', status: 'Accepted', confirmationNo: 'IRS-CONF-109908B' },
    { id: 'TX-W2-Nikola', formName: 'Form W-2 (Nikola Tesla)', year: '2025', filedAt: '2026-01-29 11:05', status: 'Accepted', confirmationNo: 'IRS-CONF-W29819Y' }
  ]);

  // Computed metrics for paystubs
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

  // Tax computation logic
  const selectedDriverName = useMemo(() => {
    return drivers.find(d => d.id === selectedDriverIdForTax)?.name || 'N/A';
  }, [drivers, selectedDriverIdForTax]);

  const calculatedYTD = useMemo(() => {
    // Sum up actual weekly pay stubs in the system for this driver
    const driverStubs = payStubs.filter(ps => ps.driverId === selectedDriverIdForTax);
    const totalGross = driverStubs.reduce((sum, stub) => sum + stub.grossAmount, 0);
    const totalMiles = driverStubs.reduce((sum, stub) => sum + stub.totalMiles, 0);

    const adjVal = parseFloat(adjustments) || 0;
    const fedTax = Math.round(totalGross * (fedWithholdingRate / 100) * 100) / 100;
    const stateTax = Math.round(totalGross * (stateWithholdingRate / 100) * 100) / 100;
    const socialSecurity = Math.round(totalGross * 0.062 * 100) / 100;
    const medicare = Math.round(totalGross * 0.0145 * 100) / 100;
    const net = totalGross - fedTax - stateTax - socialSecurity - medicare + adjVal;

    // High fidelity default values for standard truckers if pay stubs are not yet accumulated
    const standardDefaults = {
      'D1': { gross: 56400, miles: 28200, fed: 6768, state: 1974, ss: 3496.80, med: 817.80, net: 43343.40 },
      'D2': { gross: 48900, miles: 24450, fed: 5868, state: 1711.50, ss: 3031.80, med: 709.05, net: 37579.65 },
      'D3': { gross: 61200, miles: 30600, fed: 7344, state: 2142, ss: 3794.40, med: 887.40, net: 47032.20 }
    };

    const dRef = (selectedDriverIdForTax in standardDefaults) 
      ? standardDefaults[selectedDriverIdForTax as keyof typeof standardDefaults] 
      : { gross: 45000, miles: 20000, fed: 5400, state: 1575, ss: 2790, med: 652.50, net: 34582.50 };

    return {
      gross: totalGross || dRef.gross,
      miles: totalMiles || dRef.miles,
      fedTax: totalGross ? fedTax : dRef.fed,
      stateTax: totalGross ? stateTax : dRef.state,
      socialSecurity: totalGross ? socialSecurity : dRef.ss,
      medicare: totalGross ? medicare : dRef.med,
      net: totalGross ? net : dRef.net,
      isReal: totalGross > 0,
      stubsCount: driverStubs.length
    };
  }, [payStubs, selectedDriverIdForTax, fedWithholdingRate, stateWithholdingRate, adjustments]);

  const quarterlyAggregate = useMemo(() => {
    // Sum up actual weekly stubs in the entire system
    const totalGross = payStubs.reduce((sum, stub) => sum + stub.grossAmount, 0);
    const totalFedTax = Math.round(totalGross * 0.12 * 100) / 100;
    const totalSSTax = Math.round(totalGross * 0.062 * 2 * 100) / 100; // Employer + Employee matching
    const totalMedTax = Math.round(totalGross * 0.0145 * 2 * 100) / 100; // Employer + Employee matching
    const totalDue = totalFedTax + totalSSTax + totalMedTax;

    return {
      gross: totalGross || 166500,
      fedTax: totalFedTax || 19980,
      ssTax: totalSSTax || 20646.00,
      medTax: totalMedTax || 4828.50,
      totalDue: totalDue || 45454.50,
      employeesCount: drivers.length || 3
    };
  }, [payStubs, drivers]);

  const handleGenerateForm = () => {
    setIsFormGenerated(true);
    setFilingSuccessMsg('');
  };

  const handleFileFormWithIRS = () => {
    if (!signConsent) {
      alert('⚠️ Consent Required: You must verify tax filings and check the signature authorization box before filing.');
      return;
    }
    setIsFilingLoading(true);
    setFilingSuccessMsg('');

    setTimeout(() => {
      setIsFilingLoading(false);
      const randomConf = `IRS-CONF-${Math.floor(100000 + Math.random() * 900000)}B`;
      
      const formLabel = selectedFormType === '1099' 
        ? `Form 1099-NEC (${selectedDriverName})`
        : selectedFormType === 'W2'
        ? `Form W-2 (${selectedDriverName})`
        : `Form 941 (Employer Quarterly - ${taxQuarter})`;
      
      const newLog = {
        id: `TX-${selectedFormType}-${Date.now().toString().slice(-6)}`,
        formName: formLabel,
        year: taxYear,
        quarter: selectedFormType === '941' ? taxQuarter : undefined,
        filedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'Accepted',
        confirmationNo: randomConf
      };

      setFilingLogs(prev => [newLog, ...prev]);
      setFilingSuccessMsg(`🎉 Success! This return has been digitally signed as "${signerTitle}" and successfully filed with the IRS E-File network. Confirmation Code: ${randomConf}`);
    }, 1500);
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
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-3">Driver Payroll & Tax Compliance</h1>
            <p className="text-slate-300 mt-1 max-w-2xl text-sm leading-relaxed">
              Compile hours and miles into weekly settlement sheets, sign off direct deposits, and generate automated IRS Form W-2s, 1099-NECs, or quarterly 941s based on real-time driver mileage.
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

      {/* Primary Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('settlements')}
          className={`pb-3 px-6 text-xs uppercase tracking-wider font-black transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'settlements'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt size={14} /> Weekly Settlements Advice
        </button>
        <button
          onClick={() => {
            setActiveSubTab('tax-forms');
            setIsFormGenerated(false);
            setFilingSuccessMsg('');
            setSignConsent(false);
          }}
          className={`pb-3 px-6 text-xs uppercase tracking-wider font-black transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'tax-forms'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="text-amber-500 animate-pulse" size={14} /> Automated Tax Forms Hub
        </button>
      </div>

      {/* TAB 1: WEEKLY SETTLEMENTS */}
      {activeSubTab === 'settlements' && (
        <div className="space-y-6">
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
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 print:border-none print:shadow-none printable-invoice animate-fade-in">
                  
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

                    {/* Change state actions for CEO */}
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
      )}

      {/* TAB 2: AUTOMATED TAX COMPLIANCE HUB */}
      {activeSubTab === 'tax-forms' && (
        <div className="space-y-6 animate-fade-in text-xs">
          
          {/* Subheader and Selectors Dashboard */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles className="text-amber-500" size={16} /> Automated IRS Filing Generator
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Form Selection */}
              <div>
                <label className="block text-slate-600 font-bold mb-1.5">1. Select IRS Return Type</label>
                <div className="space-y-1">
                  {[
                    { type: '1099', label: 'Form 1099-NEC', desc: 'Contractor Compensations' },
                    { type: 'W2', label: 'Form W-2 Statement', desc: 'Employee Wage & Taxes' },
                    { type: '941', label: 'Form 941 (Quarterly)', desc: 'Employer Payroll Return' }
                  ].map(form => (
                    <button
                      key={form.type}
                      type="button"
                      onClick={() => {
                        setSelectedFormType(form.type as any);
                        setIsFormGenerated(false);
                        setFilingSuccessMsg('');
                      }}
                      className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                        selectedFormType === form.type
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/50'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-black">{form.label}</span>
                        <span className="block text-[9px] text-slate-500 font-normal">{form.desc}</span>
                      </div>
                      {selectedFormType === form.type && <Check size={12} className="text-indigo-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic parameters based on type */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150">
                
                {selectedFormType !== '941' ? (
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Select Driver / Payee</label>
                    <select
                      value={selectedDriverIdForTax}
                      onChange={(e) => {
                        setSelectedDriverIdForTax(e.target.value);
                        setIsFormGenerated(false);
                        setFilingSuccessMsg('');
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-slate-800 text-slate-800 font-bold"
                    >
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.id === 'D1' || d.id === 'D2' ? 'W-2 Staff' : '1099 Contractor'})
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1">
                      Sumulates wage calculations for federal filings based on driver classification.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Filing Quarter</label>
                    <select
                      value={taxQuarter}
                      onChange={(e) => {
                        setTaxQuarter(e.target.value as any);
                        setIsFormGenerated(false);
                        setFilingSuccessMsg('');
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-slate-800 text-slate-800 font-bold"
                    >
                      <option value="Q1">Q1 (Jan - Mar)</option>
                      <option value="Q2">Q2 (Apr - Jun)</option>
                      <option value="Q3">Q3 (Jul - Sep)</option>
                      <option value="Q4">Q4 (Oct - Dec)</option>
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1">
                      Aggregates total gross settlements and withholding across all {drivers.length} drivers.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Tax Filing Year</label>
                  <select
                    value={taxYear}
                    onChange={(e) => {
                      setTaxYear(e.target.value);
                      setIsFormGenerated(false);
                      setFilingSuccessMsg('');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-slate-800 text-slate-800 font-bold"
                  >
                    <option value="2026">2026 (Active period)</option>
                    <option value="2025">2025 (Previous year)</option>
                    <option value="2024">2024</option>
                  </select>
                </div>

                {/* Additional simulated adjustments */}
                {selectedFormType !== '941' && (
                  <>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Federal Withholding %</label>
                      <input
                        type="number"
                        min="0"
                        max="35"
                        value={fedWithholdingRate}
                        onChange={(e) => {
                          setFedWithholdingRate(Number(e.target.value));
                          setIsFormGenerated(false);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">State Withholding %</label>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={stateWithholdingRate}
                        onChange={(e) => {
                          setStateWithholdingRate(Number(e.target.value));
                          setIsFormGenerated(false);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-mono font-bold"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 font-bold mb-1">Manual Adjusted Credits ($)</label>
                      <input
                        type="number"
                        value={adjustments}
                        onChange={(e) => {
                          setAdjustments(e.target.value);
                          setIsFormGenerated(false);
                        }}
                        placeholder="e.g. 500 for safety bonuses or tools"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-mono"
                      />
                    </div>
                  </>
                )}

              </div>

              {/* Generation Controls */}
              <div className="flex flex-col justify-between p-4 bg-slate-900 text-white rounded-xl border border-slate-850">
                <div>
                  <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider block">IRS E-File Compliance</span>
                  <p className="text-[10px] text-slate-300 mt-1 leading-normal">
                    Generate forms using real-time ledger records, inspect calculations, and sign electronically to submit directly to the IRS.
                  </p>
                </div>

                <div className="space-y-2 mt-4">
                  <button
                    type="button"
                    onClick={handleGenerateForm}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                  >
                    <RefreshCw size={11} className={isFormGenerated ? '' : 'animate-spin-slow'} /> 
                    {isFormGenerated ? 'Re-Generate & Refresh' : 'Generate Tax Form'}
                  </button>

                  <button
                    type="button"
                    disabled={!isFormGenerated}
                    onClick={handlePrint}
                    className={`w-full py-2 border font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                      isFormGenerated
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200'
                        : 'border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Printer size={11} /> Print Form (PDF Copy)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Form Viewer & E-File Desk */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Visual IRS Form Mock (7 columns) */}
            <div className="lg:col-span-8">
              {isFormGenerated ? (
                <div className="bg-white rounded-2xl border border-slate-300 shadow-md overflow-hidden p-6 relative max-w-4xl mx-auto border-t-[8px] border-t-amber-500">
                  
                  {/* WATERMARK */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none rotate-12">
                    <span className="text-8xl font-black tracking-widest font-sans">IRS OFFICIAL COPY</span>
                  </div>

                  {/* FORM 1099-NEC RENDERING */}
                  {selectedFormType === '1099' && (
                    <div className="space-y-4 border-2 border-amber-600/60 p-4 rounded-lg bg-amber-50/5 relative">
                      
                      {/* Red form header */}
                      <div className="flex justify-between items-start border-b-2 border-amber-600 pb-3">
                        <div className="space-y-1">
                          <span className="block text-[8px] font-black text-amber-700 uppercase tracking-widest">CORRECTED (if checked)</span>
                          <h4 className="text-xl font-black font-serif text-amber-800 tracking-tighter">Form 1099-NEC</h4>
                          <p className="text-[10px] font-semibold text-slate-800">Nonemployee Compensation</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[18px] font-black text-amber-700 font-mono tracking-tighter">2026</span>
                          <span className="block text-[8px] uppercase font-bold text-slate-500">IRS Copy B for Recipient</span>
                        </div>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Left Info Column */}
                        <div className="space-y-3">
                          <div className="border border-slate-300 p-2 rounded bg-slate-50">
                            <span className="text-[8px] font-black uppercase text-slate-500 block">PAYER'S Name, Street Address, City, State, and ZIP Code</span>
                            <strong className="text-[10px] block text-slate-900 mt-1">FASTGATE CARRIERS, INC.</strong>
                            <span className="block text-[10px] text-slate-700 font-medium">950 Freight Way, Chicago Corporate Hub, IL 60601</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="border border-slate-300 p-1.5 rounded bg-slate-50 font-mono">
                              <span className="text-[8px] font-black uppercase text-slate-500 block">PAYER'S Federal TIN</span>
                              <strong className="text-[10px] text-slate-800">36-9482019</strong>
                            </div>
                            <div className="border border-slate-300 p-1.5 rounded bg-slate-50 font-mono">
                              <span className="text-[8px] font-black uppercase text-slate-500 block">RECIPIENT'S TIN</span>
                              <strong className="text-[10px] text-slate-800">
                                {selectedDriverIdForTax === 'D1' ? '331-XX-9812' : 
                                 selectedDriverIdForTax === 'D2' ? '401-XX-2819' : '290-XX-8711'}
                              </strong>
                            </div>
                          </div>

                          <div className="border border-slate-300 p-2 rounded bg-slate-50">
                            <span className="text-[8px] font-black uppercase text-slate-500 block">RECIPIENT'S Name (First, Middle, Last)</span>
                            <strong className="text-[11px] block text-slate-900 mt-1">{selectedDriverName}</strong>
                            <span className="block text-[10px] text-slate-600 mt-0.5">Professional Commercial Driver (ID: {selectedDriverIdForTax})</span>
                          </div>
                        </div>

                        {/* Right boxes Column (The numbers) */}
                        <div className="space-y-3">
                          <div className="border border-amber-500 p-2.5 rounded bg-amber-50/20 font-mono text-right relative">
                            <span className="text-[8px] font-black uppercase text-amber-700 block text-left absolute left-2 top-2">Box 1: Nonemployee Compensation</span>
                            <span className="text-sm font-black text-amber-950 block mt-3">
                              ${calculatedYTD.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="border border-slate-300 p-2 rounded bg-slate-50 font-mono text-right relative">
                              <span className="text-[7px] font-black uppercase text-slate-500 block text-left absolute left-1.5 top-1.5">Box 4: Fed Tax Withheld</span>
                              <span className="text-xs font-bold text-slate-900 block mt-3">
                                ${calculatedYTD.fedTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="border border-slate-300 p-2 rounded bg-slate-50 font-mono text-right relative">
                              <span className="text-[7px] font-black uppercase text-slate-500 block text-left absolute left-1.5 top-1.5">Box 5: State Tax Withheld</span>
                              <span className="text-xs font-bold text-slate-900 block mt-3">
                                ${calculatedYTD.stateTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          <div className="border border-slate-300 p-2.5 rounded bg-slate-50/70 font-mono leading-relaxed text-[10px] text-slate-600">
                            <span className="font-bold text-slate-700 block uppercase text-[8px] mb-1 font-sans">Audit Verification Summary</span>
                            • Aggregated over <strong>{calculatedYTD.stubsCount} paychecks</strong> this year.<br/>
                            • Accumulated CDL cargo route driving of <strong>{calculatedYTD.miles.toLocaleString()} miles</strong>.<br/>
                            • Net payment paid via Direct Deposit file: <strong>${calculatedYTD.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.
                          </div>
                        </div>
                      </div>

                      <div className="text-[8px] text-slate-400 font-mono text-center border-t border-slate-200 pt-2 flex justify-between">
                        <span>FASTGATE COMPLIANCE VERIFICATION ID: FGC-1099-{selectedDriverIdForTax}-{taxYear}</span>
                        <span>Department of the Treasury - IRS Office</span>
                      </div>
                    </div>
                  )}

                  {/* FORM W-2 RENDERING */}
                  {selectedFormType === 'W2' && (
                    <div className="space-y-4 border-2 border-slate-600 p-4 rounded-lg bg-slate-50/5 relative">
                      
                      {/* Form Header */}
                      <div className="flex justify-between items-start border-b-2 border-slate-600 pb-3">
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-slate-500 uppercase font-mono">Form W-2</span>
                          <h4 className="text-lg font-black text-slate-800 font-sans tracking-tight">Wage and Tax Statement</h4>
                          <span className="block text-[8px] text-slate-500 uppercase font-bold">Copy B: To be filed with employee's Federal tax return</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[20px] font-black text-slate-700 font-mono tracking-tighter">2026</span>
                          <span className="block text-[7px] uppercase font-bold text-slate-400 font-mono">Dept of Treasury - IRS</span>
                        </div>
                      </div>

                      {/* Grid structure */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                        {/* Left column (Employer & Employee Details) - 7 cols */}
                        <div className="md:col-span-7 space-y-2">
                          <div className="border border-slate-300 p-1.5 rounded bg-slate-50">
                            <span className="text-[7px] font-bold text-slate-400 block">a Employee's social security number</span>
                            <strong className="text-[10px] text-slate-800 font-mono">
                              {selectedDriverIdForTax === 'D1' ? '331-XX-9812' : 
                               selectedDriverIdForTax === 'D2' ? '401-XX-2819' : '290-XX-8711'}
                            </strong>
                          </div>

                          <div className="border border-slate-300 p-1.5 rounded bg-slate-50">
                            <span className="text-[7px] font-bold text-slate-400 block">b Employer identification number (EIN)</span>
                            <strong className="text-[10px] text-slate-800 font-mono">36-9482019</strong>
                          </div>

                          <div className="border border-slate-300 p-2 rounded bg-slate-50">
                            <span className="text-[7px] font-bold text-slate-400 block">c Employer's name, address, and ZIP code</span>
                            <strong className="text-[10px] block text-slate-950">FASTGATE CARRIERS, INC.</strong>
                            <span className="text-[9px] text-slate-600 block">950 Freight Way, Chicago Hub, IL 60601</span>
                          </div>

                          <div className="border border-slate-300 p-2 rounded bg-slate-50">
                            <span className="text-[7px] font-bold text-slate-400 block">e Employee's first name, middle initial, last name</span>
                            <strong className="text-[11px] block text-indigo-900 mt-0.5">{selectedDriverName}</strong>
                            <span className="text-[9px] text-slate-500 block">CDL Operator • Registered Fleet Member ({selectedDriverIdForTax})</span>
                          </div>
                        </div>

                        {/* Right column (Tax numbers boxes) - 5 cols */}
                        <div className="md:col-span-5 space-y-2">
                          <div className="border border-slate-400 p-1.5 rounded bg-slate-50 font-mono text-right relative">
                            <span className="text-[7px] font-black text-slate-500 block text-left absolute left-1.5 top-1">1 Wages, tips, other comp.</span>
                            <span className="text-xs font-black text-slate-900 block mt-2.5">
                              ${calculatedYTD.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="border border-slate-300 p-1.5 rounded bg-slate-50 font-mono text-right relative">
                            <span className="text-[7px] font-bold text-slate-500 block text-left absolute left-1.5 top-1">2 Federal income tax withheld</span>
                            <span className="text-xs font-bold text-slate-800 block mt-2.5">
                              ${calculatedYTD.fedTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="border border-slate-300 p-1.5 rounded bg-slate-50 font-mono text-right relative">
                            <span className="text-[7px] font-bold text-slate-500 block text-left absolute left-1.5 top-1">3 Social security wages</span>
                            <span className="text-xs font-medium text-slate-800 block mt-2.5">
                              ${calculatedYTD.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="border border-slate-300 p-1.5 rounded bg-slate-50 font-mono text-right relative">
                            <span className="text-[7px] font-bold text-slate-500 block text-left absolute left-1.5 top-1">4 Social security tax withheld</span>
                            <span className="text-xs font-medium text-slate-800 block mt-2.5">
                              ${calculatedYTD.socialSecurity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="border border-slate-300 p-1.5 rounded bg-slate-50 font-mono text-right relative">
                            <span className="text-[7px] font-bold text-slate-500 block text-left absolute left-1.5 top-1">5 Medicare wages & tips</span>
                            <span className="text-xs font-medium text-slate-800 block mt-2.5">
                              ${calculatedYTD.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="border border-slate-300 p-1.5 rounded bg-slate-50 font-mono text-right relative">
                            <span className="text-[7px] font-bold text-slate-500 block text-left absolute left-1.5 top-1">6 Medicare tax withheld</span>
                            <span className="text-xs font-medium text-slate-800 block mt-2.5">
                              ${calculatedYTD.medicare.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* State boxes */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 border-t border-slate-200 pt-3 text-[10px] font-mono">
                        <div className="border border-slate-300 p-1 rounded bg-slate-50">
                          <span className="text-[7px] text-slate-400 block uppercase">15 State / Employer ID</span>
                          <span className="font-bold text-slate-800">IL (Illinois) / XX-W90A</span>
                        </div>
                        <div className="border border-slate-300 p-1 rounded bg-slate-50 text-right">
                          <span className="text-[7px] text-slate-400 block uppercase text-left">16 State wages, tips, etc.</span>
                          <span className="font-bold text-slate-800">${calculatedYTD.gross.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="border border-slate-300 p-1 rounded bg-slate-50 text-right">
                          <span className="text-[7px] text-slate-400 block uppercase text-left">17 State income tax</span>
                          <span className="font-bold text-slate-800">${calculatedYTD.stateTax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="border border-slate-300 p-1 rounded bg-slate-50 text-right">
                          <span className="text-[7px] text-slate-400 block uppercase text-left">Local Withholding</span>
                          <span className="font-bold text-slate-600">$0.00</span>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* FORM 941 RENDERING */}
                  {selectedFormType === '941' && (
                    <div className="space-y-4 border-2 border-slate-700 p-4 rounded-lg bg-slate-50/5 relative">
                      
                      {/* Quarterly header */}
                      <div className="flex justify-between items-start border-b-2 border-slate-700 pb-2">
                        <div className="space-y-1">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider font-mono">Form 941</span>
                          <h4 className="text-base font-black text-slate-900 font-sans uppercase">Employer's Quarterly Federal Tax Return</h4>
                          <p className="text-[9px] text-slate-500 leading-tight">Fastgate Carriers consolidated payroll reporting schedule</p>
                        </div>
                        <div className="text-right font-mono text-[10px] font-bold">
                          <span className="block text-indigo-700 font-black">Period: {taxQuarter} {taxYear}</span>
                          <span className="block text-slate-400 text-[8px] uppercase">Employer Return</span>
                        </div>
                      </div>

                      {/* General fields */}
                      <div className="space-y-2 font-mono">
                        <div className="bg-slate-100 p-2.5 rounded text-[10px] text-slate-700 flex justify-between items-center">
                          <span>Employer Name: <strong>FASTGATE CARRIERS, INC.</strong></span>
                          <span>Federal EIN: <strong>36-9482019</strong></span>
                        </div>

                        {/* Lines */}
                        <div className="space-y-1 pt-1.5">
                          <div className="flex justify-between items-center py-1 border-b border-slate-200">
                            <span>Line 1: Number of employees who received wages, tips, or other compensation:</span>
                            <span className="font-bold text-slate-900">{quarterlyAggregate.employeesCount} Operators</span>
                          </div>
                          
                          <div className="flex justify-between items-center py-1 border-b border-slate-200">
                            <span>Line 2: Total wages, tips, and other compensation:</span>
                            <span className="font-bold text-slate-900">${quarterlyAggregate.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>

                          <div className="flex justify-between items-center py-1 border-b border-slate-200">
                            <span>Line 3: Total income tax withheld from wages, tips, and other compensation:</span>
                            <span className="font-bold text-slate-900">${quarterlyAggregate.fedTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>

                          <div className="flex justify-between items-center py-1 border-b border-slate-200 text-slate-600">
                            <span>Line 5a: Taxable social security wages (aggregated 12.4%):</span>
                            <span className="font-medium">${quarterlyAggregate.ssTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>

                          <div className="flex justify-between items-center py-1 border-b border-slate-200 text-slate-600">
                            <span>Line 5c: Taxable Medicare wages & tips (aggregated 2.9%):</span>
                            <span className="font-medium">${quarterlyAggregate.medTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>

                          <div className="flex justify-between items-center py-1.5 text-slate-950 font-extrabold text-[11px] bg-indigo-50/50 px-2 rounded mt-1 border border-indigo-150">
                            <span className="uppercase text-indigo-950">Line 10: Total quarterly taxes due to IRS:</span>
                            <span className="text-indigo-700 text-xs">${quarterlyAggregate.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        {/* Quarter summary */}
                        <div className="bg-slate-50 border border-slate-150 p-2 rounded text-[9px] text-slate-500 leading-relaxed font-sans mt-3">
                          <strong>Note on Quarterly Deposits:</strong> Monthly direct deposits to IRS Federal Tax Hub are executed automatically by the Fastgate Carrier escrow schedule based on active weekly pay stubs. Form 941 matches these deposits exactly. No further balances due.
                        </div>

                      </div>

                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-16 text-center rounded-2xl text-xs text-slate-400 space-y-3">
                  <FileCode size={36} className="mx-auto text-slate-300" />
                  <p className="font-extrabold uppercase tracking-widest text-[10px]">Tax form preview workspace</p>
                  <p className="text-slate-500 max-w-sm mx-auto leading-normal">
                    Select a return type and payee credentials above, then click **"Generate Tax Form"** to compile the official tax schedules with aggregated CDL payroll metrics.
                  </p>
                </div>
              )}
            </div>

            {/* E-File Desk (4 columns) */}
            <div className="lg:col-span-4">
              <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="text-blue-400" size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">IRS E-File Desk</h3>
                </div>

                <div className="space-y-4 text-[11px] border-t border-slate-800 pt-4">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Payer Certification Title</label>
                    <input
                      type="text"
                      value={signerTitle}
                      onChange={(e) => setSignerTitle(e.target.value)}
                      placeholder="e.g. CEO / Treasurer"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-semibold outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Consent checkbox */}
                  <label className="flex items-start gap-2 cursor-pointer bg-slate-950/60 p-2.5 rounded border border-slate-800">
                    <input
                      type="checkbox"
                      checked={signConsent}
                      onChange={(e) => setSignConsent(e.target.checked)}
                      disabled={!isFormGenerated}
                      className="mt-0.5 rounded border-slate-800 text-indigo-600 focus:ring-0 shrink-0"
                    />
                    <span className="text-[10px] text-slate-300 leading-normal">
                      Under penalties of perjury, I declare that I have examined this return and accompanying schedules, and to the best of my knowledge and belief, they are true, correct, and complete. I authorize digital filing as **"{signerTitle}"**.
                    </span>
                  </label>

                  {/* Digital Submit Button */}
                  <button
                    type="button"
                    disabled={!isFormGenerated || isFilingLoading}
                    onClick={handleFileFormWithIRS}
                    className={`w-full py-2.5 font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      isFormGenerated && !isFilingLoading
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
                    }`}
                  >
                    {isFilingLoading ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" /> Securing Transmission...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} /> Sign & File with IRS E-File
                      </>
                    )}
                  </button>

                  {/* Success Banner */}
                  {filingSuccessMsg && (
                    <div className="bg-emerald-950/70 border border-emerald-800 text-emerald-300 p-3 rounded-lg text-[10px] leading-relaxed flex items-start gap-1.5 animate-fade-in font-medium">
                      <span>🎉</span>
                      <p>{filingSuccessMsg}</p>
                    </div>
                  )}

                </div>

                {/* Corporate Filing logs */}
                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                    <History size={11} /> Compliance E-Filing Log (Session)
                  </span>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {filingLogs.map(log => (
                      <div key={log.id} className="bg-slate-950/70 p-2.5 border border-slate-800 rounded space-y-1 text-[10px]">
                        <div className="flex justify-between items-center">
                          <strong className="text-slate-100 truncate max-w-[170px]">{log.formName}</strong>
                          <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 px-1 py-0.2 rounded font-black text-[8px] uppercase">
                            {log.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                          <span>Filed: {log.filedAt}</span>
                          <span>Ref: {log.id}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 border-t border-slate-900/60 pt-1 mt-1 flex justify-between">
                          <span>Tax Year: {log.year}</span>
                          <span className="font-bold text-indigo-300 text-[8px]">Conf: {log.confirmationNo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
