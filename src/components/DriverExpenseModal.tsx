import React, { useState } from 'react';
import { Driver, DispatchLoad, DriverExpense, DriverExpenseCategory } from '../types';
import { 
  DollarSign, 
  Receipt, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  X, 
  FileText, 
  Scale, 
  Truck, 
  Plus, 
  Clock, 
  Tag
} from 'lucide-react';

interface DriverExpenseModalProps {
  driver: Driver;
  loads?: DispatchLoad[];
  existingExpenses: DriverExpense[];
  isOpen: boolean;
  onClose: () => void;
  onSubmitExpense: (expense: Omit<DriverExpense, 'id' | 'submittedAt'>) => void;
}

export default function DriverExpenseModal({
  driver,
  loads = [],
  existingExpenses,
  isOpen,
  onClose,
  onSubmitExpense
}: DriverExpenseModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');

  // Form states
  const [category, setCategory] = useState<DriverExpenseCategory>('Scale (CAT Scale)');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('2026-05-24');
  const [loadNumber, setLoadNumber] = useState(loads[0]?.loadNumber || '');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; dataUrl?: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  if (!isOpen) return null;

  const driverExpenses = existingExpenses.filter(e => e.driverId === driver.id);
  const totalReimbursed = driverExpenses
    .filter(e => e.status === 'Approved' || e.status === 'Reimbursed')
    .reduce((sum, e) => sum + e.amount, 0);

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
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid dollar amount for the expense.');
      return;
    }

    if (!description.trim()) {
      setFormError('Please enter a short explanation or vendor name (e.g. CAT Scale Pilot #491, Sysco Cold Storage Lumper).');
      return;
    }

    onSubmitExpense({
      driverId: driver.id,
      driverName: driver.name,
      date,
      category,
      amount: parsedAmount,
      loadNumber: loadNumber.trim() || undefined,
      description: description.trim(),
      receiptFile: selectedFile || { name: `Receipt_${driver.name.replace(/\s+/g, '')}_${category.replace(/\s+/g, '')}.jpg`, size: 125000 },
      status: 'Approved' // auto-approved into corresponding payroll
    });

    // Reset Form
    setAmount('');
    setDescription('');
    setSelectedFile(null);
    setSuccessToast(`Out-of-pocket ${category} ($${parsedAmount.toFixed(2)}) submitted and queued for your weekly payroll reimbursement!`);
    setActiveTab('history');
    setTimeout(() => setSuccessToast(''), 4500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Receipt size={20} />
            </div>
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-400 font-bold">
                Driver Expense & Payroll Reimbursement
              </span>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                Out-of-Pocket Reimbursements
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
        <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-4 text-slate-300 font-mono">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-sans">Driver</span>
              <strong className="text-white">{driver.name}</strong>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-sans">Total Approved</span>
              <strong className="text-emerald-400 font-black">${totalReimbursed.toFixed(2)}</strong>
            </div>
          </div>

          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                activeTab === 'upload'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              + New Expense
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Receipts ({driverExpenses.length})
            </button>
          </div>
        </div>

        {/* Success toast */}
        {successToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle size={14} className="text-emerald-600 shrink-0" />
            {successToast}
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'upload' ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-900 text-xs flex items-start gap-2.5">
                <CheckCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Automatic Payroll Reimbursement</strong>
                  <span className="text-blue-700 text-[11px] leading-relaxed block mt-0.5">
                    Upload your receipts for scales, lumpers, tolls, or washouts paid out of pocket. Amounts are automatically credited to your active weekly pay settlement as non-taxable expense reimbursements.
                  </span>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2 font-medium">
                  <AlertCircle size={14} className="shrink-0 text-rose-600" />
                  {formError}
                </div>
              )}

              {/* Receipt Upload Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`p-4 border-2 border-dashed rounded-xl text-center transition-all ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-50'
                    : selectedFile
                    ? 'border-emerald-500 bg-emerald-50/60'
                    : 'border-slate-250 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <input
                  type="file"
                  id="driver-receipt-upload"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                />
                <label htmlFor="driver-receipt-upload" className="cursor-pointer block">
                  <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto text-emerald-600 mb-2">
                    <Upload size={18} />
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="font-bold text-emerald-900 text-xs flex items-center justify-center gap-1.5">
                        <CheckCircle size={13} className="text-emerald-600" /> {selectedFile.name}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Click to swap image/receipt
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">
                        Upload receipt photo or PDF (CAT Scale ticket, lumper receipt)
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Drag and drop receipt image or click to choose
                      </span>
                    </div>
                  )}
                </label>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DriverExpenseCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-600 font-medium"
                  >
                    <option value="Scale (CAT Scale)">Scale (CAT Scale Weight Ticket)</option>
                    <option value="Lumper Fee">Lumper Fee (Dock Unload / Pallet Restack)</option>
                    <option value="Tolls & Turnpike">Tolls & Turnpike Fees</option>
                    <option value="Trailer Washout">Trailer Washout / Sanitation</option>
                    <option value="DEF / Fluids">DEF / Diesel Exhaust Fluid</option>
                    <option value="Parking">Truck Stop Paid Staging / Parking</option>
                    <option value="Emergency Roadside Repair">Emergency Roadside Repair / Tire Service</option>
                    <option value="Other Out-of-Pocket">Other Out-of-Pocket Road Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Amount Paid ($ USD) *
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
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-600 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Date of Expense *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Related Trip / Load Number
                  </label>
                  {loads.length > 0 ? (
                    <select
                      value={loadNumber}
                      onChange={(e) => setLoadNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
                    >
                      <option value="">-- Select Trip / None --</option>
                      {loads.map(ld => (
                        <option key={ld.id} value={ld.loadNumber}>
                          {ld.loadNumber} ({ld.originHub} → {ld.destinationHub})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. LD-3942"
                      value={loadNumber}
                      onChange={(e) => setLoadNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Vendor & Description Details *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CAT Scale ticket #40192 at Pilot Travel Center, Sysco grocery lumper"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs uppercase tracking-wider flex items-center gap-1.5"
                >
                  <CheckCircle size={14} /> Submit for Payroll Reimbursement
                </button>
              </div>
            </form>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              {driverExpenses.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs">
                  No out-of-pocket receipts submitted yet.
                </div>
              ) : (
                driverExpenses.map((exp) => (
                  <div 
                    key={exp.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{exp.category}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {exp.status === 'Approved' ? 'Added to Payroll' : exp.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{exp.description}</p>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-slate-900 font-mono text-sm block">
                          ${exp.amount.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{exp.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200/50">
                      <span>{exp.loadNumber ? `Trip: ${exp.loadNumber}` : 'General Road Expense'}</span>
                      {exp.receiptFile && (
                        <span className="flex items-center gap-1 text-emerald-700 font-sans font-bold">
                          <FileText size={11} /> {exp.receiptFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
