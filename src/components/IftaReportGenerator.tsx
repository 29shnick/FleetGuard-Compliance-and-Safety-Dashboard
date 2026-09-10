import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Compass, 
  MapPin, 
  Truck, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Fuel, 
  Building2, 
  Calendar, 
  Filter, 
  Eye, 
  ChevronRight, 
  RefreshCw, 
  Check, 
  Info, 
  DollarSign, 
  ExternalLink,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { DispatchLoad, Driver, Vehicle, CompanyInfo, IftaJurisdictionRecord, IftaQuarterlyReport, FuelTransaction } from '../types';
import { 
  IFTA_STATE_RATES, 
  decomposeLoadMilesByState, 
  getQuarterInfo, 
  DEFAULT_STATE_FUEL_PURCHASES, 
  SUPPLEMENTARY_IFTA_LOADS 
} from '../utils/iftaEngine';
import { generateIftaPdf } from '../utils/iftaPdfExport';
import FuelCsvUploaderModal from './FuelCsvUploaderModal';

interface IftaReportGeneratorProps {
  loads: DispatchLoad[];
  drivers: Driver[];
  vehicles?: Vehicle[];
  companyInfo: CompanyInfo;
  fuelTransactions?: FuelTransaction[];
  onUploadFuelTransactions?: (transactions: FuelTransaction[]) => void;
}

