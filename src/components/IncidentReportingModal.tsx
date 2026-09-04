import React, { useState } from 'react';
import { 
  Driver, 
  Vehicle, 
  DispatchLoad, 
  IncidentReport, 
  IncidentType, 
  IncidentSeverity 
} from '../types';
import { 
  AlertTriangle, 
  X, 
  ShieldAlert, 
  Truck, 
  MapPin, 
  Phone, 
  Wrench, 
  Camera, 
  CheckCircle2, 
  Upload, 
  Trash2, 
  FileText,
  Radio,
  Clock,
  Compass
} from 'lucide-react';

interface IncidentReportingModalProps {
  driver: Driver;
  assignedVehicle?: Vehicle;
  assignedLoads: DispatchLoad[];
  onClose: () => void;
  onSubmitIncident: (incident: Omit<IncidentReport, 'id' | 'reportedAt' | 'status'>) => void;
}

const INCIDENT_TYPES: { type: IncidentType; label: string; icon: string; description: string }[] = [
  { 
    type: 'Mechanical Breakdown', 
    label: 'Mechanical Breakdown', 
    icon: '⚙️', 
    description: 'Engine, transmission, cooling, alternator, or air brake failure' 
  },
  { 
    type: 'Collision / Accident', 
    label: 'Collision / Accident', 
    icon: '💥', 
    description: 'Impact with vehicle, stationary object, or animal' 
  },
  { 
    type: 'Tire Blowout', 
    label: 'Tire Blowout / Flat', 
    icon: '🛞', 
    description: 'Drive, steer, or trailer tire de-tread, puncture, or rim hazard' 
  },
  { 
    type: 'DOT Roadside Inspection', 
    label: 'DOT Inspection / Violation', 
    icon: '📋', 
    description: 'State trooper roadside inspection, Level 1-3, or OOS citation' 
  },
  { 
    type: 'Cargo Shift / HazMat Issue', 
    label: 'Cargo / HazMat Issue', 
    icon: '📦', 
    description: 'Load shift, broken strapping, seal breach, or leakage' 
  },
  { 
    type: 'Severe Weather Stoppage', 
    label: 'Severe Weather Stoppage', 
    icon: '🌨️', 
    description: 'Blizzard, black ice, high crosswinds, or road closure shutdown' 
  },
  { 
    type: 'Medical Emergency', 
    label: 'Medical Emergency', 
    icon: '🚑', 
    description: 'Driver or passenger acute illness or injury on duty' 
  },
  { 
    type: 'Other Roadside Issue', 
    label: 'Other Roadside Event', 
    icon: '⚠️', 
    description: 'Fuel contamination, lock-out, bridge strike, or miscellaneous' 
  },
];

const ASSISTANCE_OPTIONS = [
  'Heavy Duty Towing',
  'Mobile Roadside Mechanic',
  'Tire Replacement Unit',
  'Reefer / ThermoKing Tech',
  'Fuel Delivery (Prime & Start)',
  'Lockout / Battery Jumpstart',
  'Cargo Cross-Dock / Transfer',
  'HazMat Cleanup / Spill Kit',
  'Relay Tractor / Relief Driver'
];

