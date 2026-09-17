import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UploadCloud, 
  Download, 
  Printer, 
  Send, 
  Search, 
  Filter, 
  DollarSign, 
  Truck, 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink, 
  Receipt, 
  Check, 
  X, 
  Eye, 
  RefreshCw,
  Calendar,
  Building2,
  FileCheck2,
  Paperclip,
  Lock
} from 'lucide-react';
import { DispatchLoad, Driver, DriverExpense, CompanyInfo } from '../types';
import { DEFAULT_COMPANY_INFO } from '../data';

interface AutomatedBillingHubProps {
  loads: DispatchLoad[];
  drivers: Driver[];
  driverExpenses?: DriverExpense[];
  companyInfo?: CompanyInfo;
  currentUserRole?: string;
  onUpdateLoadDocs?: (
    id: string,
    rateConFile?: { name: string; size: number; dataUrl?: string },
    bolFile?: { name: string; size: number; dataUrl?: string },
    invoiceDetails?: DispatchLoad['invoiceDetails'],
    lumperReceiptFile?: { name: string; size: number; dataUrl?: string; amount?: number; notes?: string },
    billingStatus?: DispatchLoad['billingStatus']
  ) => void;
  onUpdateLoadStatus?: (id: string, status: DispatchLoad['status']) => void;
}

