import React, { useState, useMemo } from 'react';
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
  Route
} from 'lucide-react';
import { Driver, DispatchLoad } from '../types';

interface DispatchPortalProps {
  drivers: Driver[];
  loads: DispatchLoad[];
  onAddLoad: (load: Omit<DispatchLoad, 'id' | 'submittedAt'>) => void;
  onUpdateLoadStatus: (id: string, status: DispatchLoad['status']) => void;
  onDeleteLoad: (id: string) => void;
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
  onAddLoad,
  onUpdateLoadStatus,
  onDeleteLoad
}: DispatchPortalProps) {
  // Input fields state
  const [loadNumber, setLoadNumber] = useState(`LD-${Math.floor(1000 + Math.random() * 9000)}`);
  const [originIndex, setOriginIndex] = useState('1'); // Chicago by default
  const [destIndex, setDestIndex] = useState('7'); // New York by default
  const [customOrigin, setCustomOrigin] = useState('');
  const [customDestination, setCustomDestination] = useState('');
  const [useCustomLocations, setUseCustomLocations] = useState(false);
  const [customMiles, setCustomMiles] = useState('450');

  const [cargoType, setCargoType] = useState('Dry Van General');
  const [weightLbs, setWeightLbs] = useState('32000');
  const [ratePerMile, setRatePerMile] = useState('2.45');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [notes, setNotes] = useState('');

  // Filtering loads state
  const [loadSearch, setLoadSearch] = useState('');
  const [loadStatusFilter, setLoadStatusFilter] = useState<string>('ALL');

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
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Booked Gross Value</p>
          <p className="text-2xl font-black text-slate-850 font-mono">${dispatchStats.totalPayoutValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: ENTER LOAD INFO & AUTO-CALCUATE */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <PlusCircle className="text-amber-500" size={18} /> Add New Shipping Freight Contract
            </h2>

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
