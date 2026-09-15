import React, { useState, useMemo, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  Compass, 
  DollarSign, 
  TrendingUp, 
  PlusCircle, 
  Trash2, 
  Play, 
  CheckSquare, 
  Package, 
  Weight, 
  CalendarClock, 
  Map,
  Truck,
  UserCheck,
  Search,
  Filter,
  Route,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Printer,
  Download,
  Check,
  AlertTriangle,
  Wrench,
  ShieldAlert,
  PhoneCall,
  Radio,
  CheckCircle,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { Driver, DispatchLoad, CompanyInfo, IncidentReport } from '../types';
import { DEFAULT_COMPANY_INFO } from '../data';

interface DispatchPortalProps {
  drivers: Driver[];
  loads: DispatchLoad[];
  companyInfo?: CompanyInfo;
  incidents?: IncidentReport[];
  onAddLoad: (load: Omit<DispatchLoad, 'id' | 'submittedAt'>) => void;
  onUpdateLoadStatus: (id: string, status: DispatchLoad['status']) => void;
  onDeleteLoad: (id: string) => void;
  onUpdateIncident?: (
    incidentId: string, 
    status: IncidentReport['status'], 
    dispatchNotes?: string, 
    serviceVendor?: string, 
    etaMinutes?: number
  ) => void;
  onUpdateLoadDocs?: (
    id: string, 
    rateConFile?: { name: string; size: number; dataUrl?: string }, 
    bolFile?: { name: string; size: number; dataUrl?: string },
    invoiceDetails?: DispatchLoad['invoiceDetails']
  ) => void;
}

// Top-tier high-accuracy geographic landmarks / shipping hubs
export interface ShippingHub {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const SHIPPING_HUBS: ShippingHub[] = [
  { city: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880 },
  { city: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.7970 },
  { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { city: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { city: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { city: 'New York', state: 'NY', lat: 40.7128, lng: -74.0060 },
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { city: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
];

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of Earth in Miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const straightLineMiles = R * c;
  
  // Real winding road conversion multiplier (generally estimates ~15% to 20% overlay)
  return Math.round(straightLineMiles * 1.18);
}

export default function DispatchPortal({
  drivers,
  loads,
  companyInfo = DEFAULT_COMPANY_INFO,
  incidents = [],
  onAddLoad,
  onUpdateLoadStatus,
  onDeleteLoad,
  onUpdateIncident,
  onUpdateLoadDocs
}: DispatchPortalProps) {
  // Input fields state
  const [loadNumber, setLoadNumber] = useState(`LD-${Math.floor(1000 + Math.random() * 9000)}`);
  const [originIndex, setOriginIndex] = useState('1'); // Chicago by default
  const [destIndex, setDestIndex] = useState('7'); // New York by default
  const [customOrigin, setCustomOrigin] = useState('');
  const [customDestination, setCustomDestination] = useState('');
  const [useCustomLocations, setUseCustomLocations] = useState(false);
  const [customMiles, setCustomMiles] = useState('450');

  // Roadside Incident Coordination State
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [isIncidentFeedOpen, setIsIncidentFeedOpen] = useState(true);
  const [incidentVendor, setIncidentVendor] = useState('');
  const [incidentEta, setIncidentEta] = useState<number | ''>('');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [incidentStatus, setIncidentStatus] = useState<IncidentReport['status']>('In Progress - Assistance Dispatched');
  const [incidentSuccessMsg, setIncidentSuccessMsg] = useState('');
  const [incidentFilter, setIncidentFilter] = useState<'ACTIVE' | 'ALL' | 'RESOLVED'>('ACTIVE');

  const [cargoType, setCargoType] = useState('Dry Van General');
  const [weightLbs, setWeightLbs] = useState('32000');
  const [ratePerMile, setRatePerMile] = useState('2.45');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [notes, setNotes] = useState('');

  // Filtering loads state
  const [loadSearch, setLoadSearch] = useState('');
  const [loadStatusFilter, setLoadStatusFilter] = useState<string>('ALL');

  // File Uploading & Auto-Invoicing States
  const [quickBookDragActive, setQuickBookDragActive] = useState(false);
  const [quickBookLoading, setQuickBookLoading] = useState(false);
  const [quickBookSuccessMsg, setQuickBookSuccessMsg] = useState('');
  
  const [expandedLoadId, setExpandedLoadId] = useState<string | null>(null);
  const [ocrScanningLoadId, setOcrScanningLoadId] = useState<string | null>(null);
  const [ocrScanningStep, setOcrScanningStep] = useState('');
  const [editingInvoiceLoadId, setEditingInvoiceLoadId] = useState<string | null>(null);
  const [invoiceDraft, setInvoiceDraft] = useState<any>({
    shipperName: '',
    consigneeName: '',
    taxId: '36-9482019',
    terms: 'Net 30',
    dueDate: '',
    fees: 150,
  });

  // Drag over states for each load card
  const [activeDragLoadId, setActiveDragLoadId] = useState<string | null>(null);
  const [dragDocType, setDragDocType] = useState<'rateCon' | 'bol' | null>(null);

  // Computed Auto-Calculated Miles
  const calculatedMiles = useMemo(() => {
    if (useCustomLocations) {
      const parsed = parseInt(customMiles);
      return isNaN(parsed) ? 100 : Math.max(1, parsed);
    }
    const origin = SHIPPING_HUBS[parseInt(originIndex)] || SHIPPING_HUBS[0];
    const destination = SHIPPING_HUBS[parseInt(destIndex)] || SHIPPING_HUBS[1];
    
    if (origin.city === destination.city) {
      return 25; // Local dispatch
    }
    return calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  }, [useCustomLocations, originIndex, destIndex, customMiles]);

  // Computed payout
  const computedPayout = useMemo(() => {
    const rate = parseFloat(ratePerMile);
    if (isNaN(rate)) return 0;
    return Math.round(calculatedMiles * rate * 100) / 100;
  }, [calculatedMiles, ratePerMile]);

  // Available compliant drivers (warn if high risk or non-compliant)
  const sortedDriversList = useMemo(() => {
    return drivers.map(d => {
      const activeLoads = loads.filter(l => l.driverId === d.id && l.status !== 'Delivered');
      return {
        ...d,
        activeLoadCount: activeLoads.length,
        isAvailable: activeLoads.length === 0,
        isWarning: d.overallStatus !== 'Compliant' || d.isHighRisk
      };
    });
  }, [drivers, loads]);

  // --- Document Invoicing Helper Handlers ---
  const simulateQuickBookOCR = (fileName: string) => {
    setQuickBookLoading(true);
    setQuickBookSuccessMsg('');
    
    // Simulate multi-stage AI parser
    setTimeout(() => {
      // Set values based on random cargo profiles for extreme realism
      const cargoProfiles = [
        { cargo: 'Reefer Chilled Berries', weight: '38500', rate: '2.95', origin: '6', dest: '1', notes: 'Maintain continuous Temp at 34F. Pre-cool trailer prior to loading. Bolt seal required.', loadNum: 'LD-RC4981' },
        { cargo: 'Flatbed Steel Coils', weight: '44000', rate: '3.15', origin: '2', dest: '9', notes: 'Must be strapped and chained securely. 8-foot drop tarps required.', loadNum: 'LD-RC5281' },
        { cargo: 'Dry Van Auto Parts', weight: '22000', rate: '2.40', origin: '1', dest: '0', notes: 'No-touch freight. Pallet exchange required.', loadNum: 'LD-RC3910' }
      ];
      
      const selected = cargoProfiles[Math.floor(Math.random() * cargoProfiles.length)];
      
      setCargoType(selected.cargo);
      setWeightLbs(selected.weight);
      setRatePerMile(selected.rate);
      setOriginIndex(selected.origin);
      setDestIndex(selected.dest);
      setNotes(selected.notes);
      setLoadNumber(selected.loadNum);
      
      setQuickBookLoading(false);
      setQuickBookSuccessMsg(`⚡ AI OCR scan complete! Successfully parsed "${fileName}". Extracted Load ${selected.loadNum} from ${SHIPPING_HUBS[parseInt(selected.origin)].city} to ${SHIPPING_HUBS[parseInt(selected.dest)].city} at $${selected.rate}/mi.`);
    }, 1200);
  };

  const handleQuickBookFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      simulateQuickBookOCR(file.name);
    }
  };

  const handleQuickBookDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setQuickBookDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      simulateQuickBookOCR(file.name);
    }
  };

  // Upload handlers for each load card
  const simulateLoadDocOCR = (loadId: string, docType: 'rateCon' | 'bol', fileName: string, fileSize: number) => {
    setOcrScanningLoadId(loadId);
    
    const steps = [
      'Extracting text nodes & metadata...',
      'OCR mapping cargo values...',
      'Structuring carrier billing records...'
    ];
    
    let stepIdx = 0;
    setOcrScanningStep(steps[0]);

    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setOcrScanningStep(steps[stepIdx]);
      } else {
        clearInterval(interval);
        setOcrScanningLoadId(null);
        
        // Find existing load to check documents
        const load = loads.find(l => l.id === loadId);
        if (!load) return;

        const updatedFile = { name: fileName, size: Math.round(fileSize / 1024), dataUrl: 'simulated-file-url' };
        
        // Check if both docs will be present
        const hasRateCon = docType === 'rateCon' || !!load.rateConFile;
        const hasBOL = docType === 'bol' || !!load.bolFile;

        // Auto-compile invoice if both documents are ready
        let invoiceDetails = load.invoiceDetails;
        const isCompletePackage = hasRateCon && hasBOL;

        if (isCompletePackage) {
          // pre-fill draft
          const generatedInvoiceNo = `INV-${load.loadNumber}`;
          const today = new Date();
          const due = new Date();
          due.setDate(today.getDate() + 30);
          
          const formatDt = (d: Date) => d.toISOString().split('T')[0];
          const fuel = Math.round(load.payout * 0.10 * 100) / 100;
          const lumper = load.lumperAmount || load.lumperReceiptFile?.amount || 0;

          invoiceDetails = {
            invoiceNumber: generatedInvoiceNo,
            billingDate: formatDt(today),
            dueDate: formatDt(due),
            shipperName: `${load.originHub.split(',')[0]} Freight Logistics Brokerage`,
            consigneeName: `${load.destinationHub.split(',')[0]} Commercial Distribution Center`,
            taxId: companyInfo.feinTaxId || '36-9812019',
            terms: 'Net 30 / Factoring QuickPay',
            subtotal: load.payout,
            fees: fuel,
            lumperAmount: lumper,
            totalDue: Math.round((load.payout + fuel + lumper) * 100) / 100,
            billingStatus: 'Ready for Billing',
            billingPackageGeneratedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            notes: 'Automated billing package synthesized from verified Rate Con (Dispatch), Consignee-Signed BOL (Driver), and reimbursable Lumper receipts.'
          };

          // open draft edit panel automatically
          setInvoiceDraft(invoiceDetails);
          setEditingInvoiceLoadId(loadId);
        }

        if (onUpdateLoadDocs) {
          onUpdateLoadDocs(
            loadId,
            docType === 'rateCon' ? updatedFile : undefined,
            docType === 'bol' ? updatedFile : undefined,
            invoiceDetails,
            load.lumperReceiptFile,
            isCompletePackage ? 'Ready for Billing' : 'Pending Documents'
          );
        }
      }
    }, 600);
  };

  const handleLoadDocChange = (loadId: string, docType: 'rateCon' | 'bol', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      simulateLoadDocOCR(loadId, docType, file.name, file.size);
    }
  };

  const handleLoadDocDrop = (loadId: string, docType: 'rateCon' | 'bol', e: React.DragEvent) => {
    e.preventDefault();
    setActiveDragLoadId(null);
    setDragDocType(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      simulateLoadDocOCR(loadId, docType, file.name, file.size);
    }
  };

  const handleSaveInvoiceDraft = (loadId: string) => {
    if (onUpdateLoadDocs) {
      onUpdateLoadDocs(
        loadId,
        undefined,
        undefined,
        {
          ...invoiceDraft,
          totalDue: (parseFloat(invoiceDraft.subtotal) || 0) + (parseFloat(invoiceDraft.fees) || 0)
        }
      );
    }
    setEditingInvoiceLoadId(null);
  };

  const handleCreateLoad = (e: React.FormEvent) => {
    e.preventDefault();
    
    let originStr = '';
    let destStr = '';
    
    if (useCustomLocations) {
      originStr = customOrigin.trim() || 'Origin Hub';
      destStr = customDestination.trim() || 'Destination Hub';
    } else {
      const origHub = SHIPPING_HUBS[parseInt(originIndex)] || SHIPPING_HUBS[0];
      const destHub = SHIPPING_HUBS[parseInt(destIndex)] || SHIPPING_HUBS[1];
      originStr = `${origHub.city}, ${origHub.state}`;
      destStr = `${destHub.city}, ${destHub.state}`;
    }

    const matchedDriver = drivers.find(d => d.id === selectedDriverId);

    onAddLoad({
      loadNumber: loadNumber || `LD-${Math.floor(1000 + Math.random() * 9000)}`,
      originHub: originStr,
      destinationHub: destStr,
      calculatedMiles,
      driverId: selectedDriverId || 'Unassigned',
      driverName: matchedDriver ? matchedDriver.name : 'Unassigned',
      truckId: matchedDriver ? matchedDriver.truckId : 'None',
      ratePerMile: parseFloat(ratePerMile) || 2.00,
      payout: computedPayout,
      status: selectedDriverId ? 'Active' : 'Pending',
      cargoType,
      weightLbs: parseInt(weightLbs) || 10000,
      notes: notes.trim() || undefined
    });

    // Reset some form items
    setLoadNumber(`LD-${Math.floor(1000 + Math.random() * 9000)}`);
    setSelectedDriverId('');
    setNotes('');
    setCustomOrigin('');
    setCustomDestination('');
  };

  // Dispatch overview statistics
  const dispatchStats = useMemo(() => {
    const activeLoads = loads.filter(l => l.status !== 'Delivered');
    const totalMiles = loads.reduce((sum, l) => sum + l.calculatedMiles, 0);
    const totalPayoutValue = loads.reduce((sum, l) => sum + l.payout, 0);
    
    return {
      totalLoads: loads.length,
      activeLoadsCount: activeLoads.length,
      totalMiles,
      totalPayoutValue
    };
  }, [loads]);

  const filteredLoads = useMemo(() => {
    return loads.filter(l => {
      const matchesSearch = 
        l.loadNumber.toLowerCase().includes(loadSearch.toLowerCase()) ||
        l.originHub.toLowerCase().includes(loadSearch.toLowerCase()) ||
        l.destinationHub.toLowerCase().includes(loadSearch.toLowerCase()) ||
        l.driverName.toLowerCase().includes(loadSearch.toLowerCase());
        
      const matchesStatus = 
        loadStatusFilter === 'ALL' || 
        l.status === loadStatusFilter;
        
      return matchesSearch && matchesStatus;
    });
  }, [loads, loadSearch, loadStatusFilter]);

  // Roadside incident calculations & handlers
  const activeIncidents = useMemo(() => {
    return incidents.filter(i => i.status !== 'Resolved / Cleared');
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      if (incidentFilter === 'ACTIVE') return i.status !== 'Resolved / Cleared';
      if (incidentFilter === 'RESOLVED') return i.status === 'Resolved / Cleared';
      return true;
    });
  }, [incidents, incidentFilter]);

  const handleStartCoordinating = (incident: IncidentReport) => {
    setSelectedIncidentId(incident.id);
    setIncidentVendor(incident.serviceVendor || '');
    setIncidentEta(incident.etaMinutes ?? '');
    setIncidentNotes(incident.dispatchNotes || '');
    setIncidentStatus(incident.status);
  };

  const handleSaveIncidentCoordination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentId || !onUpdateIncident) return;

    onUpdateIncident(
      selectedIncidentId,
      incidentStatus,
      incidentNotes,
      incidentVendor || undefined,
      typeof incidentEta === 'number' ? incidentEta : undefined
    );

    setIncidentSuccessMsg(`Assistance coordination updated for incident ${selectedIncidentId}! Logged to Audit Trail.`);
    setTimeout(() => setIncidentSuccessMsg(''), 4500);
    setSelectedIncidentId(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Dashboard Headline */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden shadow-md border border-slate-700">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-amber-500/20 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full border border-amber-500/35 uppercase tracking-widest">
              Dispatcher Control Suite
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-3">Smart Dispatch & Route Optimization</h1>
            <p className="text-slate-300 mt-1 max-w-2xl text-sm leading-relaxed">
              Log freight, auto-calculate highway distances dynamically using geographical landmarks, optimize payout calculations, and select compliant drivers.
            </p>
          </div>
          <div className="bg-slate-850 px-5 py-3 border border-slate-700 rounded-xl text-center shadow-xs">
            <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider block">Live Roster Status</span>
            <span className="text-xl font-bold font-mono text-white mt-1 block">
              {drivers.length} Drivers Active
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Routed Loads</p>
          <p className="text-2xl font-black text-slate-900">{dispatchStats.totalLoads} Freight Contracts</p>
        </div>
        <div className="bg-white p-4.5 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Active Pipeline</p>
          <p className="text-2xl font-black text-amber-600">{dispatchStats.activeLoadsCount} In Transit</p>
        </div>
        <div className="bg-white p-4.5 rounded-xl border border-slate-200">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Dispatched Miles</p>
          <p className="text-2xl font-black text-emerald-600 font-mono">{dispatchStats.totalMiles.toLocaleString()} mi</p>
        </div>
        <div className="bg-white p-4.5 rounded-xl border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Roadside Incidents</p>
              <p className={`text-2xl font-black ${activeIncidents.length > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {activeIncidents.length} Active {activeIncidents.length > 0 && '🚨'}
              </p>
            </div>
            {activeIncidents.length > 0 && (
              <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200 animate-pulse uppercase">
                Action Required
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Success alert message for incident coordination */}
      {incidentSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-600" />
            <span>{incidentSuccessMsg}</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-mono uppercase">Audit Trail Updated</span>
        </div>
      )}

      {/* Roadside Emergency & Incident Coordination Board */}
      <div className={`rounded-2xl border transition-all overflow-hidden ${
        activeIncidents.length > 0 
          ? 'bg-rose-50/40 border-rose-300 shadow-md ring-1 ring-rose-300' 
          : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-150">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeIncidents.length > 0 
                ? 'bg-rose-600 text-white shadow-md animate-pulse' 
                : 'bg-slate-100 text-slate-700'
            }`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Roadside Emergency & Incident Dispatch Desk
                </h2>
                {activeIncidents.length > 0 ? (
                  <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full animate-pulse">
                    {activeIncidents.length} Urgent Event{activeIncidents.length > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    All Nominal
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time roadside breakdown, flat tire, accident, and DOT inspection event notifications reported by active drivers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[10px] font-bold uppercase">
              <button
                onClick={() => setIncidentFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  incidentFilter === 'ACTIVE' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({activeIncidents.length})
              </button>
              <button
                onClick={() => setIncidentFilter('ALL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  incidentFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({incidents.length})
              </button>
              <button
                onClick={() => setIncidentFilter('RESOLVED')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  incidentFilter === 'RESOLVED' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Resolved ({incidents.filter(i => i.status === 'Resolved / Cleared').length})
              </button>
            </div>

            <button
              onClick={() => setIsIncidentFeedOpen(!isIncidentFeedOpen)}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title={isIncidentFeedOpen ? 'Collapse incident desk' : 'Expand incident desk'}
            >
              {isIncidentFeedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {isIncidentFeedOpen && (
          <div className="p-5 sm:p-6 space-y-4">
            {filteredIncidents.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 space-y-1">
                <ShieldCheck size={28} className="mx-auto text-emerald-600" />
                <p className="font-extrabold uppercase text-[10px] text-slate-600">No Roadside Incidents Reported</p>
                <p className="text-slate-400 max-w-md mx-auto">
                  No active incidents under the "{incidentFilter.toLowerCase()}" filter. Drivers can report events from their driver portal, which will instantly trigger alerts here and record in the Audit Trail.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredIncidents.map((incident) => {
                  const isSelected = selectedIncidentId === incident.id;

                  return (
                    <div
                      key={incident.id}
                      className={`p-4 rounded-xl border text-xs transition-all space-y-3 ${
                        incident.status === 'Open - Dispatch Action Required'
                          ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                          : incident.status === 'In Progress - Assistance Dispatched'
                          ? 'bg-amber-50/70 border-amber-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              {incident.id}
                            </span>
                            <span className="font-bold text-slate-900">
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
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Reported at {incident.reportedAt}
                          </span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 ${
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

                      {/* Details Strip */}
                      <div className="bg-white p-3 rounded-lg border border-slate-150 space-y-1.5">
                        <div className="flex items-start gap-1.5 text-slate-800 font-semibold">
                          <MapPin size={13} className="text-rose-600 shrink-0 mt-0.5" />
                          <span>{incident.location}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 border-t border-slate-100 pt-1.5">
                          <div>
                            <span className="text-slate-400 block font-bold uppercase text-[9px]">Driver & Equipment</span>
                            <span className="font-bold text-slate-900">{incident.driverName}</span>
                            <span className="block font-mono text-slate-600">Truck: {incident.truckId} {incident.loadId ? `• Load: ${incident.loadId}` : ''}</span>
                          </div>

                          <div>
                            <span className="text-slate-400 block font-bold uppercase text-[9px]">Driver Callback</span>
                            {incident.driverPhone ? (
                              <a
                                href={`tel:${incident.driverPhone}`}
                                className="font-mono text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                              >
                                <PhoneCall size={11} /> {incident.driverPhone}
                              </a>
                            ) : (
                              <span className="text-slate-400 font-mono">No direct phone</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] border-t border-slate-100 pt-1 text-slate-600">
                          <span className={incident.isVehicleDrivable ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                            {incident.isVehicleDrivable ? '✓ Drivable' : '✕ Immobilized'}
                          </span>
                          <span>•</span>
                          <span className={incident.injuriesReported ? 'text-rose-700 font-black' : 'text-slate-600'}>
                            {incident.injuriesReported ? '🚨 Injuries Reported' : 'No Injuries'}
                          </span>
                          <span>•</span>
                          <span>
                            {incident.policeContacted ? `Police on Scene (${incident.policeReportNumber || 'Unit Dispatched'})` : 'No Police Dispatched'}
                          </span>
                        </div>
                      </div>

                      {/* Driver's Statement */}
                      <p className="text-slate-700 bg-white/60 p-2.5 rounded-lg border border-slate-150 text-[11px] leading-relaxed">
                        <strong className="text-slate-900 font-bold">Driver Statement:</strong> {incident.description}
                      </p>

                      {/* Requested Services */}
                      {incident.assistanceNeeded.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-bold">Requested Assistance:</span>
                          {incident.assistanceNeeded.map((serv, idx) => (
                            <span key={idx} className="bg-white border border-slate-200 text-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                              {serv}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Attached scene photos simulation */}
                      {incident.photos && incident.photos.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500">
                          <span className="font-bold">Attached Evidence:</span>
                          {incident.photos.map((p, idx) => (
                            <span key={idx} className="bg-white border border-slate-200 text-blue-700 px-2 py-0.5 rounded font-mono">
                              📎 {p.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Current Coordination Status */}
                      {(incident.serviceVendor || incident.dispatchNotes) && (
                        <div className="bg-white border border-indigo-200 p-2.5 rounded-lg space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950">
                            <span className="flex items-center gap-1 text-indigo-700">
                              <Wrench size={12} /> Assigned Assistance: {incident.serviceVendor || 'Pending'}
                            </span>
                            {incident.etaMinutes && (
                              <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[10px]">
                                ETA: {incident.etaMinutes} mins
                              </span>
                            )}
                          </div>
                          {incident.dispatchNotes && (
                            <p className="text-[10.5px] text-slate-600 italic">
                              "{incident.dispatchNotes}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Button to Open Coordination Form */}
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => isSelected ? setSelectedIncidentId(null) : handleStartCoordinating(incident)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-slate-800 text-white'
                              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
                          }`}
                        >
                          <Wrench size={13} />
                          {isSelected ? 'Close Coordination Tool' : 'Coordinate Roadside Assistance'}
                        </button>
                      </div>

                      {/* Inline Dispatch Coordination Tool */}
                      {isSelected && (
                        <form onSubmit={handleSaveIncidentCoordination} className="bg-white p-4 rounded-xl border-2 border-indigo-400 space-y-3 mt-2 shadow-md">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-150">
                            <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                              <Activity size={14} className="text-indigo-600" />
                              Dispatch Assistance Triage ({incident.id})
                            </h4>
                            <span className="text-[10px] text-slate-400">Updates sync to Driver Portal & Audit Trail</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-700 font-bold mb-1 text-[10px] uppercase">
                                Update Incident Status:
                              </label>
                              <select
                                value={incidentStatus}
                                onChange={(e) => setIncidentStatus(e.target.value as any)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-xs text-slate-900 focus:bg-white outline-none"
                              >
                                <option value="Open - Dispatch Action Required">Open - Dispatch Action Required</option>
                                <option value="In Progress - Assistance Dispatched">In Progress - Assistance Dispatched</option>
                                <option value="Resolved / Cleared">Resolved / Cleared</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-slate-700 font-bold mb-1 text-[10px] uppercase">
                                Vendor Estimated ETA (minutes):
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="360"
                                placeholder="e.g. 30"
                                value={incidentEta}
                                onChange={(e) => setIncidentEta(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:bg-white outline-none"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-slate-700 font-bold mb-1 text-[10px] uppercase">
                                Roadside Service Vendor / Towing Company:
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Love's Truck Tire Care (Davenport, IA) - Unit #4"
                                value={incidentVendor}
                                onChange={(e) => setIncidentVendor(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                              />
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {[
                                  "Love's Truck Tire Care",
                                  "TA RoadSquad Mobile",
                                  "Pilot Flying J Roadside",
                                  "Heavy Duty Towing Pros",
                                  "Freightliner Mobile Tech"
                                ].map(preset => (
                                  <button
                                    type="button"
                                    key={preset}
                                    onClick={() => setIncidentVendor(preset)}
                                    className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded transition-colors"
                                  >
                                    + {preset}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-slate-700 font-bold mb-1 text-[10px] uppercase">
                                Dispatch Coordination Notes (visible to driver):
                              </label>
                              <textarea
                                rows={2}
                                placeholder="Enter instructions for driver: technician en route, ETA, shoulder safety check, load transfer arrangements..."
                                value={incidentNotes}
                                onChange={(e) => setIncidentNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-150">
                            <button
                              type="button"
                              onClick={() => setSelectedIncidentId(null)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5"
                            >
                              <Check size={13} />
                              Save & Notify Driver
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: ENTER LOAD INFO & AUTO-CALCUATE */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <PlusCircle className="text-amber-500" size={18} /> Add New Shipping Freight Contract
            </h2>

            {/* AI Quick Book Dropzone */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setQuickBookDragActive(true); }}
              onDragLeave={() => setQuickBookDragActive(false)}
              onDrop={handleQuickBookDrop}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all relative ${
                quickBookDragActive 
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' 
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
              } mb-6`}
            >
              {quickBookLoading ? (
                <div className="py-2.5 space-y-2 flex flex-col items-center">
                  <RefreshCw className="animate-spin text-indigo-600" size={24} />
                  <p className="font-extrabold text-[10px] text-slate-800 uppercase tracking-widest">AI document scanning in progress...</p>
                  <p className="text-[9px] text-slate-500">Executing OCR extraction on Rate Con & BOL schedules...</p>
                </div>
              ) : (
                <div className="space-y-1.5 cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                    onChange={handleQuickBookFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center gap-1 text-slate-500 font-bold">
                    <Sparkles className="text-amber-500 shrink-0" size={14} />
                    <span className="text-[10px] uppercase tracking-wider">AI Quick-Book Dropzone</span>
                  </div>
                  <p className="text-[9px] text-slate-400">
                    Drop Rate Confirmation or BOL here, or <span className="text-indigo-600 font-bold underline">browse files</span> to auto-populate fields instantly.
                  </p>
                </div>
              )}

              {quickBookSuccessMsg && (
                <div className="mt-3 bg-emerald-50 border border-emerald-150 text-emerald-800 p-2 rounded-lg text-[9px] text-left leading-normal flex items-start gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>{quickBookSuccessMsg}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleCreateLoad} className="space-y-4 text-xs">
              
              {/* Load Number & Cargo Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Load Reference #</label>
                  <input
                    type="text"
                    required
                    value={loadNumber}
                    onChange={(e) => setLoadNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-800 outline-none font-semibold uppercase tracking-wide font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Cargo Type</label>
                  <select
                    value={cargoType}
                    onChange={(e) => setCargoType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-800 outline-none font-semibold"
                  >
                    <option value="Dry Van General">Dry Van General</option>
                    <option value="Refrigerated Food">Refrigerated Food</option>
                    <option value="Flatbed Steel">Flatbed Steel</option>
                    <option value="Heavy Machinery">Heavy Machinery</option>
                    <option value="Electronics Secure">Electronics Secure</option>
                    <option value="HazMat Chemical">HazMat Chemical ⚠️</option>
                  </select>
                </div>
              </div>

              {/* Weight & Rate per Mile */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                    <Weight size={12} className="text-slate-400" /> Freight Weight (Lbs)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="80000"
                    placeholder="e.g. 32000"
                    value={weightLbs}
                    onChange={(e) => setWeightLbs(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-800 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                    <DollarSign size={12} className="text-slate-400" /> Carrier Rate / Mile ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.5"
                    max="15.0"
                    placeholder="e.g. 2.45"
                    value={ratePerMile}
                    onChange={(e) => setRatePerMile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Geodisc Landmark Selection vs Custom Entry */}
              <div className="border-t border-b border-slate-100 py-3.5 my-2">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomLocations}
                      onChange={(e) => setUseCustomLocations(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <span>Manually enter custom cities</span>
                  </label>
                  <span className="text-[10px] bg-sky-50 text-sky-700 font-semibold px-2 py-0.5 rounded border border-sky-200/50">
                    {useCustomLocations ? 'Manual Override' : 'GeoDistance Engine'}
                  </span>
                </div>

                {!useCustomLocations ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">Origin Landmark Hub</label>
                      <select
                        value={originIndex}
                        onChange={(e) => setOriginIndex(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-slate-800 outline-none text-slate-800 font-medium"
                      >
                        {SHIPPING_HUBS.map((hub, idx) => (
                          <option key={hub.city} value={idx}>{hub.city}, {hub.state}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">Destination Landmark Hub</label>
                      <select
                        value={destIndex}
                        onChange={(e) => setDestIndex(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-slate-800 outline-none text-slate-800 font-medium"
                      >
                        {SHIPPING_HUBS.map((hub, idx) => (
                          <option key={hub.city} value={idx}>{hub.city}, {hub.state}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-500 font-medium mb-1">Origin City/State</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Portland, OR"
                          value={customOrigin}
                          onChange={(e) => setCustomOrigin(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-slate-800 outline-none font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-medium mb-1">Destination City/State</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Nashville, TN"
                          value={customDestination}
                          onChange={(e) => setCustomDestination(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-slate-800 outline-none font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">Override Est. Highway Distance (mi)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="5000"
                        value={customMiles}
                        onChange={(e) => setCustomMiles(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-slate-800 outline-none font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Auto-calculated Miles & Payout visual feedback card */}
              <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 shadow-inner border border-slate-800">
                <div className="flex justify-between items-center text-slate-400">
                  <div className="flex items-center gap-1">
                    <Route size={14} className="text-amber-400 animate-pulse" />
                    <span className="font-semibold uppercase tracking-wider text-[9px] text-slate-300">Live Auto-Calculation</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Carrier Rate: ${ratePerMile}/mi</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Calculated Distance</span>
                    <span className="text-xl font-black text-amber-300 font-mono">{calculatedMiles} <span className="text-xs font-normal">mi</span></span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Estimated Gross Cargo Cost</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">${computedPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                
                {!useCustomLocations && (
                  <p className="text-[9px] text-slate-400 italic font-medium leading-normal border-t border-slate-800/60 pt-2 flex items-center gap-1">
                    <span>🗺️</span> Calculated using Haversine Geodesic with a 1.18x highway winding multiplier.
                  </p>
                )}
              </div>

              {/* Driver & Truck Assignment Selector */}
              <div>
                <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                  <UserCheck size={12} className="text-slate-400" /> Assign Compliant Operator
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-800 outline-none font-semibold text-slate-800 text-xs"
                >
                  <option value="">-- Post as Unassigned Cargo (Keep in Queue) --</option>
                  {sortedDriversList.map((d) => (
                    <option key={d.id} value={d.id} className="text-xs">
                      {d.name} {d.truckId ? `(Truck ${d.truckId})` : ''} — {
                        d.overallStatus === 'NON-COMPLIANT' ? '🚨 Non-Compliant Expiry Warn' :
                        d.isHighRisk ? '⚠️ High Risk Review' : 
                        !d.isAvailable ? `📦 Assigned (${d.activeLoadCount} loads active)` :
                        '✅ Ready & Available'
                      }
                    </option>
                  ))}
                </select>
                {selectedDriverId && (
                  <div className="mt-2 text-[10px] text-slate-500 bg-amber-50 p-2.5 rounded-lg border border-amber-200/50 flex items-start gap-1.5 leading-normal">
                    <span>⚠️</span>
                    <span>
                      Assigning cargo directly commits driver resources and flags equipment. Verify the operator is free from CDL/Medical Expirations before dispatched actions.
                    </span>
                  </div>
                )}
              </div>

              {/* Dispatch Notes */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">Route Dispatch Notes (optional)</label>
                <textarea
                  placeholder="e.g. Leave dispatch instructions, gate access codes, or receiver requirements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-slate-800 outline-none h-14"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-1.5 uppercase tracking-wider transition-colors"
              >
                <PlusCircle size={14} className="text-amber-400" /> Confirm Cargo Carrier Booking
              </button>

            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: LOADS ACTIVE REGISTRY */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            
            {/* Search and Filters header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Map className="text-indigo-600 font-semibold" size={16} /> Dispatched Freight Boards
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Manage route manifests and transition cargo delivery life-cycles.</p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {/* Search */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search load no, hubs..."
                    value={loadSearch}
                    onChange={(e) => setLoadSearch(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] focus:ring-1 focus:ring-slate-800 w-full sm:w-40"
                  />
                </div>
                
                {/* Status Filter */}
                <select
                  value={loadStatusFilter}
                  onChange={(e) => setLoadStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] focus:ring-1 focus:ring-slate-800 font-semibold text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending Assignment</option>
                  <option value="Active">Active Route</option>
                  <option value="Dispatched">Dispatched Transit</option>
                  <option value="Delivered">Delivered Done</option>
                </select>
              </div>
            </div>

            {/* Load manifested entries */}
            <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto pr-0.5">
              {filteredLoads.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                  <Compass size={28} className="mx-auto text-slate-300 animate-spin-slow" />
                  <p className="font-bold uppercase tracking-wider text-[10px]">No Dispatched Contracts Located</p>
                  <p className="text-slate-500 max-w-sm mx-auto leading-normal">
                    Insert load details using the geo-distance engine layout on the left column to populate the active dispatch schedule.
                  </p>
                </div>
              ) : (
                filteredLoads.map((load) => (
                  <div key={load.id} className="p-5 hover:bg-slate-50/50 transition-colors text-xs space-y-4">
                    
                    {/* Header: ID, cargo type, status, and control actions */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-slate-850 p-1 bg-slate-100 rounded tracking-wider uppercase">
                            {load.loadNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">• {load.cargoType}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5">Booked at {load.submittedAt}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status styling */}
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded border ${
                          load.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' :
                          load.status === 'Dispatched' ? 'bg-blue-50 text-blue-700 border-blue-200/50 animate-pulse' :
                          load.status === 'Active' ? 'bg-amber-50 text-amber-700 border-amber-200/50' :
                          'bg-slate-50 text-slate-500 border-slate-200/40'
                        }`}>
                          {load.status === 'Pending' ? 'Waiting Assignment' : load.status}
                        </span>

                        {/* Delete Load block */}
                        <button
                          onClick={() => onDeleteLoad(load.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Load Booking"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Roadside Incident Alert linked to this freight / vehicle */}
                    {incidents
                      .filter(i => 
                        (i.loadId === load.id || 
                         (load.truckId && load.truckId !== 'None' && i.truckId === load.truckId) || 
                         (load.driverId && load.driverId !== 'Unassigned' && i.driverId === load.driverId)) && 
                        i.status !== 'Resolved / Cleared'
                      )
                      .map(inc => (
                        <div key={inc.id} className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <AlertTriangle size={17} className="text-rose-600 animate-pulse shrink-0" />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold uppercase text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                  🚨 Roadside Incident ({inc.type})
                                </span>
                                <span className="font-bold text-slate-900 text-xs">{inc.location}</span>
                              </div>
                              <p className="text-[11px] text-rose-900 mt-0.5">
                                Status: <strong className="uppercase">{inc.status}</strong>
                                {inc.serviceVendor && ` • Vendor: ${inc.serviceVendor}`}
                                {inc.etaMinutes && ` • ETA: ${inc.etaMinutes}m`}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              handleStartCoordinating(inc);
                              setIsIncidentFeedOpen(true);
                              window.scrollTo({ top: 180, behavior: 'smooth' });
                            }}
                            className="text-[10px] font-extrabold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg transition-colors shrink-0 uppercase tracking-wider shadow-xs"
                          >
                            Coordinate Roadside
                          </button>
                        </div>
                      ))}

                    {/* Geography route path visually represented */}
                    <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150 relative">
                      <div className="flex justify-between items-center relative z-10">
                        {/* Origin */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase font-mono tracking-wider font-bold">Start Origin</span>
                            <span className="font-extrabold text-slate-850 truncate">{load.originHub}</span>
                          </div>
                        </div>

                        {/* Visual Connector bar */}
                        <div className="flex-1 mx-4 flex items-center justify-center relative">
                          <div className="h-[2px] bg-slate-300 w-full dashed border-t border-dashed border-slate-400"></div>
                          <Navigation size={10} className="text-indigo-500 absolute rotate-90" />
                        </div>

                        {/* Destination */}
                        <div className="flex items-center gap-2 min-w-0 text-right">
                          <div>
                            <span className="text-[9px] text-slate-400 block uppercase font-mono tracking-wider font-semibold">End Destination</span>
                            <span className="font-extrabold text-slate-850 truncate">{load.destinationHub}</span>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0"></div>
                        </div>
                      </div>
                    </div>

                    {/* Numeric Cargo Metrics: Miles, Payout, Weight */}
                    <div className="grid grid-cols-3 gap-3 text-center bg-slate-50/40 py-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-medium">Distance</span>
                        <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">{load.calculatedMiles} mi</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-medium">Gross Weight</span>
                        <p className="font-mono font-medium text-slate-700 text-sm mt-0.5">{load.weightLbs.toLocaleString()} lbs</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-medium">Total Cost Payout</span>
                        <p className="font-mono font-bold text-emerald-600 text-sm mt-0.5">${load.payout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    {/* Driver, Assigned Vehicle & Progression status select */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Truck size={14} className="text-slate-450 shrink-0" />
                        <span className="text-slate-500">Carrier:</span>
                        <span className="font-bold text-slate-800">{load.driverName}</span>
                        {load.truckId && load.truckId !== 'None' && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-600 font-bold">
                            {load.truckId}
                          </span>
                        )}
                      </div>

                      {/* Manual dispatcher status progression controls */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">Move Status:</span>
                        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => onUpdateLoadStatus(load.id, 'Active')}
                            disabled={load.status === 'Active'}
                            className={`px-2 py-1 text-[9px] font-bold ${load.status === 'Active' ? 'bg-amber-100 text-amber-850' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                            title="Set Active Booking"
                          >
                            Active
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateLoadStatus(load.id, 'Dispatched')}
                            disabled={load.status === 'Dispatched'}
                            className={`px-2 py-1 text-[9px] font-bold ${load.status === 'Dispatched' ? 'bg-blue-100 text-blue-800' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                            title="Dispatch Driver in Transit"
                          >
                            Dispatch
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateLoadStatus(load.id, 'Delivered')}
                            disabled={load.status === 'Delivered'}
                            className={`px-2 py-1 text-[9px] font-bold ${load.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                            title="Mark Completed"
                          >
                            Delivered
                          </button>
                        </div>
                      </div>
                    </div>

                    {load.notes && (
                      <div className="bg-slate-50 p-2.5 rounded text-[10px] text-slate-500 border border-slate-100/60 font-medium">
                        <span className="font-bold uppercase text-[8px] text-slate-400 block mb-0.5">Dispatch Instructions</span>
                        "{load.notes}"
                      </div>
                    )}

                    {/* Documents & Invoicing section */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedLoadId(expandedLoadId === load.id ? null : load.id);
                          setEditingInvoiceLoadId(null);
                        }}
                        className="w-full flex justify-between items-center text-[10px] uppercase tracking-wider font-extrabold text-slate-600 hover:text-slate-850 transition-colors"
                      >
                        <span className="flex items-center gap-1.5 text-indigo-700">
                          <FileText size={12} className="shrink-0" /> Documents & Carrier Billing
                          {load.rateConFile && load.bolFile && (
                            <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.2 rounded font-black ml-1 uppercase">
                              {load.invoiceDetails ? 'Invoice Ready' : 'Ready to Compile'}
                            </span>
                          )}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {expandedLoadId === load.id ? 'Close Details ▲' : 'Manage Docs ▼'}
                        </span>
                      </button>

                      {expandedLoadId === load.id && (
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-4 animate-fade-in text-[11px] grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                          {/* Column 1: File Dropzones */}
                          <div className="space-y-3 w-full">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">1. Cargo & Shipping Documents</h4>
                            
                            {/* Rate Con Dropzone */}
                            <div
                              onDragOver={(e) => { e.preventDefault(); setActiveDragLoadId(load.id); setDragDocType('rateCon'); }}
                              onDragLeave={() => { setActiveDragLoadId(null); setDragDocType(null); }}
                              onDrop={(e) => handleLoadDocDrop(load.id, 'rateCon', e)}
                              className={`border-2 border-dashed rounded-lg p-3 text-center transition-all relative ${
                                load.rateConFile 
                                  ? 'border-emerald-200 bg-emerald-50/10' 
                                  : activeDragLoadId === load.id && dragDocType === 'rateCon'
                                  ? 'border-indigo-500 bg-indigo-50/30 scale-[1.01]' 
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              {load.rateConFile ? (
                                <div className="flex items-center justify-between text-left">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="text-emerald-500 shrink-0" size={16} />
                                    <div className="truncate">
                                      <strong className="text-slate-800 text-[10px] block truncate">{load.rateConFile.name}</strong>
                                      <span className="text-[9px] text-slate-400 block font-mono">{load.rateConFile.size} KB • Rate Confirmation</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 relative">
                                    <span className="bg-emerald-500 text-white rounded-full p-0.5"><Check size={8} /></span>
                                    <input 
                                      type="file" accept=".pdf,.png,.jpg,.jpeg,.txt"
                                      onChange={(e) => handleLoadDocChange(load.id, 'rateCon', e)}
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <span className="text-[9px] text-indigo-600 underline font-semibold cursor-pointer">Change</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1 cursor-pointer relative">
                                  <input 
                                    type="file" accept=".pdf,.png,.jpg,.jpeg,.txt"
                                    onChange={(e) => handleLoadDocChange(load.id, 'rateCon', e)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                  />
                                  <div className="flex items-center justify-center gap-1 text-slate-500 font-bold text-[10px]">
                                    <UploadCloud size={13} className="text-indigo-500 shrink-0" />
                                    <span>Rate Confirmation (Rate Con)</span>
                                  </div>
                                  <p className="text-[9px] text-slate-400">Drag or click to upload PDF client agreement</p>
                                </div>
                              )}
                            </div>

                            {/* BOL Dropzone */}
                            <div
                              onDragOver={(e) => { e.preventDefault(); setActiveDragLoadId(load.id); setDragDocType('bol'); }}
                              onDragLeave={() => { setActiveDragLoadId(null); setDragDocType(null); }}
                              onDrop={(e) => handleLoadDocDrop(load.id, 'bol', e)}
                              className={`border-2 border-dashed rounded-lg p-3 text-center transition-all relative ${
                                load.bolFile 
                                  ? 'border-emerald-200 bg-emerald-50/10' 
                                  : activeDragLoadId === load.id && dragDocType === 'bol'
                                  ? 'border-indigo-500 bg-indigo-50/30 scale-[1.01]' 
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              {load.bolFile ? (
                                <div className="flex items-center justify-between text-left">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="text-emerald-500 shrink-0" size={16} />
                                    <div className="truncate">
                                      <strong className="text-slate-800 text-[10px] block truncate">{load.bolFile.name}</strong>
                                      <span className="text-[9px] text-slate-400 block font-mono">{load.bolFile.size} KB • Bill of Lading</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 relative">
                                    <span className="bg-emerald-500 text-white rounded-full p-0.5"><Check size={8} /></span>
                                    <input 
                                      type="file" accept=".pdf,.png,.jpg,.jpeg,.txt"
                                      onChange={(e) => handleLoadDocChange(load.id, 'bol', e)}
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <span className="text-[9px] text-indigo-600 underline font-semibold cursor-pointer">Change</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1 cursor-pointer relative">
                                  <input 
                                    type="file" accept=".pdf,.png,.jpg,.jpeg,.txt"
                                    onChange={(e) => handleLoadDocChange(load.id, 'bol', e)}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                  />
                                  <div className="flex items-center justify-center gap-1 text-slate-500 font-bold text-[10px]">
                                    <UploadCloud size={13} className="text-indigo-500 shrink-0" />
                                    <span>Bill of Lading (BOL)</span>
                                  </div>
                                  <p className="text-[9px] text-slate-400">Drag or click to upload PDF receipt of delivery</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Column 2: Billing Invoice compilation status */}
                          <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200 w-full min-h-[140px] flex flex-col justify-between">
                            {ocrScanningLoadId === load.id ? (
                              <div className="py-6 text-center space-y-2 flex-1 flex flex-col justify-center items-center">
                                <RefreshCw className="animate-spin text-indigo-600" size={18} />
                                <strong className="text-[10px] uppercase font-black tracking-wider text-slate-700">AI OCR Parsing</strong>
                                <p className="text-[9px] text-slate-500 animate-pulse font-mono">{ocrScanningStep}</p>
                              </div>
                            ) : editingInvoiceLoadId === load.id ? (
                              /* Editable Pre-Filled Form */
                              <div className="space-y-2 text-[10px] text-slate-700">
                                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                                  <strong className="uppercase font-black text-slate-800 tracking-wider">Carrier Billing Draft</strong>
                                  <span className="text-[9px] text-indigo-600 font-bold font-mono">Status: Auto-Compiled</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[8px] text-slate-400 uppercase font-bold">Shipper Company</label>
                                    <input 
                                      type="text" value={invoiceDraft.shipperName}
                                      onChange={(e) => setInvoiceDraft({ ...invoiceDraft, shipperName: e.target.value })}
                                      className="w-full bg-slate-50 border border-slate-250 rounded px-1.5 py-0.5 text-slate-800 font-semibold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] text-slate-400 uppercase font-bold">Consignee (Receiver)</label>
                                    <input 
                                      type="text" value={invoiceDraft.consigneeName}
                                      onChange={(e) => setInvoiceDraft({ ...invoiceDraft, consigneeName: e.target.value })}
                                      className="w-full bg-slate-50 border border-slate-250 rounded px-1.5 py-0.5 text-slate-800 font-semibold"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[8px] text-slate-400 uppercase font-bold">Transit Subtotal ($)</label>
                                    <input 
                                      type="text" disabled value={invoiceDraft.subtotal}
                                      className="w-full bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] text-slate-400 uppercase font-bold">Fuel Surcharge ($)</label>
                                    <input 
                                      type="number" value={invoiceDraft.fees}
                                      onChange={(e) => setInvoiceDraft({ ...invoiceDraft, fees: parseFloat(e.target.value) || 0 })}
                                      className="w-full bg-slate-50 border border-slate-250 rounded px-1.5 py-0.5 text-slate-850 font-mono font-bold"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                                  <div className="font-mono flex flex-col justify-center">
                                    <span className="text-[8px] text-slate-400 block font-sans">Total Carrier Charge</span>
                                    <strong className="text-xs text-indigo-700">${((parseFloat(invoiceDraft.subtotal) || 0) + (parseFloat(invoiceDraft.fees) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInvoiceDraft(load.id)}
                                    className="w-full py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-[9px] uppercase tracking-wider transition-colors self-end"
                                  >
                                    Save Invoice
                                  </button>
                                </div>
                              </div>
                            ) : load.invoiceDetails ? (
                              /* Formal Printable Visual Invoice Card */
                              <div className="space-y-2 select-text font-sans text-[10px] flex-1 flex flex-col justify-between">
                                <div className="space-y-1 border-b border-slate-100 pb-1 flex flex-col">
                                  <div className="flex justify-between items-center font-mono text-[9px] text-slate-400">
                                    <span>BILLING INVOICE: <strong>{load.invoiceDetails.invoiceNumber}</strong></span>
                                    <span className="text-emerald-600 font-bold uppercase tracking-wider text-[8px]">Compiled</span>
                                  </div>
                                  <div className="flex justify-between items-start text-[9px] mt-1">
                                    <div>
                                      <span className="text-slate-400 uppercase block font-bold text-[8px]">Shipper</span>
                                      <strong className="text-slate-800">{load.invoiceDetails.shipperName}</strong>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-slate-400 uppercase block font-bold text-[8px]">Due Date</span>
                                      <strong className="text-slate-850 font-mono">{load.invoiceDetails.dueDate}</strong>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-0.5 text-[9px] font-mono py-1 text-slate-600">
                                  <div className="flex justify-between">
                                    <span>Base Transit Pay ({load.calculatedMiles} mi):</span>
                                    <span>${load.invoiceDetails.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Fuel & Accessorials Surcharges:</span>
                                    <span>+${load.invoiceDetails.fees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-900 font-black border-t border-slate-100 pt-1 text-[10px]">
                                    <span>TOTAL DUE CLAIM:</span>
                                    <span className="text-indigo-700">${load.invoiceDetails.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded flex items-center justify-center gap-1 text-[8px] uppercase tracking-wide transition-colors"
                                    title="Print Carrier Billing Invoice"
                                  >
                                    <Printer size={9} /> Print
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // download a simulated copy
                                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(load.invoiceDetails, null, 2));
                                      const downloadAnchor = document.createElement('a');
                                      downloadAnchor.setAttribute("href", dataStr);
                                      downloadAnchor.setAttribute("download", `invoice-${load.invoiceDetails.invoiceNumber}.json`);
                                      document.body.appendChild(downloadAnchor);
                                      downloadAnchor.click();
                                      downloadAnchor.remove();
                                    }}
                                    className="py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded flex items-center justify-center gap-1 text-[8px] uppercase tracking-wide transition-colors"
                                    title="Download Carrier Ledger data"
                                  >
                                    <Download size={9} /> Data
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInvoiceDraft(load.invoiceDetails);
                                      setEditingInvoiceLoadId(load.id);
                                    }}
                                    className="py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded flex items-center justify-center gap-1 text-[8px] uppercase tracking-wide transition-colors"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Pending files message */
                              <div className="py-6 text-center text-slate-400 space-y-2 flex-1 flex flex-col justify-center items-center">
                                <AlertCircle size={18} className="text-indigo-400 shrink-0" />
                                <strong className="text-[9px] uppercase font-black tracking-wider block text-slate-600">Pending Cargo Attachments</strong>
                                <p className="text-[9px] text-slate-400 max-w-[190px] mx-auto leading-normal">
                                  Upload both the **Rate Confirmation** and **BOL** schedules on the left to automatically compile billing invoices.
                                </p>
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