export default function AutomatedBillingHub({
  loads,
  drivers,
  driverExpenses = [],
  companyInfo = DEFAULT_COMPANY_INFO,
  currentUserRole = 'Accounting',
  onUpdateLoadDocs,
  onUpdateLoadStatus
}: AutomatedBillingHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'READY' | 'AWAITING_BOL' | 'AWAITING_RC' | 'FACTORING'>('ALL');
  const [selectedLoadForModal, setSelectedLoadForModal] = useState<DispatchLoad | null>(null);
  const [modalActiveDocTab, setModalActiveDocTab] = useState<'invoice' | 'rateCon' | 'bol' | 'lumper'>('invoice');
  const [submittingFactoringId, setSubmittingFactoringId] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Helper: calculate lumper expenses for a given load
  const getLoadLumpers = (load: DispatchLoad) => {
    const expenses = driverExpenses.filter(e => 
      e.category === 'Lumper Fee' && (e.loadNumber === load.loadNumber || (load.id && e.loadNumber === load.id))
    );
    const attachedLumperAmount = load.lumperReceiptFile?.amount || load.lumperAmount || 0;
    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalAmount = Math.max(attachedLumperAmount, expenseTotal);
    
    return {
      expenses,
      totalAmount,
      hasLumper: totalAmount > 0 || !!load.lumperReceiptFile || expenses.length > 0,
      receiptFile: load.lumperReceiptFile || (expenses[0]?.receiptFile ? { name: expenses[0].receiptFile.name, size: expenses[0].receiptFile.size } : undefined)
    };
  };

  // Compile billing packages info for all loads
  const billingPackages = useMemo(() => {
    return loads.map(load => {
      const lumpers = getLoadLumpers(load);
      const hasRc = !!load.rateConFile;
      const hasBol = !!load.bolFile;
      const isPackageComplete = hasRc && hasBol;

      // Status determination
      let status: 'Ready for Billing' | 'Awaiting Driver BOL' | 'Awaiting Dispatch RC' | 'Sent to Factoring' | 'Paid';
      if (load.billingStatus === 'Sent to Factoring' || load.invoiceDetails?.billingStatus === 'Sent to Factoring') {
        status = 'Sent to Factoring';
      } else if (load.billingStatus === 'Paid' || load.invoiceDetails?.billingStatus === 'Paid') {
        status = 'Paid';
      } else if (isPackageComplete) {
        status = 'Ready for Billing';
      } else if (hasRc && !hasBol) {
        status = 'Awaiting Driver BOL';
      } else {
        status = 'Awaiting Dispatch RC';
      }

      // Calculations
      const linehaul = load.payout;
      const fuelSurcharge = Math.round(linehaul * 0.10 * 100) / 100;
      const lumperFee = lumpers.totalAmount;
      const totalDue = Math.round((linehaul + fuelSurcharge + lumperFee) * 100) / 100;

      // Ensure invoice details are populated
      const invoice = load.invoiceDetails || {
        invoiceNumber: `INV-${load.loadNumber}`,
        billingDate: '2026-05-24',
        dueDate: '2026-06-23',
        shipperName: `${load.originHub.split(',')[0]} Freight Logistics Brokerage`,
        consigneeName: `${load.destinationHub.split(',')[0]} Commercial Distribution Hub`,
        taxId: companyInfo.feinTaxId || '36-9812019',
        terms: 'Net 30 / Factoring QuickPay',
        subtotal: linehaul,
        fees: fuelSurcharge,
        lumperAmount: lumperFee,
        totalDue: totalDue,
        billingStatus: status === 'Sent to Factoring' ? 'Sent to Factoring' : 'Ready for Billing'
      };

      return {
        ...load,
        lumpers,
        hasRc,
        hasBol,
        isPackageComplete,
        computedStatus: status,
        linehaul,
        fuelSurcharge,
        lumperFee,
        totalDue,
        invoice
      };
    });
  }, [loads, driverExpenses, companyInfo]);

  // Aggregate KPI metrics
  const stats = useMemo(() => {
    const ready = billingPackages.filter(p => p.computedStatus === 'Ready for Billing');
    const awaitingBol = billingPackages.filter(p => p.computedStatus === 'Awaiting Driver BOL');
    const awaitingRc = billingPackages.filter(p => p.computedStatus === 'Awaiting Dispatch RC');
    const factored = billingPackages.filter(p => p.computedStatus === 'Sent to Factoring' || p.computedStatus === 'Paid');
    
    const readyAmount = ready.reduce((sum, p) => sum + p.totalDue, 0);
    const factoredAmount = factored.reduce((sum, p) => sum + p.totalDue, 0);
    const totalLumpersRecovered = billingPackages.reduce((sum, p) => sum + p.lumperFee, 0);

    return {
      readyCount: ready.length,
      readyAmount,
      awaitingBolCount: awaitingBol.length,
      awaitingRcCount: awaitingRc.length,
      factoredCount: factored.length,
      factoredAmount,
      totalLumpersRecovered
    };
  }, [billingPackages]);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return billingPackages.filter(p => {
      // Tab filter
      if (filterTab === 'READY' && p.computedStatus !== 'Ready for Billing') return false;
      if (filterTab === 'AWAITING_BOL' && p.computedStatus !== 'Awaiting Driver BOL') return false;
      if (filterTab === 'AWAITING_RC' && p.computedStatus !== 'Awaiting Dispatch RC') return false;
      if (filterTab === 'FACTORING' && (p.computedStatus !== 'Sent to Factoring' && p.computedStatus !== 'Paid')) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.loadNumber.toLowerCase().includes(q) ||
          p.driverName.toLowerCase().includes(q) ||
          p.originHub.toLowerCase().includes(q) ||
          p.destinationHub.toLowerCase().includes(q) ||
          p.cargoType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [billingPackages, filterTab, searchQuery]);

  // Direct file handlers
  const handleUploadRc = (load: DispatchLoad, file: File) => {
    const rateConFile = {
      name: file.name,
      size: Math.round(file.size / 1024),
      dataUrl: URL.createObjectURL(file)
    };

    const lumpers = getLoadLumpers(load);
    const willBeComplete = !!load.bolFile;

    const updatedInvoice = willBeComplete ? {
      invoiceNumber: `INV-${load.loadNumber}`,
      billingDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      shipperName: `${load.originHub.split(',')[0]} Freight Logistics Brokerage`,
      consigneeName: `${load.destinationHub.split(',')[0]} Receiving Hub`,
      taxId: companyInfo.feinTaxId || '36-9812019',
      terms: 'Net 30 / Factoring QuickPay',
      subtotal: load.payout,
      fees: Math.round(load.payout * 0.10 * 100) / 100,
      lumperAmount: lumpers.totalAmount,
      totalDue: Math.round((load.payout + (load.payout * 0.10) + lumpers.totalAmount) * 100) / 100,
      billingStatus: 'Ready for Billing' as const,
      billingPackageGeneratedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    } : load.invoiceDetails;

    onUpdateLoadDocs?.(
      load.id,
      rateConFile,
      load.bolFile,
      updatedInvoice,
      load.lumperReceiptFile,
      willBeComplete ? 'Ready for Billing' : 'Pending Documents'
    );

    setNotificationMsg(`✅ Rate Confirmation attached for ${load.loadNumber}. ${willBeComplete ? '🎉 BOL already on file: Billing package automatically compiled!' : 'Awaiting driver BOL upload to finalize packet.'}`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleUploadBol = (load: DispatchLoad, file: File) => {
    const bolFile = {
      name: file.name,
      size: Math.round(file.size / 1024),
      dataUrl: URL.createObjectURL(file)
    };

    const lumpers = getLoadLumpers(load);
    const willBeComplete = !!load.rateConFile;

    const updatedInvoice = willBeComplete ? {
      invoiceNumber: `INV-${load.loadNumber}`,
      billingDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      shipperName: `${load.originHub.split(',')[0]} Freight Logistics Brokerage`,
      consigneeName: `${load.destinationHub.split(',')[0]} Receiving Hub`,
      taxId: companyInfo.feinTaxId || '36-9812019',
      terms: 'Net 30 / Factoring QuickPay',
      subtotal: load.payout,
      fees: Math.round(load.payout * 0.10 * 100) / 100,
      lumperAmount: lumpers.totalAmount,
      totalDue: Math.round((load.payout + (load.payout * 0.10) + lumpers.totalAmount) * 100) / 100,
      billingStatus: 'Ready for Billing' as const,
      billingPackageGeneratedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    } : load.invoiceDetails;

    onUpdateLoadDocs?.(
      load.id,
      load.rateConFile,
      bolFile,
      updatedInvoice,
      load.lumperReceiptFile,
      willBeComplete ? 'Ready for Billing' : 'Pending Documents'
    );

    setNotificationMsg(`✅ Driver Signed BOL uploaded for ${load.loadNumber}. ${willBeComplete ? '🎉 Rate Con already on file: Billing package automatically compiled!' : 'Awaiting dispatch Rate Con to finalize packet.'}`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleUploadLumper = (load: DispatchLoad, amount: number, file: File) => {
    const lumperFile = {
      name: file.name,
      size: Math.round(file.size / 1024),
      dataUrl: URL.createObjectURL(file),
      amount: amount
    };

    const hasRc = !!load.rateConFile;
    const hasBol = !!load.bolFile;
    const isComplete = hasRc && hasBol;

    const fuel = Math.round(load.payout * 0.10 * 100) / 100;
    const total = Math.round((load.payout + fuel + amount) * 100) / 100;

    const updatedInvoice = isComplete ? {
      invoiceNumber: `INV-${load.loadNumber}`,
      billingDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      shipperName: `${load.originHub.split(',')[0]} Freight Logistics Brokerage`,
      consigneeName: `${load.destinationHub.split(',')[0]} Receiving Hub`,
      taxId: companyInfo.feinTaxId || '36-9812019',
      terms: 'Net 30 / Factoring QuickPay',
      subtotal: load.payout,
      fees: fuel,
      lumperAmount: amount,
      totalDue: total,
      billingStatus: 'Ready for Billing' as const,
      billingPackageGeneratedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    } : load.invoiceDetails;

    onUpdateLoadDocs?.(
      load.id,
      load.rateConFile,
      load.bolFile,
      updatedInvoice,
      lumperFile,
      isComplete ? 'Ready for Billing' : 'Pending Documents'
    );

    setNotificationMsg(`✅ Driver Lumper receipt of $${amount.toFixed(2)} attached to ${load.loadNumber}. Total customer billing invoice automatically updated.`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  // Submit to Factoring / Mark Billed
  const handleSubmitToFactoring = (load: DispatchLoad) => {
    const canBill = currentUserRole === 'Accounting' || currentUserRole === 'Safety Manager & CEO' || currentUserRole === 'Owner' || (currentUserRole as string) === 'Administrator';
    if (!canBill) {
      setNotificationMsg('❌ Access Restricted: Factoring transmission and marking loads as billed requires Accounting or CEO clearance.');
      setTimeout(() => setNotificationMsg(null), 5000);
      return;
    }
    setSubmittingFactoringId(load.id);
    setTimeout(() => {
      const currentInvoice = load.invoiceDetails || {
        invoiceNumber: `INV-${load.loadNumber}`,
        billingDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        shipperName: 'Apex Brokerage',
        consigneeName: 'Receiving Hub',
        taxId: companyInfo.feinTaxId || '36-9812019',
        terms: 'Net 30',
        subtotal: load.payout,
        fees: 0,
        totalDue: load.payout
      };

      const updatedInvoice = {
        ...currentInvoice,
        billingStatus: 'Sent to Factoring' as const
      };

      onUpdateLoadDocs?.(
        load.id,
        load.rateConFile,
        load.bolFile,
        updatedInvoice,
        load.lumperReceiptFile,
        'Sent to Factoring'
      );

      setSubmittingFactoringId(null);
      setSelectedLoadForModal(null);
      setNotificationMsg(`🚀 Load ${load.loadNumber} successfully transmitted to Factoring Company (Direct Remit QuickPay)! Invoice status marked "Sent to Factoring".`);
      setTimeout(() => setNotificationMsg(null), 5000);
    }, 1200);
  };

  const handlePrintPackage = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="bg-emerald-900 border border-emerald-500 text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-lg animate-fade-in text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-emerald-300 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hero Analytics & Explanation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-150">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                <Sparkles size={16} />
              </span>
              <span className="text-[10px] font-mono uppercase font-black tracking-widest text-emerald-600">
                Continuous Billing Pipeline
              </span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Automated Freight Invoicing
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
              Automated Billing Invoices & Factoring Packages
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-3xl leading-relaxed">
              When <strong>Dispatch attaches the Rate Confirmation (RC)</strong> and the <strong>Driver uploads the signed Bill of Lading (BOL) and Lumper receipts</strong>, the system automatically synthesizes the complete freight billing invoice with all line items and attachments ready for immediate customer factoring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
              <Lock size={12} className={currentUserRole === 'Accounting' || currentUserRole === 'Safety Manager & CEO' ? "text-emerald-600" : "text-amber-600"} />
              <span>Authority:</span>
              <span className={currentUserRole === 'Accounting' || currentUserRole === 'Safety Manager & CEO' ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                {currentUserRole === 'Accounting' ? 'Accounting Specialist' : currentUserRole === 'Safety Manager & CEO' ? 'CEO / Owner Desk' : 'Restricted'}
              </span>
            </div>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
              <Check size={13} className="text-emerald-600" /> Active & Synchronized
            </span>
          </div>
        </div>

        {/* 4 KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-emerald-50/60 border border-emerald-200/70 p-4 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Ready for Billing
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-950 font-mono">
                ${stats.readyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
              {stats.readyCount} Package{stats.readyCount === 1 ? '' : 's'} Auto-Compiled (RC + BOL)
            </span>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/70 p-4 rounded-xl">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Awaiting Driver BOL
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-amber-950 font-mono">
                {stats.awaitingBolCount} Load{stats.awaitingBolCount === 1 ? '' : 's'}
              </span>
            </div>
            <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
              Rate Con attached; pending driver POD
            </span>
          </div>

          <div className="bg-blue-50/60 border border-blue-200/70 p-4 rounded-xl">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
              Lumpers Recovered
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-blue-950 font-mono">
                ${stats.totalLumpersRecovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[11px] text-blue-700 font-semibold mt-1 block">
              Driver unload receipts billed to shippers
            </span>
          </div>

          <div className="bg-indigo-50/60 border border-indigo-200/70 p-4 rounded-xl">
            <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
              Submitted to Factoring
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-indigo-950 font-mono">
                ${stats.factoredAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[11px] text-indigo-700 font-semibold mt-1 block">
              {stats.factoredCount} Packet{stats.factoredCount === 1 ? '' : 's'} Sent / Funded
            </span>
          </div>
        </div>
      </div>

      {/* Table Filter Tabs & Search Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterTab === 'ALL' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Shipments ({billingPackages.length})
            </button>
            <button
              onClick={() => setFilterTab('READY')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterTab === 'READY' 
                  ? 'bg-emerald-600 text-white shadow-xs font-black' 
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 size={13} />
              Ready for Billing ({stats.readyCount})
            </button>
            <button
              onClick={() => setFilterTab('AWAITING_BOL')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterTab === 'AWAITING_BOL' 
                  ? 'bg-amber-600 text-white shadow-xs font-black' 
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Clock size={13} />
              Pending Driver BOL ({stats.awaitingBolCount})
            </button>
            <button
              onClick={() => setFilterTab('AWAITING_RC')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterTab === 'AWAITING_RC' 
                  ? 'bg-slate-800 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending Dispatch RC ({stats.awaitingRcCount})
            </button>
            <button
              onClick={() => setFilterTab('FACTORING')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterTab === 'FACTORING' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              Factored / Billed ({stats.factoredCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search load #, driver, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-800 outline-none"
            />
          </div>
        </div>

        {/* Packages Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-mono text-[10px]">
                <th className="py-2.5 px-3">Load Details</th>
                <th className="py-2.5 px-3">Dispatch Rate Con (RC)</th>
                <th className="py-2.5 px-3">Driver Signed BOL (POD)</th>
                <th className="py-2.5 px-3">Driver Lumper Fee</th>
                <th className="py-2.5 px-3">Billing Package Total</th>
                <th className="py-2.5 px-3">Pipeline Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No freight billing packages matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Load Details */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {pkg.loadNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">({pkg.calculatedMiles} mi)</span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700 mt-1 truncate max-w-[200px]" title={`${pkg.originHub} → ${pkg.destinationHub}`}>
                        {pkg.originHub.split(',')[0]} → {pkg.destinationHub.split(',')[0]}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Truck size={10} className="text-slate-400" />
                        <span>{pkg.driverName}</span>
                        {pkg.truckId && pkg.truckId !== 'None' && (
                          <span className="font-mono text-slate-400">({pkg.truckId})</span>
                        )}
                      </div>
                    </td>

                    {/* Rate Con Status */}
                    <td className="py-3 px-3">
                      {pkg.hasRc ? (
                        <div className="space-y-0.5">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                            <Check size={11} /> RC Attached
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[130px] font-mono" title={pkg.rateConFile?.name}>
                            {pkg.rateConFile?.name}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold inline-block">
                            Missing RC
                          </span>
                          <label className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold block cursor-pointer underline">
                            + Attach Rate Con
                            <input 
                              type="file" 
                              accept=".pdf,.png,.jpg,.jpeg" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleUploadRc(pkg, e.target.files[0]);
                              }} 
                            />
                          </label>
                        </div>
                      )}
                    </td>

                    {/* Driver BOL Status */}
                    <td className="py-3 px-3">
                      {pkg.hasBol ? (
                        <div className="space-y-0.5">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                            <Check size={11} /> BOL Uploaded
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[130px] font-mono" title={pkg.bolFile?.name}>
                            {pkg.bolFile?.name}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold inline-block">
                            Awaiting Driver BOL
                          </span>
                          <label className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold block cursor-pointer underline">
                            + Upload Signed BOL
                            <input 
                              type="file" 
                              accept=".pdf,.png,.jpg,.jpeg" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleUploadBol(pkg, e.target.files[0]);
                              }} 
                            />
                          </label>
                        </div>
                      )}
                    </td>

                    {/* Driver Lumper Status */}
                    <td className="py-3 px-3">
                      {pkg.lumperFee > 0 ? (
                        <div className="space-y-0.5">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                            <Receipt size={11} /> +${pkg.lumperFee.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 block font-mono">
                            {pkg.lumpers.receiptFile?.name || 'Verified Receipt'}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-slate-400 text-[10px] block">No Lumpers Claimed</span>
                          <label className="text-[10px] text-slate-500 hover:text-slate-800 font-medium block cursor-pointer">
                            + Add Receipt
                            <input 
                              type="file" 
                              accept=".pdf,.png,.jpg,.jpeg" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  const amtStr = prompt('Enter reimbursable driver lumper amount ($ USD):', '185.00');
                                  const amt = parseFloat(amtStr || '0');
                                  if (amt > 0) {
                                    handleUploadLumper(pkg, amt, e.target.files[0]);
                                  }
                                }
                              }} 
                            />
                          </label>
                        </div>
                      )}
                    </td>

                    {/* Billing Amount */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        ${pkg.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        Linehaul: ${pkg.linehaul.toFixed(0)} | Fuel: ${pkg.fuelSurcharge.toFixed(0)}
                        {pkg.lumperFee > 0 && ` | Lumper: $${pkg.lumperFee.toFixed(0)}`}
                      </div>
                    </td>

                    {/* Pipeline Status */}
                    <td className="py-3 px-3">
                      {pkg.computedStatus === 'Ready for Billing' ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                          <Sparkles size={11} className="text-emerald-600 animate-pulse" />
                          Ready for Billing
                        </span>
                      ) : pkg.computedStatus === 'Sent to Factoring' ? (
                        <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-indigo-600" />
                          Sent to Factoring
                        </span>
                      ) : pkg.computedStatus === 'Awaiting Driver BOL' ? (
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <Clock size={11} className="text-amber-600" />
                          Pending Driver BOL
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <AlertCircle size={11} className="text-slate-500" />
                          Pending Dispatch RC
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLoadForModal(pkg);
                            setModalActiveDocTab('invoice');
                          }}
                          className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={12} /> Inspect Package
                        </button>

                        {pkg.computedStatus === 'Ready for Billing' && (
                          <button
                            type="button"
                            onClick={() => handleSubmitToFactoring(pkg)}
                            disabled={submittingFactoringId === pkg.id}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all inline-flex items-center gap-1 shadow-xs"
                          >
                            {submittingFactoringId === pkg.id ? (
                              <RefreshCw size={11} className="animate-spin" />
                            ) : (
                              <Send size={11} />
                            )}
                            Bill / Factor
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Billing Package Modal */}
      {selectedLoadForModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-fade-in my-8">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
                  <FileText size={20} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black">
                      Carrier Billing Package: {selectedLoadForModal.loadNumber}
                    </h3>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold border border-emerald-400/30">
                      INV-{selectedLoadForModal.loadNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Consolidated freight billing dossier compiled from verified Rate Confirmation, POD BOL, and Lumper accessorials.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLoadForModal(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Document Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2 text-xs font-bold">
              <button
                onClick={() => setModalActiveDocTab('invoice')}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  modalActiveDocTab === 'invoice'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Receipt size={13} /> Freight Invoice
              </button>
              <button
                onClick={() => setModalActiveDocTab('rateCon')}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  modalActiveDocTab === 'rateCon'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileCheck2 size={13} /> Rate Confirmation (RC)
                {selectedLoadForModal.rateConFile && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                )}
              </button>
              <button
                onClick={() => setModalActiveDocTab('bol')}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  modalActiveDocTab === 'bol'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckCircle2 size={13} /> Signed Bill of Lading (POD)
                {selectedLoadForModal.bolFile && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                )}
              </button>
              <button
                onClick={() => setModalActiveDocTab('lumper')}
                className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  modalActiveDocTab === 'lumper'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Paperclip size={13} /> Lumper Receipts
                {(selectedLoadForModal.lumperReceiptFile || getLoadLumpers(selectedLoadForModal).hasLumper) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {/* TAB 1: OFFICIAL FREIGHT INVOICE */}
              {modalActiveDocTab === 'invoice' && (
                <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm space-y-6 font-sans text-slate-800">
                  {/* Invoice Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-slate-800">
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-slate-900">
                        {companyInfo.legalName || 'FastGate Logistics Inc.'}
                      </h2>
                      <p className="text-xs text-slate-500">{companyInfo.dbaName || 'FastGate Freight Lines'}</p>
                      <p className="text-xs text-slate-500 mt-1">{companyInfo.address || '1000 S Financial Place, Suite 2400, Chicago, IL 60605'}</p>
                      <div className="text-[11px] font-mono text-slate-600 mt-1 flex flex-wrap gap-x-3">
                        <span><strong>USDOT:</strong> {companyInfo.usdotNumber || '3892019'}</span>
                        <span><strong>MC:</strong> {companyInfo.mcNumber || 'MC-1092841'}</span>
                        <span><strong>FEIN:</strong> {companyInfo.feinTaxId || '36-9812019'}</span>
                      </div>
                    </div>

                    <div className="text-right sm:text-right">
                      <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 block">
                        Freight Invoice
                      </span>
                      <span className="text-lg font-black font-mono text-slate-900 block mt-0.5">
                        INV-{selectedLoadForModal.loadNumber}
                      </span>
                      <div className="text-xs text-slate-500 space-y-0.5 mt-2 font-mono">
                        <div>Invoice Date: <strong>{new Date().toLocaleDateString('en-US')}</strong></div>
                        <div>Payment Terms: <strong>Net 30 / QuickPay</strong></div>
                        <div>Due Date: <strong>{new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US')}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Bill To & Shipment Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Bill To (Shipper / Broker)
                      </span>
                      <strong className="text-sm text-slate-800 block">
                        {selectedLoadForModal.originHub.split(',')[0]} Freight Brokerage & Logistics
                      </strong>
                      <p className="text-slate-500 mt-0.5">Origin Facility: {selectedLoadForModal.originHub}</p>
                      <p className="text-slate-500">Destination Hub: {selectedLoadForModal.destinationHub}</p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Transit & Carrier Reference
                      </span>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div>Load Number: <strong>{selectedLoadForModal.loadNumber}</strong></div>
                        <div>Carrier Driver: <strong>{selectedLoadForModal.driverName}</strong></div>
                        <div>Assigned Tractor: <strong>{selectedLoadForModal.truckId || 'TRK-202'}</strong></div>
                        <div>Total Distance: <strong>{selectedLoadForModal.calculatedMiles} miles</strong></div>
                        <div>Gross Weight: <strong>{selectedLoadForModal.weightLbs.toLocaleString()} lbs ({selectedLoadForModal.cargoType})</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Itemized Line Items Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-600 font-mono uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Item Description</th>
                          <th className="py-2.5 px-3">Rate / Basis</th>
                          <th className="py-2.5 px-3">Quantity</th>
                          <th className="py-2.5 px-3 text-right">Amount ($ USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {/* Linehaul */}
                        <tr>
                          <td className="py-2.5 px-3">
                            <strong className="text-slate-800 block">Linehaul Transportation Service</strong>
                            <span className="text-[10px] text-slate-400">
                              Agreed freight carriage from {selectedLoadForModal.originHub} to {selectedLoadForModal.destinationHub}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">${(selectedLoadForModal.ratePerMile || 2.60).toFixed(2)}/mi</td>
                          <td className="py-2.5 px-3 font-mono">{selectedLoadForModal.calculatedMiles} mi</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            ${selectedLoadForModal.payout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* Fuel Surcharge */}
                        <tr>
                          <td className="py-2.5 px-3">
                            <strong className="text-slate-800 block">Fuel Surcharge (FSC)</strong>
                            <span className="text-[10px] text-slate-400">Standard EIA national index adjustment (10%)</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">10% FSC</td>
                          <td className="py-2.5 px-3 font-mono">1 Load</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            ${(selectedLoadForModal.payout * 0.10).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {/* Lumper Reimbursement */}
                        {getLoadLumpers(selectedLoadForModal).totalAmount > 0 && (
                          <tr className="bg-blue-50/40">
                            <td className="py-2.5 px-3">
                              <strong className="text-blue-900 block flex items-center gap-1">
                                <Receipt size={12} className="text-blue-600" />
                                Reimbursable Driver Lumper Unloading Accessorial
                              </strong>
                              <span className="text-[10px] text-blue-700">
                                Paid by driver at consignee receiving dock. Receipt verified & attached.
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-blue-800">Pass-Through</td>
                            <td className="py-2.5 px-3 font-mono text-blue-800">1 Receipt</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                              ${getLoadLumpers(selectedLoadForModal).totalAmount.toFixed(2)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wider text-slate-600 text-xs">
                            Total Freight Invoice Due:
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-base font-black text-slate-900">
                            ${(
                              selectedLoadForModal.payout + 
                              (selectedLoadForModal.payout * 0.10) + 
                              getLoadLumpers(selectedLoadForModal).totalAmount
                            ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Factoring Legal Assignment Notice */}
                  <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-[10px] text-amber-900 leading-relaxed">
                    <strong>NOTICE OF ASSIGNMENT & REMITTANCE INSTRUCTIONS:</strong> This invoice and all associated receivables have been assigned to and are payable solely to our factoring partner under the Uniform Commercial Code (UCC). Please direct all wire/ACH remittances accordingly.
                  </div>
                </div>
              )}

              {/* TAB 2: RATE CONFIRMATION (RC) */}
              {modalActiveDocTab === 'rateCon' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <FileCheck2 size={16} className="text-emerald-600" /> Attached Broker Rate Confirmation
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Official contract between dispatch and cargo broker specifying route, miles, and agreed rate.
                      </p>
                    </div>

                    <label className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors inline-flex items-center gap-1">
                      <UploadCloud size={13} /> Replace RC
                      <input 
                        type="file" 
                        accept=".pdf,.png,.jpg,.jpeg" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleUploadRc(selectedLoadForModal, e.target.files[0]);
                        }} 
                      />
                    </label>
                  </div>

                  {selectedLoadForModal.rateConFile ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <FileText size={24} className="text-emerald-600" />
                          <div>
                            <strong className="text-xs text-slate-800 block">{selectedLoadForModal.rateConFile.name}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">{selectedLoadForModal.rateConFile.size} KB • Verified Dispatch Agreement</span>
                          </div>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check size={12} /> Rate Con Verified
                        </span>
                      </div>

                      {/* Mock Render of Rate Confirmation PDF */}
                      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs font-mono">
                        <div className="flex justify-between border-b pb-2">
                          <span className="font-bold">CARRIER LOAD CONFIRMATION</span>
                          <span>LOAD REF: {selectedLoadForModal.loadNumber}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>Origin: {selectedLoadForModal.originHub}</div>
                          <div>Destination: {selectedLoadForModal.destinationHub}</div>
                          <div>Agreed Payout: ${selectedLoadForModal.payout.toFixed(2)}</div>
                          <div>Calculated Distance: {selectedLoadForModal.calculatedMiles} mi</div>
                        </div>
                        <div className="pt-2 text-[10px] text-slate-400 border-t">
                          Dispatched to Carrier Driver: {selectedLoadForModal.driverName} | Truck: {selectedLoadForModal.truckId || 'TRK-202'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-dashed border-amber-300 rounded-xl p-8 text-center space-y-2">
                      <AlertCircle size={28} className="text-amber-600 mx-auto" />
                      <h4 className="text-xs font-bold text-amber-900 uppercase">Rate Confirmation Missing</h4>
                      <p className="text-xs text-amber-700 max-w-sm mx-auto">
                        Dispatch has not attached the signed broker Rate Confirmation document to this load.
                      </p>
                      <label className="inline-block mt-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">
                        Attach Rate Confirmation Now
                        <input 
                          type="file" 
                          accept=".pdf,.png,.jpg,.jpeg" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadRc(selectedLoadForModal, e.target.files[0]);
                          }} 
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SIGNED BILL OF LADING (BOL) */}
              {modalActiveDocTab === 'bol' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 size={16} className="text-emerald-600" /> Signed Bill of Lading (Proof of Delivery)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Consignee stamped and signed receiver delivery receipt uploaded by the carrier driver.
                      </p>
                    </div>

                    <label className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors inline-flex items-center gap-1">
                      <UploadCloud size={13} /> Replace BOL
                      <input 
                        type="file" 
                        accept=".pdf,.png,.jpg,.jpeg" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleUploadBol(selectedLoadForModal, e.target.files[0]);
                        }} 
                      />
                    </label>
                  </div>

                  {selectedLoadForModal.bolFile ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <FileText size={24} className="text-emerald-600" />
                          <div>
                            <strong className="text-xs text-slate-800 block">{selectedLoadForModal.bolFile.name}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">{selectedLoadForModal.bolFile.size} KB • Consignee Signed Delivery POD</span>
                          </div>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check size={12} /> POD Stamped & Verified
                        </span>
                      </div>

                      {/* Mock Render of BOL POD Document */}
                      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs font-mono">
                        <div className="flex justify-between border-b pb-2">
                          <span className="font-bold">UNIFORM STRAIGHT BILL OF LADING</span>
                          <span>BOL #: {selectedLoadForModal.loadNumber}-BOL</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>Delivered To: {selectedLoadForModal.destinationHub}</div>
                          <div>Delivered By Driver: {selectedLoadForModal.driverName}</div>
                          <div>Piece Count / Pallets: 24 Pallets</div>
                          <div>Condition: Received in Good Order & Condition</div>
                        </div>
                        <div className="pt-3 border-t flex justify-between items-center text-[10px] text-emerald-700 bg-emerald-50/50 p-2 rounded">
                          <span>RECEIVER SIGNATURE: Stamped & Signed on Unload</span>
                          <span>DATE: 2026-05-24</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-dashed border-amber-300 rounded-xl p-8 text-center space-y-2">
                      <AlertCircle size={28} className="text-amber-600 mx-auto" />
                      <h4 className="text-xs font-bold text-amber-900 uppercase">Driver BOL Not Uploaded Yet</h4>
                      <p className="text-xs text-amber-700 max-w-sm mx-auto">
                        The driver has not yet uploaded the signed proof-of-delivery (BOL). You can upload it manually on their behalf below.
                      </p>
                      <label className="inline-block mt-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">
                        Upload Signed BOL Now
                        <input 
                          type="file" 
                          accept=".pdf,.png,.jpg,.jpeg" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleUploadBol(selectedLoadForModal, e.target.files[0]);
                          }} 
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: LUMPER RECEIPTS */}
              {modalActiveDocTab === 'lumper' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Paperclip size={16} className="text-blue-600" /> Driver Lumper Receipts & Unload Vouchers
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Out-of-pocket warehouse pallet unloading accessorial fees paid by the driver to be reimbursed by the shipper.
                      </p>
                    </div>

                    <label className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors inline-flex items-center gap-1">
                      <UploadCloud size={13} /> + Add Lumper Receipt
                      <input 
                        type="file" 
                        accept=".pdf,.png,.jpg,.jpeg" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            const amtStr = prompt('Enter reimbursable driver lumper amount ($ USD):', '185.00');
                            const amt = parseFloat(amtStr || '0');
                            if (amt > 0) {
                              handleUploadLumper(selectedLoadForModal, amt, e.target.files[0]);
                            }
                          }
                        }} 
                      />
                    </label>
                  </div>

                  {getLoadLumpers(selectedLoadForModal).totalAmount > 0 ? (
                    <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Receipt size={24} className="text-blue-600" />
                          <div>
                            <strong className="text-xs text-slate-800 block">
                              {getLoadLumpers(selectedLoadForModal).receiptFile?.name || 'Warehouse_Lumper_Receipt.pdf'}
                            </strong>
                            <span className="text-[10px] text-blue-700 font-mono font-bold">
                              Reimbursable Amount: ${getLoadLumpers(selectedLoadForModal).totalAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check size={12} /> Added to Invoice
                        </span>
                      </div>

                      {/* Mock Receipt Visual */}
                      <div className="bg-white border border-blue-200 rounded-lg p-5 text-xs font-mono space-y-2">
                        <div className="flex justify-between border-b pb-1 font-bold">
                          <span>COLD STORAGE WAREHOUSE LUMPER RECEIPT</span>
                          <span className="text-emerald-700">PAID</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Driver Name: {selectedLoadForModal.driverName}</span>
                          <span>Load Number: {selectedLoadForModal.loadNumber}</span>
                        </div>
                        <div className="flex justify-between text-slate-800 font-bold pt-1 border-t">
                          <span>Inbound Pallet Breakdown Service:</span>
                          <span className="text-blue-700 font-mono">${getLoadLumpers(selectedLoadForModal).totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-2">
                      <Receipt size={28} className="text-slate-400 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-700 uppercase">No Lumper Fees Claimed for this Load</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        If the driver paid an unloading fee at the receiver, upload their lumper receipt ticket to automatically bill it back to the customer.
                      </p>
                      <label className="inline-block mt-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer">
                        Attach Driver Lumper Receipt
                        <input 
                          type="file" 
                          accept=".pdf,.png,.jpg,.jpeg" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              const amtStr = prompt('Enter reimbursable driver lumper amount ($ USD):', '185.00');
                              const amt = parseFloat(amtStr || '0');
                              if (amt > 0) {
                                handleUploadLumper(selectedLoadForModal, amt, e.target.files[0]);
                              }
                            }
                          }} 
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>Packet Compliance: Rate Con + BOL + Lumper receipts bundled.</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handlePrintPackage}
                  className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Printer size={14} /> Print / Export Dossier
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmitToFactoring(selectedLoadForModal)}
                  disabled={submittingFactoringId === selectedLoadForModal.id}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all inline-flex items-center gap-1.5 shadow-sm"
                >
                  {submittingFactoringId === selectedLoadForModal.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Submit to Factoring Company
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