export default function IftaReportGenerator({
  loads,
  drivers,
  vehicles = [],
  companyInfo,
  fuelTransactions = [],
  onUploadFuelTransactions
}: IftaReportGeneratorProps) {
  // Quarter & Year Selection
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q2');
  
  // Filter Selection
  const [selectedTruck, setSelectedTruck] = useState<string>('ALL');
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');
  
  // Fleet MPG configuration
  const [fleetMpg, setFleetMpg] = useState<number>(6.5);
  
  // Custom fuel purchases per state override state: { stateCode: gallons }
  const [fuelPurchases, setFuelPurchases] = useState<Record<string, number>>(() => {
    return { ...DEFAULT_STATE_FUEL_PURCHASES['Q2'] };
  });

  // Modal / Drawer state for inspecting state load details
  const [inspectingState, setInspectingState] = useState<IftaJurisdictionRecord | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isFuelCsvModalOpen, setIsFuelCsvModalOpen] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string>('');
  const [editingFuelState, setEditingFuelState] = useState<string | null>(null);
  const [tempFuelVal, setTempFuelVal] = useState<string>('');

  const quarterInfo = useMemo(() => {
    return getQuarterInfo(selectedQuarter, selectedYear);
  }, [selectedQuarter, selectedYear]);

  // Combine database loads with supplementary quarterly freight loads to ensure complete multi-state reporting
  const allAvailableLoads = useMemo(() => {
    const combined = [...loads];
    // Add supplementary loads that are not already in loads by ID
    SUPPLEMENTARY_IFTA_LOADS.forEach(sLoad => {
      if (!combined.some(l => l.id === sLoad.id || l.loadNumber === sLoad.loadNumber)) {
        combined.push(sLoad);
      }
    });
    return combined;
  }, [loads]);

  // Filter loads matching the selected quarter and vehicle/driver criteria
  const matchingLoads = useMemo(() => {
    return allAvailableLoads.filter(load => {
      // Date filter based on submittedAt or default to selected quarter
      const loadDate = load.submittedAt || '';
      const inQuarter = quarterInfo.monthsPrefix.some(prefix => loadDate.startsWith(prefix));
      
      // If load doesn't have matching date format, still include if it was dynamically created during this session
      const dateMatches = inQuarter || (selectedQuarter === 'Q2' && !loadDate.startsWith('2026-0'));

      // Truck filter
      const truckMatches = selectedTruck === 'ALL' || load.truckId === selectedTruck;

      // Driver filter
      const driverMatches = selectedDriver === 'ALL' || load.driverId === selectedDriver;

      return dateMatches && truckMatches && driverMatches;
    });
  }, [allAvailableLoads, quarterInfo, selectedTruck, selectedDriver, selectedQuarter]);

  // Handle quarter switch: load default fuel receipts for that quarter
  const handleQuarterChange = (q: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    setSelectedQuarter(q);
    setFuelPurchases({ ...(DEFAULT_STATE_FUEL_PURCHASES[q] || {}) });
    setExportSuccessMsg('');
  };

  // Compile jurisdiction records by state
  const reportData: IftaQuarterlyReport = useMemo(() => {
    const stateMap = new Map<string, {
      totalMiles: number;
      taxableMiles: number;
      loads: {
        loadId: string;
        loadNumber: string;
        originHub: string;
        destinationHub: string;
        truckId: string;
        driverName: string;
        stateMiles: number;
        date: string;
      }[];
    }>();

    // Iterate through matching loads and decompose into state corridor miles
    matchingLoads.forEach(load => {
      const stateLegs = decomposeLoadMilesByState(load);
      stateLegs.forEach(leg => {
        if (!stateMap.has(leg.stateCode)) {
          stateMap.set(leg.stateCode, {
            totalMiles: 0,
            taxableMiles: 0,
            loads: []
          });
        }
        const stateRecord = stateMap.get(leg.stateCode)!;
        stateRecord.totalMiles += leg.miles;
        stateRecord.taxableMiles += leg.miles;
        stateRecord.loads.push({
          loadId: load.id,
          loadNumber: load.loadNumber,
          originHub: load.originHub,
          destinationHub: load.destinationHub,
          truckId: load.truckId,
          driverName: load.driverName,
          stateMiles: leg.miles,
          date: load.submittedAt || '2026-05-24'
        });
      });
    });

    const jurisdictions: IftaJurisdictionRecord[] = [];
    let totalMiles = 0;
    let totalTaxableMiles = 0;
    let totalTaxableGallons = 0;
    let totalTaxPaidGallons = 0;
    let grossTaxDue = 0;
    let taxPaidCredits = 0;

    const safeMpg = fleetMpg > 0 ? fleetMpg : 6.5;

    // Convert to sorted jurisdiction records
    Array.from(stateMap.entries())
      .sort(([codeA], [codeB]) => codeA.localeCompare(codeB))
      .forEach(([stateCode, data]) => {
        const stateInfo = IFTA_STATE_RATES[stateCode] || { name: stateCode, taxRate: 0.300 };
        const taxableGal = data.taxableMiles / safeMpg;
        const paidGal = fuelPurchases[stateCode] || 0;
        const netGal = taxableGal - paidGal;
        const netDue = netGal * stateInfo.taxRate;

        totalMiles += data.totalMiles;
        totalTaxableMiles += data.taxableMiles;
        totalTaxableGallons += taxableGal;
        totalTaxPaidGallons += paidGal;

        grossTaxDue += taxableGal * stateInfo.taxRate;
        taxPaidCredits += paidGal * stateInfo.taxRate;

        jurisdictions.push({
          stateCode,
          stateName: stateInfo.name,
          totalMiles: data.totalMiles,
          taxableMiles: data.taxableMiles,
          taxableGallons: taxableGal,
          taxPaidGallons: paidGal,
          netTaxableGallons: netGal,
          taxRatePerGallon: stateInfo.taxRate,
          netTaxDue: netDue,
          associatedLoads: data.loads
        });
      });

    const netTaxBalance = grossTaxDue - taxPaidCredits;

    return {
      year: selectedYear,
      quarter: selectedQuarter,
      filingDueDate: quarterInfo.dueDate,
      totalIftaMiles: totalMiles,
      totalTaxableMiles,
      totalTaxableGallons,
      totalTaxPaidGallons,
      overallMpg: safeMpg,
      grossTaxDue,
      taxPaidCredits,
      netTaxBalance,
      jurisdictions
    };
  }, [matchingLoads, fleetMpg, fuelPurchases, selectedYear, selectedQuarter, quarterInfo]);

  // PDF Export Action
  const handleExportPdf = () => {
    try {
      const { doc, filename } = generateIftaPdf(reportData, companyInfo);
      doc.save(filename);
      setExportSuccessMsg(`Successfully generated and downloaded "${filename}"! Ready for submission to the ${companyInfo.iftaAccountState || 'IL'} Department of Revenue.`);
      setTimeout(() => setExportSuccessMsg(''), 8000);
    } catch (err) {
      console.error('Failed to generate IFTA PDF:', err);
      alert('Unable to generate PDF. Please verify your browser allows downloads.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveFuelOverride = (stateCode: string) => {
    const val = parseFloat(tempFuelVal);
    if (!isNaN(val) && val >= 0) {
      setFuelPurchases(prev => ({
        ...prev,
        [stateCode]: val
      }));
    }
    setEditingFuelState(null);
    setTempFuelVal('');
  };

  const handleImportFuelCsv = (transactions: FuelTransaction[]) => {
    const byState: Record<string, number> = {};
    transactions.forEach(t => {
      byState[t.stateCode] = (byState[t.stateCode] || 0) + t.gallons;
    });

    setFuelPurchases(prev => ({
      ...prev,
      ...byState
    }));

    if (onUploadFuelTransactions) {
      onUploadFuelTransactions(transactions);
    }

    setExportSuccessMsg(`Successfully ingested ${transactions.length} fuel transactions from CSV! State tax-paid gallons and IFTA tax balances updated.`);
  };

  // Distinct truck IDs from loads
  const availableTrucks = useMemo(() => {
    const set = new Set<string>();
    allAvailableLoads.forEach(l => {
      if (l.truckId && l.truckId !== 'None') set.add(l.truckId);
    });
    return Array.from(set).sort();
  }, [allAvailableLoads]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 lg:p-7 text-white shadow-md border border-slate-700 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-500/35 uppercase tracking-widest flex items-center gap-1.5">
                <Fuel size={13} className="text-amber-400" />
                Tax Compliance Hub
              </span>
              <span className="text-slate-400 text-xs font-mono">
                Base: <strong className="text-white">{companyInfo.iftaAccountState || 'IL'}</strong> • Account: <strong className="text-white">{companyInfo.iftaAccountNumber || 'IL-IFTA-98102'}</strong>
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight mt-2.5">
              IFTA Quarterly Fuel Tax Report Generator
            </h2>
            <p className="text-slate-300 mt-1 max-w-2xl text-xs sm:text-sm leading-relaxed">
              Dynamically aggregates distance traveled across all 48 US contiguous jurisdictions based on current dispatch manifests, applies official state fuel tax rates, and compiles the official IFTA-100/101 summary return.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsFuelCsvModalOpen(true)}
              className="flex-1 md:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98]"
              title="Upload fuel account CSV (EFS, Fleet One, Comdata, Wex)"
            >
              <Fuel size={15} /> Upload Fuel CSV
            </button>
            <button
              onClick={() => setIsPreviewModalOpen(true)}
              className="flex-1 md:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
              title="Preview Official Return"
            >
              <Eye size={15} /> Preview Schedule
            </button>
            <button
              onClick={handleExportPdf}
              className="flex-1 md:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/25"
            >
              <Download size={15} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {exportSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 shadow-xs animate-fade-in text-emerald-900 text-xs">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">IFTA Tax Return Summary PDF Exported</p>
            <p className="text-emerald-700 mt-0.5">{exportSuccessMsg}</p>
          </div>
          <button 
            onClick={() => setExportSuccessMsg('')}
            className="text-emerald-500 hover:text-emerald-700 font-bold px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Control Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Quarter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => {
              const active = selectedQuarter === q;
              return (
                <button
                  key={q}
                  onClick={() => handleQuarterChange(q)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                    active 
                      ? 'bg-white text-indigo-700 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {q} 2026
                </button>
              );
            })}
          </div>

          {/* Filing Deadline & Date Range */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <Calendar size={13} className="text-slate-400" />
              {quarterInfo.dateRange}
            </span>
            <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded text-[11px]">
              Filing Due: {quarterInfo.dueDate}
            </span>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Truck Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filter Equipment / Truck
            </label>
            <select
              value={selectedTruck}
              onChange={e => setSelectedTruck(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-medium outline-none focus:ring-1 focus:ring-indigo-600"
            >
              <option value="ALL">All Power Units ({availableTrucks.length} Trucks)</option>
              {availableTrucks.map(trk => (
                <option key={trk} value={trk}>{trk}</option>
              ))}
            </select>
          </div>

          {/* Driver Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filter Assigned Driver
            </label>
            <select
              value={selectedDriver}
              onChange={e => setSelectedDriver(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium outline-none focus:ring-1 focus:ring-indigo-600"
            >
              <option value="ALL">All Operators ({drivers.length} Drivers)</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Fleet Average MPG */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Fleet Average Fuel MPG
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="3.0"
                max="12.0"
                value={fleetMpg}
                onChange={e => setFleetMpg(parseFloat(e.target.value) || 6.5)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-indigo-700 outline-none focus:ring-1 focus:ring-indigo-600"
              />
              <span className="text-slate-400 font-bold shrink-0">MPG</span>
            </div>
          </div>

          {/* Action info */}
          <div className="flex items-end">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 w-full flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Aggregated Loads</span>
                <span className="font-black text-slate-800">{matchingLoads.length} Manifests</span>
              </div>
              <button
                onClick={() => {
                  setSelectedTruck('ALL');
                  setSelectedDriver('ALL');
                  setFleetMpg(6.5);
                }}
                className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-1"
                title="Reset filters"
              >
                <RefreshCw size={11} /> Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Miles */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total IFTA Miles</p>
          <p className="text-2xl font-black text-slate-900">
            {reportData.totalIftaMiles.toLocaleString()} <span className="text-xs text-slate-400 font-normal">mi</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Across {reportData.jurisdictions.length} States</p>
        </div>

        {/* Fleet Fuel Burned */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Taxable Fuel Burned</p>
          <p className="text-2xl font-black text-slate-900">
            {Math.round(reportData.totalTaxableGallons).toLocaleString()} <span className="text-xs text-slate-400 font-normal">gal</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">At {reportData.overallMpg.toFixed(1)} Fleet MPG</p>
        </div>

        {/* Fuel Receipts (Tax-Paid) */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Tax-Paid Gallons</p>
          <p className="text-2xl font-black text-indigo-600">
            {Math.round(reportData.totalTaxPaidGallons).toLocaleString()} <span className="text-xs text-slate-400 font-normal">gal</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Paid at Truck Stops</p>
        </div>

        {/* Gross Tax Accrued */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Gross Tax Accrued</p>
          <p className="text-2xl font-black text-slate-800">
            ${reportData.grossTaxDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Before Tax Credits</p>
        </div>

        {/* Net Tax Liability */}
        <div className={`p-4.5 rounded-xl border shadow-xs ${
          reportData.netTaxBalance >= 0 
            ? 'bg-rose-50/70 border-rose-200 text-rose-950' 
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
        }`}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80">
            {reportData.netTaxBalance >= 0 ? 'Net Tax Due to Base' : 'Net Refund / Credit'}
          </p>
          <p className={`text-2xl font-black ${
            reportData.netTaxBalance >= 0 ? 'text-rose-700' : 'text-emerald-700'
          }`}>
            {reportData.netTaxBalance >= 0 ? '$' : '-$'}{Math.abs(reportData.netTaxBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] opacity-80 mt-1">
            Payable to {companyInfo.iftaAccountState || 'IL'} IFTA
          </p>
        </div>
      </div>

      {/* State-by-State Jurisdictional Aggregation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Compass size={16} className="text-indigo-600" />
              State-by-State Jurisdictional Mileage & Fuel Tax Schedule
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated from {matchingLoads.length} dispatch manifests. Click any row to inspect load manifests or modify fuel receipts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              Tax Rates Updated: Certified 2026 Q2
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3">Jurisdiction</th>
                <th className="px-4 py-3 text-right">Total Miles</th>
                <th className="px-4 py-3 text-right">Taxable Miles</th>
                <th className="px-4 py-3 text-right">Taxable Gal</th>
                <th className="px-4 py-3 text-right">Tax-Paid Gal</th>
                <th className="px-4 py-3 text-right">Net Taxable Gal</th>
                <th className="px-4 py-3 text-right">Tax Rate</th>
                <th className="px-5 py-3 text-right">Net Tax ($)</th>
                <th className="px-4 py-3 text-center">Manifests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.jurisdictions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    <AlertCircle size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">No dispatch loads found matching current filters</p>
                    <p className="text-xs mt-1">Try selecting another quarter or clearing the truck and driver filters.</p>
                  </td>
                </tr>
              ) : (
                reportData.jurisdictions.map(j => {
                  const isEditingFuel = editingFuelState === j.stateCode;
                  const isPositiveDue = j.netTaxDue > 0.005;
                  const isNegativeCredit = j.netTaxDue < -0.005;

                  return (
                    <tr 
                      key={j.stateCode}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Jurisdiction */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[11px]">
                            {j.stateCode}
                          </span>
                          <span className="font-bold text-slate-800">{j.stateName}</span>
                          {j.stateCode === (companyInfo.iftaAccountState || 'IL') && (
                            <span className="text-[9px] bg-slate-900 text-white font-black px-1.5 py-0.5 rounded uppercase">
                              Base
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Miles */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-800">
                        {j.totalMiles.toLocaleString()}
                      </td>

                      {/* Taxable Miles */}
                      <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                        {j.taxableMiles.toLocaleString()}
                      </td>

                      {/* Taxable Gallons */}
                      <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                        {j.taxableGallons.toFixed(1)}
                      </td>

                      {/* Tax-Paid Gallons with quick inline editor */}
                      <td className="px-4 py-3.5 text-right">
                        {isEditingFuel ? (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={tempFuelVal}
                              onChange={e => setTempFuelVal(e.target.value)}
                              className="w-16 bg-white border border-indigo-500 rounded px-1.5 py-0.5 text-right font-mono font-bold text-xs"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveFuelOverride(j.stateCode);
                                if (e.key === 'Escape') setEditingFuelState(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveFuelOverride(j.stateCode)}
                              className="text-indigo-600 hover:text-indigo-800 p-0.5"
                              title="Save"
                            >
                              <Check size={13} />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => {
                              setEditingFuelState(j.stateCode);
                              setTempFuelVal(j.taxPaidGallons.toString());
                            }}
                            className="inline-flex items-center justify-end gap-1 cursor-pointer font-mono font-bold text-indigo-700 hover:underline"
                            title="Click to adjust fuel receipts purchased in this state"
                          >
                            <span>{j.taxPaidGallons.toFixed(1)}</span>
                            <span className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100">✏️</span>
                          </div>
                        )}
                      </td>

                      {/* Net Taxable Gallons */}
                      <td className="px-4 py-3.5 text-right font-mono font-medium">
                        {j.netTaxableGallons >= 0 ? (
                          <span className="text-slate-800">{j.netTaxableGallons.toFixed(1)}</span>
                        ) : (
                          <span className="text-emerald-600">({Math.abs(j.netTaxableGallons).toFixed(1)})</span>
                        )}
                      </td>

                      {/* Tax Rate */}
                      <td className="px-4 py-3.5 text-right font-mono text-slate-500">
                        ${j.taxRatePerGallon.toFixed(3)}
                      </td>

                      {/* Net Tax Due */}
                      <td className="px-5 py-3.5 text-right font-mono font-bold">
                        {isPositiveDue && (
                          <span className="text-rose-600">${j.netTaxDue.toFixed(2)}</span>
                        )}
                        {isNegativeCredit && (
                          <span className="text-emerald-600">(${Math.abs(j.netTaxDue).toFixed(2)})</span>
                        )}
                        {!isPositiveDue && !isNegativeCredit && (
                          <span className="text-slate-400">$0.00</span>
                        )}
                      </td>

                      {/* Inspect Loads Button */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setInspectingState(j)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md font-bold text-[10px] transition-colors inline-flex items-center gap-1"
                        >
                          <span>{j.associatedLoads.length} loads</span>
                          <ChevronRight size={11} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Totals Summary Footer */}
            {reportData.jurisdictions.length > 0 && (
              <tfoot>
                <tr className="bg-indigo-50/80 border-t-2 border-indigo-200 font-black text-indigo-950">
                  <td className="px-5 py-3.5 text-[11px] uppercase tracking-wider">
                    Total Fleet Summary ({reportData.jurisdictions.length} States)
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs">
                    {reportData.totalIftaMiles.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs">
                    {reportData.totalTaxableMiles.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs">
                    {reportData.totalTaxableGallons.toFixed(1)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs">
                    {reportData.totalTaxPaidGallons.toFixed(1)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs">
                    {(reportData.totalTaxableGallons - reportData.totalTaxPaidGallons).toFixed(1)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs">
                    —
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-xs font-black">
                    {reportData.netTaxBalance >= 0 ? (
                      <span className="text-rose-700">${reportData.netTaxBalance.toFixed(2)}</span>
                    ) : (
                      <span className="text-emerald-700">(${Math.abs(reportData.netTaxBalance).toFixed(2)})</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={handleExportPdf}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] uppercase tracking-wider font-bold"
                    >
                      Export PDF
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Tax Filing & Carrier Signoff Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-xs text-slate-600 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight flex items-center gap-2">
              <Building2 size={16} className="text-indigo-600" />
              IFTA-100 Carrier Certification & E-Filing Attestation
            </h4>
            <p className="mt-1 text-slate-500 max-w-2xl leading-relaxed">
              Under IFTA Article R1200, motor carriers must maintain individual vehicle distance records (IVDRs), fuel purchase vouchers, and bills of lading supporting all reported jurisdictional travel for a mandatory 4-year retention period.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Printer size={14} /> Print Worksheets
            </button>
            <button
              onClick={handleExportPdf}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download size={14} /> Export Summary PDF
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-500">
          <div>
            <span className="font-bold text-slate-700 block">Carrier Base State:</span>
            <span>{companyInfo.iftaAccountState || 'IL'} — Illinois Department of Revenue</span>
          </div>
          <div>
            <span className="font-bold text-slate-700 block">Licensing Credential:</span>
            <span>{companyInfo.iftaAccountNumber || 'IL-IFTA-98102'} (USDOT #{companyInfo.usdotNumber})</span>
          </div>
          <div>
            <span className="font-bold text-slate-700 block">Audit Defense Guarantee:</span>
            <span>Full mileage breakdown mapped via DOT Highway Corridors</span>
          </div>
        </div>
      </div>

      {/* MODAL 1: Inspect Individual Loads contributing to a State */}
      {inspectingState && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-fade-in">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                  {inspectingState.stateCode}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {inspectingState.stateName} — Interstate Load Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  Total {inspectingState.totalMiles.toLocaleString()} miles transited across {inspectingState.associatedLoads.length} dispatch manifests
                </p>
              </div>
              <button
                onClick={() => setInspectingState(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {inspectingState.associatedLoads.map((loadItem, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-700">{loadItem.loadNumber}</span>
                      <span className="text-[11px] bg-slate-200 text-slate-700 font-mono px-1.5 rounded">
                        {loadItem.truckId}
                      </span>
                      <span className="text-[11px] text-slate-500">• {loadItem.driverName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 mt-1 text-[11px]">
                      <MapPin size={12} className="text-slate-400 shrink-0" />
                      <span>{loadItem.originHub}</span>
                      <ChevronRight size={10} className="text-slate-400" />
                      <span>{loadItem.destinationHub}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-black text-slate-900 block">
                      {loadItem.stateMiles} mi
                    </span>
                    <span className="text-[10px] text-slate-400">in {inspectingState.stateCode}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center text-xs">
              <span className="text-slate-500">
                Tax Rate: <strong>${inspectingState.taxRatePerGallon.toFixed(3)}/gal</strong>
              </span>
              <button
                onClick={() => setInspectingState(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-850"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Full PDF On-Screen Form Preview */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-indigo-400" />
                <h3 className="text-sm font-black tracking-tight">
                  Official IFTA-100 / IFTA-101 Quarterly Fuel Tax Return Preview
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPdf}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Download size={13} /> Export PDF
                </button>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Simulated Paper Document */}
            <div className="p-6 overflow-y-auto bg-slate-100 flex-1 space-y-6">
              <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md border border-slate-300 text-slate-800 space-y-5 text-xs font-sans">
                {/* Form Header */}
                <div className="border-b pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-base font-black text-slate-900 tracking-tight">
                        IFTA-100 / IFTA-101 QUARTERLY FUEL TAX RETURN
                      </h1>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        International Fuel Tax Agreement Multi-Jurisdictional Tax Return
                      </p>
                    </div>
                    <div className="border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 rounded text-right">
                      <p className="text-xs font-black text-indigo-900">{reportData.quarter} {reportData.year}</p>
                      <p className="text-[10px] text-slate-500">Due: {reportData.filingDueDate}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Carrier Name & Address</p>
                      <p className="font-bold text-slate-900 text-xs mt-0.5">{companyInfo.legalName}</p>
                      <p className="text-slate-600">{companyInfo.address}</p>
                      <p className="text-slate-500">Phone: {companyInfo.phone}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Carrier Identification</p>
                      <p className="text-slate-700 mt-0.5">IFTA Account: <strong className="font-mono">{companyInfo.iftaAccountNumber || 'IL-IFTA-98102'}</strong></p>
                      <p className="text-slate-700">Base Jurisdiction: <strong className="font-mono">{companyInfo.iftaAccountState || 'IL'}</strong></p>
                      <p className="text-slate-700">USDOT: <strong className="font-mono">{companyInfo.usdotNumber}</strong> • MC: <strong className="font-mono">{companyInfo.mcNumber}</strong></p>
                    </div>
                  </div>
                </div>

                {/* KPI Summary Block */}
                <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 p-3 rounded text-center">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Total IFTA Miles</span>
                    <span className="text-sm font-bold font-mono">{reportData.totalIftaMiles.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Average Fleet MPG</span>
                    <span className="text-sm font-bold font-mono">{reportData.overallMpg.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Taxable Gallons</span>
                    <span className="text-sm font-bold font-mono">{Math.round(reportData.totalTaxableGallons).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Net Balance</span>
                    <span className={`text-sm font-black font-mono ${reportData.netTaxBalance >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {reportData.netTaxBalance >= 0 ? '$' : '-$'}{Math.abs(reportData.netTaxBalance).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Table */}
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-indigo-900 text-white font-bold">
                        <th className="p-2">Jurisdiction</th>
                        <th className="p-2 text-right">Total Miles</th>
                        <th className="p-2 text-right">Taxable Miles</th>
                        <th className="p-2 text-right">Taxable Gal</th>
                        <th className="p-2 text-right">Tax-Paid Gal</th>
                        <th className="p-2 text-right">Net Gal</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Tax Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {reportData.jurisdictions.map(j => (
                        <tr key={j.stateCode} className="hover:bg-slate-50">
                          <td className="p-2 font-sans font-bold text-slate-800">{j.stateCode} - {j.stateName}</td>
                          <td className="p-2 text-right">{j.totalMiles.toLocaleString()}</td>
                          <td className="p-2 text-right">{j.taxableMiles.toLocaleString()}</td>
                          <td className="p-2 text-right">{j.taxableGallons.toFixed(1)}</td>
                          <td className="p-2 text-right">{j.taxPaidGallons.toFixed(1)}</td>
                          <td className="p-2 text-right">{j.netTaxableGallons.toFixed(1)}</td>
                          <td className="p-2 text-right">${j.taxRatePerGallon.toFixed(3)}</td>
                          <td className="p-2 text-right font-bold">
                            {j.netTaxDue >= 0 ? `$${j.netTaxDue.toFixed(2)}` : `($${Math.abs(j.netTaxDue).toFixed(2)})`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-indigo-50 font-bold font-mono border-t border-indigo-200 text-indigo-950">
                        <td className="p-2 font-sans">TOTALS</td>
                        <td className="p-2 text-right">{reportData.totalIftaMiles.toLocaleString()}</td>
                        <td className="p-2 text-right">{reportData.totalTaxableMiles.toLocaleString()}</td>
                        <td className="p-2 text-right">{reportData.totalTaxableGallons.toFixed(1)}</td>
                        <td className="p-2 text-right">{reportData.totalTaxPaidGallons.toFixed(1)}</td>
                        <td className="p-2 text-right">{(reportData.totalTaxableGallons - reportData.totalTaxPaidGallons).toFixed(1)}</td>
                        <td className="p-2 text-right">—</td>
                        <td className="p-2 text-right font-black">
                          {reportData.netTaxBalance >= 0 ? `$${reportData.netTaxBalance.toFixed(2)}` : `($${Math.abs(reportData.netTaxBalance).toFixed(2)})`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signature Certification Block */}
                <div className="border border-slate-200 rounded p-3 text-[9px] text-slate-600 bg-slate-50 space-y-2">
                  <p className="font-bold text-slate-800 uppercase">Motor Carrier Declaration</p>
                  <p>
                    I declare under the penalties of perjury that this report has been examined by me and to the best of my knowledge and belief is a true, correct, and complete return.
                  </p>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-slate-800">
                    <div>
                      <p className="font-bold font-mono">{companyInfo.safetyManagerName || 'Alice Johnson'}</p>
                      <p className="text-[8px] text-slate-400">Authorized Signature</p>
                    </div>
                    <div>
                      <p className="font-bold">Director of Safety & Compliance</p>
                      <p className="text-[8px] text-slate-400">Title</p>
                    </div>
                    <div>
                      <p className="font-bold font-mono">{new Date().toISOString().substring(0, 10)}</p>
                      <p className="text-[8px] text-slate-400">Filing Date</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                Ready for submission to {companyInfo.iftaAccountState || 'IL'} Department of Revenue
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100"
                >
                  Close Preview
                </button>
                <button
                  onClick={handleExportPdf}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} /> Download PDF File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fuel Account CSV Uploader Modal */}
      {isFuelCsvModalOpen && (
        <FuelCsvUploaderModal
          isOpen={isFuelCsvModalOpen}
          onClose={() => setIsFuelCsvModalOpen(false)}
          onImportFuelTransactions={handleImportFuelCsv}
        />
      )}
    </div>
  );
}
