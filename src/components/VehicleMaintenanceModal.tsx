import React, { useState } from 'react';
import { Vehicle, MaintenanceInvoice } from '../types';
import { 
  Wrench, 
  Upload, 
  FileText, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Plus, 
  Trash2, 
  X, 
  Download, 
  AlertCircle,
  Truck,
  Gauge,
  Tag
} from 'lucide-react';

interface VehicleMaintenanceModalProps {
  vehicle: Vehicle;
  invoices: MaintenanceInvoice[];
  isOpen: boolean;
  onClose: () => void;
  onAddInvoice: (invoice: Omit<MaintenanceInvoice, 'id' | 'submittedAt'>, shouldResetStatus?: boolean) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
  currentUserRole?: string;
}

export default function VehicleMaintenanceModal({
  vehicle,
  invoices,
  isOpen,
  onClose,
  onAddInvoice,
  onDeleteInvoice,
  currentUserRole
}: VehicleMaintenanceModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'upload'>('list');
  
  // Form State
  const [vendorName, setVendorName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('2026-05-24');
  const [serviceType, setServiceType] = useState<MaintenanceInvoice['serviceType']>('Oil Change & PM');
  const [amount, setAmount] = useState('');
  const [odometerReading, setOdometerReading] = useState(vehicle.mileage?.toString() || '');
  const [notes, setNotes] = useState('');
  const [resetInspectionStatus, setResetInspectionStatus] = useState(true);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; dataUrl?: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  if (!isOpen) return null;

  // Filter invoices for this specific unit
  const unitInvoices = invoices.filter(
    inv => inv.unitNumber === vehicle.unitNumber || inv.vehicleId === vehicle.id
  );

  const totalSpentOnUnit = unitInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFile({
          name: file.name,
          size: file.size,
          dataUrl: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFile({
          name: file.name,
          size: file.size,
          dataUrl: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = parseFloat(amount);
    if (!vendorName.trim()) {
      setFormError('Please enter service vendor name (e.g. TA Truck Service, Speedco, Rush Truck Centers).');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid invoice dollar amount.');
      return;
    }

    const invNum = invoiceNumber.trim() || `INV-${Math.floor(10000 + Math.random() * 90000)}`;

    onAddInvoice({
      vehicleId: vehicle.id,
      unitNumber: vehicle.unitNumber,
      invoiceNumber: invNum,
      date,
      vendorName: vendorName.trim(),
      serviceType,
      amount: parsedAmount,
      odometerReading: odometerReading ? parseInt(odometerReading, 10) : vehicle.mileage,
      notes: notes.trim(),
      receiptFile: selectedFile || { name: `WorkOrder_${vehicle.unitNumber}_${invNum}.pdf`, size: 184000 }
    }, resetInspectionStatus && (serviceType === 'Oil Change & PM' || serviceType === 'DOT Annual Periodic Inspection'));

    // Reset Form
    setVendorName('');
    setInvoiceNumber('');
    setAmount('');
    setNotes('');
    setSelectedFile(null);
    setSuccessToast(`Invoice ${invNum} logged successfully for Unit ${vehicle.unitNumber}!`);
    setActiveTab('list');
    setTimeout(() => setSuccessToast(''), 4000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Truck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-widest text-blue-400 font-bold">
                  Fleet Maintenance Records
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                  vehicle.maintenanceStatus === 'Up to Date'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : vehicle.maintenanceStatus === 'Scheduled'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {vehicle.maintenanceStatus}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                Unit {vehicle.unitNumber} <span className="text-slate-400 font-mono text-xs font-normal">({vehicle.vin})</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-Header HUD Bar */}
        <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-slate-300">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">Current Odometer</span>
              <span className="font-bold text-white font-mono">{(vehicle.mileage || 50000).toLocaleString()} mi</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">Total Maintenance Spent</span>
              <span className="font-black text-emerald-400 font-mono">${totalSpentOnUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="w-px h-6 bg-slate-700 hidden sm:block" />
            <div className="hidden sm:block">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">Total Invoices</span>
              <span className="font-bold text-white font-mono">{unitInvoices.length} filed</span>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                activeTab === 'list'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Invoices ({unitInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Plus size={12} /> Upload Invoice
            </button>
          </div>
        </div>

        {/* Toast alert */}
        {successToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle size={14} className="text-emerald-600 shrink-0" />
            {successToast}
          </div>
        )}

        {/* Body content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'list' ? (
            <div>
              {unitInvoices.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">No Invoices Uploaded Yet</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Upload repair work orders, oil change tickets, and DOT inspection receipts for Unit {vehicle.unitNumber}.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-colors uppercase tracking-wider"
                  >
                    <Plus size={13} /> Upload First Invoice
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {unitInvoices.map((inv) => (
                    <div 
                      key={inv.id}
                      className="bg-white p-4 rounded-xl border border-slate-250/70 hover:border-slate-350 transition-all shadow-2xs space-y-2.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-slate-900 text-xs">
                              {inv.invoiceNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              inv.serviceType === 'Oil Change & PM'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : inv.serviceType === 'DOT Annual Periodic Inspection'
                                ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                : inv.serviceType === 'Brakes & Air System'
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {inv.serviceType}
                            </span>
                          </div>
                          <p className="text-slate-600 font-semibold mt-0.5">{inv.vendorName}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-slate-950 font-mono block">
                            ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Date: {inv.date}</span>
                        </div>
                      </div>

                      {/* Notes / Description */}
                      {inv.notes && (
                        <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] leading-relaxed">
                          {inv.notes}
                        </p>
                      )}

                      {/* Footer Row */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                        <div className="flex items-center gap-3">
                          {inv.odometerReading && (
                            <span className="flex items-center gap-1">
                              <Gauge size={11} className="text-slate-400" />
                              Odometer: <strong>{inv.odometerReading.toLocaleString()} mi</strong>
                            </span>
                          )}
                          {inv.receiptFile && (
                            <span className="flex items-center gap-1 text-blue-600 font-sans font-bold">
                              <FileText size={11} /> {inv.receiptFile.name}
                            </span>
                          )}
                        </div>

                        {onDeleteInvoice && currentUserRole === 'Safety Manager & CEO' && (
                          <button
                            onClick={() => onDeleteInvoice(inv.id)}
                            className="text-rose-500 hover:text-rose-700 font-sans text-[10px] font-bold"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Upload Form */
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2 font-medium">
                  <AlertCircle size={14} className="shrink-0 text-rose-600" />
                  {formError}
                </div>
              )}

              {/* Drag & Drop Box */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`p-4 border-2 border-dashed rounded-xl text-center transition-all ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-250 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <input
                  type="file"
                  id="invoice-file-upload"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                />
                <label htmlFor="invoice-file-upload" className="cursor-pointer block">
                  <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto text-blue-600 mb-2">
                    <Upload size={18} />
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="font-bold text-emerald-800 text-xs flex items-center justify-center gap-1.5">
                        <CheckCircle size={13} className="text-emerald-600" /> {selectedFile.name}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Click to swap file
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">
                        Drag & drop vendor work order / invoice, or <span className="text-blue-600 underline">browse</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Supports PDF, PNG, JPG receipts (Max 10MB)
                      </span>
                    </div>
                  )}
                </label>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Service Vendor / Shop Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TA Petro, Speedco, Rush Truck Centers"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Work Order / Invoice #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WO-90412 (Auto if blank)"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Maintenance Category *
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as MaintenanceInvoice['serviceType'])}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="Oil Change & PM">Oil Change & PM (Preventative Maintenance)</option>
                    <option value="DOT Annual Periodic Inspection">DOT Annual Periodic Inspection (FMCSA 396.17)</option>
                    <option value="Brakes & Air System">Brakes & Air Brake System</option>
                    <option value="Tires & Alignment">Tires & Steer/Drive Alignment</option>
                    <option value="Engine Repair">Engine & Aftertreatment (DPF/DEF/EGR)</option>
                    <option value="Transmission & Drivetrain">Transmission, Clutch & Drivetrain</option>
                    <option value="Trailer & Body Repair">Trailer, Reefer & Body Work</option>
                    <option value="Electrical & Lighting">Electrical, Alternator & Lights</option>
                    <option value="Other Maintenance">Other Fleet Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Service Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Total Amount ($ USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Odometer at Service (Miles)
                  </label>
                  <input
                    type="number"
                    placeholder={vehicle.mileage?.toString() || '65000'}
                    value={odometerReading}
                    onChange={(e) => setOdometerReading(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>

              {/* Service description */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Service Notes / Parts Replaced
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Changed 15W-40 oil, replaced oil and fuel filters, greased all fittings..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Quick Status Update Checkbox */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="reset-status-checkbox"
                  checked={resetInspectionStatus}
                  onChange={(e) => setResetInspectionStatus(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="reset-status-checkbox" className="cursor-pointer">
                  <span className="font-bold text-slate-800 text-xs block">
                    Auto-update vehicle maintenance status to 'Up to Date'
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Resets inspection odometer tracking and certifies unit as fully compliant.
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs uppercase tracking-wider flex items-center gap-1.5"
                >
                  <CheckCircle size={14} /> Save & Upload Invoice
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