export default function IncidentReportingModal({
  driver,
  assignedVehicle,
  assignedLoads,
  onClose,
  onSubmitIncident
}: IncidentReportingModalProps) {
  // Form State
  const [incidentType, setIncidentType] = useState<IncidentType>('Mechanical Breakdown');
  const [severity, setSeverity] = useState<IncidentSeverity>('Major');
  const [location, setLocation] = useState('');
  const [truckId, setTruckId] = useState(driver.truckId || assignedVehicle?.unitNumber || 'TRK-101');
  const [selectedLoadId, setSelectedLoadId] = useState(assignedLoads.length > 0 ? assignedLoads[0].id : '');
  const [description, setDescription] = useState('');
  const [driverPhone, setDriverPhone] = useState(driver.profileInfo?.phone || '(312) 555-0192');
  
  // Safety / Legal Questions
  const [isVehicleDrivable, setIsVehicleDrivable] = useState(false);
  const [injuriesReported, setInjuriesReported] = useState(false);
  const [policeContacted, setPoliceContacted] = useState(false);
  const [policeReportNumber, setPoliceReportNumber] = useState('');

  // Assistance Needs
  const [assistanceNeeded, setAssistanceNeeded] = useState<string[]>(['Mobile Roadside Mechanic']);
  
  // Photos / Files
  const [photos, setPhotos] = useState<{ name: string; size?: number; dataUrl?: string }[]>([]);
  const [certified, setCertified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const toggleAssistance = (item: string) => {
    setAssistanceNeeded(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList: File[] = Array.from(e.target.files);
      const newPhotos = fileList.map((f: File) => ({
        name: f.name,
        size: f.size,
        dataUrl: URL.createObjectURL(f)
      }));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certified) {
      alert('Please check the confirmation box certifying the incident details.');
      return;
    }
    if (!location.trim()) {
      alert('Please provide the exact roadside location or nearest mile marker.');
      return;
    }
    if (!description.trim()) {
      alert('Please provide a brief description of the incident.');
      return;
    }

    setSubmitting(true);

    onSubmitIncident({
      driverId: driver.id,
      driverName: driver.name,
      driverPhone,
      truckId,
      loadId: selectedLoadId || undefined,
      type: incidentType,
      severity,
      location,
      description,
      isVehicleDrivable,
      injuriesReported,
      policeContacted,
      policeReportNumber: policeContacted ? policeReportNumber : undefined,
      assistanceNeeded,
      photos
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-6">
        
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 sm:p-6 flex justify-between items-start gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-600/90 flex items-center justify-center text-white shadow-lg border border-rose-400/40 shrink-0">
              <AlertTriangle size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-rose-500/30 text-rose-200 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-rose-400/30">
                  Priority Dispatch Broadcast
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  FMCSA § 392.22 Standard
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-1">
                Report Roadside Incident & Emergency
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Instantly notify central dispatch, trigger roadside assistance triage, and log an official DOT incident audit trail.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Safety First Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 text-xs text-amber-900 flex items-center gap-3">
          <ShieldAlert size={18} className="text-amber-600 shrink-0" />
          <div className="leading-tight">
            <strong className="font-extrabold uppercase text-[11px] block">Driver Safety First:</strong>
            <span>If in danger or injured, dial 911 first. Activate 4-way hazard flashers and deploy reflective emergency triangles within 10 minutes.</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Incident Type & Severity */}
          <div className="space-y-3">
            <label className="block text-slate-800 font-extrabold uppercase tracking-wider text-[11px]">
              1. Incident Classification
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {INCIDENT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.type}
                  onClick={() => setIncidentType(t.type)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    incidentType === t.type
                      ? 'border-rose-600 bg-rose-50/70 text-rose-950 font-bold shadow-xs ring-1 ring-rose-500'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl mb-1">{t.icon}</span>
                  <span className="text-[11px] font-bold block leading-tight">{t.label}</span>
                  <span className="text-[9px] text-slate-500 mt-1 line-clamp-2">{t.description}</span>
                </button>
              ))}
            </div>

            {/* Severity Level Picker */}
            <div className="pt-2">
              <span className="block text-slate-600 font-bold mb-1 text-[10px] uppercase">Urgency & Severity Level:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSeverity('Critical')}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    severity === 'Critical'
                      ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-xs font-black uppercase">🚨 Critical</span>
                  <span className="block text-[9px] opacity-80">911 / Heavy Tow / Road Blocked</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSeverity('Major')}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    severity === 'Major'
                      ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-xs font-black uppercase">⚠️ Major</span>
                  <span className="block text-[9px] opacity-80">Immobilized / Tech Required</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSeverity('Minor')}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    severity === 'Minor'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block text-xs font-black uppercase">ℹ️ Minor</span>
                  <span className="block text-[9px] opacity-80">Drivable / Caution</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Location & Equipment */}
          <div className="space-y-3 pt-2 border-t border-slate-150">
            <label className="block text-slate-800 font-extrabold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <MapPin size={14} className="text-rose-600" /> 2. Exact Roadside Location & Vehicle
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  Highway, Direction & Mile Marker / Landmark <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. I-80 Eastbound, MM 142 near Des Moines, IA (Right shoulder)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:bg-white outline-none focus:ring-1 focus:ring-rose-500 pl-8"
                  />
                  <MapPin size={14} className="absolute left-2.5 top-3 text-slate-400" />
                </div>
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setLocation('I-80 EB, MM 174 (Paved Right Shoulder)')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded transition-colors"
                  >
                    + I-80 EB Shoulder
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation('I-5 NB, Exit 218 Weigh Station & Rest Area')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded transition-colors"
                  >
                    + I-5 Rest Area
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocation('I-94 WB, MM 88 near Kalamazoo, MI')}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded transition-colors"
                  >
                    + I-94 WB MM 88
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <Truck size={12} className="text-slate-400" /> Vehicle Unit Number
                </label>
                <input
                  type="text"
                  required
                  value={truckId}
                  onChange={(e) => setTruckId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <Phone size={12} className="text-slate-400" /> Driver Direct Callback Phone
                </label>
                <input
                  type="text"
                  required
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 focus:bg-white outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">
                  Associated Dispatched Load (if hauling freight)
                </label>
                <select
                  value={selectedLoadId}
                  onChange={(e) => setSelectedLoadId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white outline-none font-medium"
                >
                  <option value="">No Active Freight / Bobtail / Deadhead</option>
                  {assignedLoads.map(load => (
                    <option key={load.id} value={load.id}>
                      {load.loadNumber} — {load.originHub} → {load.destinationHub} ({load.cargoType}, {load.weightLbs.toLocaleString()} lbs)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Safety & Legal Triage Check */}
          <div className="space-y-3 pt-2 border-t border-slate-150">
            <label className="block text-slate-800 font-extrabold uppercase tracking-wider text-[11px]">
              3. Safety, Legal & Drivability Status
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Question 1 */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <span className="font-bold text-slate-800 text-[11px]">Is Vehicle Drivable?</span>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsVehicleDrivable(true)}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      isVehicleDrivable ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border'
                    }`}
                  >
                    Yes (Drivable)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVehicleDrivable(false)}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      !isVehicleDrivable ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border'
                    }`}
                  >
                    No (Immobilized)
                  </button>
                </div>
              </div>

              {/* Question 2 */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <span className="font-bold text-slate-800 text-[11px]">Any Injuries Reported?</span>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setInjuriesReported(false)}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      !injuriesReported ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border'
                    }`}
                  >
                    No Injuries
                  </button>
                  <button
                    type="button"
                    onClick={() => setInjuriesReported(true)}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      injuriesReported ? 'bg-rose-600 text-white animate-pulse' : 'bg-white text-slate-600 border'
                    }`}
                  >
                    Yes (Injured)
                  </button>
                </div>
              </div>

              {/* Question 3 */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <span className="font-bold text-slate-800 text-[11px]">Police On Scene?</span>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPoliceContacted(false)}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      !policeContacted ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 border'
                    }`}
                  >
                    No Police
                  </button>
                  <button
                    type="button"
                    onClick={() => setPoliceContacted(true)}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      policeContacted ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'
                    }`}
                  >
                    Yes (Police)
                  </button>
                </div>
              </div>
            </div>

            {policeContacted && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                <label className="block text-blue-900 font-bold mb-1">
                  Police Department / Agency & Case / Citation #
                </label>
                <input
                  type="text"
                  placeholder="e.g. Iowa State Patrol Troop A, Report # ISP-2026-9810, Trooper Miller"
                  value={policeReportNumber}
                  onChange={(e) => setPoliceReportNumber(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Section 4: Incident Description */}
          <div className="space-y-2 pt-2 border-t border-slate-150">
            <label className="block text-slate-800 font-extrabold uppercase tracking-wider text-[11px]">
              4. Event Statement & Current Situation <span className="text-rose-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe what occurred: signs prior to breakdown, current position on shoulder, warning triangles deployed, condition of freight and tractor..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-rose-500 outline-none"
            />
          </div>

          {/* Section 5: Roadside Assistance Checklist */}
          <div className="space-y-2 pt-2 border-t border-slate-150">
            <label className="block text-slate-800 font-extrabold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Wrench size={14} className="text-indigo-600" /> 5. Required Roadside Assistance & Services
            </label>
            <p className="text-[10px] text-slate-500">Select services dispatch should immediately procure:</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ASSISTANCE_OPTIONS.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => toggleAssistance(item)}
                  className={`p-2 rounded-lg border text-left text-[11px] transition-all flex items-center justify-between ${
                    assistanceNeeded.includes(item)
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{item}</span>
                  {assistanceNeeded.includes(item) && (
                    <CheckCircle2 size={13} className="text-indigo-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 6: Photo / Citation Attachment Simulator */}
          <div className="space-y-2 pt-2 border-t border-slate-150">
            <label className="block text-slate-800 font-extrabold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Camera size={14} className="text-blue-600" /> 6. Scene Photos & Documents (Damage, Tire, Citation)
            </label>

            <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-4 text-center bg-slate-50 transition-colors">
              <input
                type="file"
                id="incident-file-upload"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="incident-file-upload"
                className="cursor-pointer flex flex-col items-center gap-1 text-slate-600 hover:text-slate-900"
              >
                <Upload size={20} className="text-slate-400" />
                <span className="font-bold text-[11px]">Click or drag to attach incident scene photos / citations</span>
                <span className="text-[9px] text-slate-400">Attach photos of damage, shoulder setup, or DOT inspection sheets (Simulated)</span>
              </label>
            </div>

            {/* Uploaded Photos Preview */}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {photos.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-mono shadow-xs">
                    <FileText size={12} className="text-blue-600" />
                    <span className="max-w-[140px] truncate text-[10px]">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 ml-1"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 7: Certification & Signature */}
          <div className="pt-2 border-t border-slate-150 bg-slate-50 p-3 rounded-xl border">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={certified}
                onChange={(e) => setCertified(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 shrink-0"
              />
              <span className="text-[10px] text-slate-700 leading-tight">
                <strong>Certified Driver Statement:</strong> I certify under company safety policy and FMCSA regulations that this roadside incident report is accurate to the best of my knowledge. Submitting broadcasts an immediate notification to Dispatch and records an immutable log in the carrier Audit Trail.
              </span>
            </label>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Radio size={12} className="text-emerald-500 animate-pulse" />
              <span>Real-time dispatch synchronization active</span>
            </div>

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || !certified}
                className={`px-5 py-2.5 rounded-lg text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md ${
                  certified && !submitting
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-slate-400 cursor-not-allowed'
                }`}
              >
                <AlertTriangle size={15} />
                {submitting ? 'Transmitting to Dispatch...' : 'Broadcast Incident to Dispatch'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
