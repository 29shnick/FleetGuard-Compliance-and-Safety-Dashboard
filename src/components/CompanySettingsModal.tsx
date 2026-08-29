import React, { useState } from 'react';
import { CompanyInfo, UserRole } from '../types';
import { 
  Building2, 
  X, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard,
  Building,
  RotateCcw
} from 'lucide-react';
import { DEFAULT_COMPANY_INFO } from '../data';

interface CompanySettingsModalProps {
  companyInfo: CompanyInfo;
  currentUserRole: UserRole;
  onClose: () => void;
  onSave: (updatedCompany: CompanyInfo) => void;
}

export default function CompanySettingsModal({
  companyInfo,
  currentUserRole,
  onClose,
  onSave
}: CompanySettingsModalProps) {
  const [formData, setFormData] = useState<CompanyInfo>({ ...companyInfo });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const canEdit = currentUserRole === 'Safety Manager & CEO' || (currentUserRole as string) === 'Administrator';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetDefault = () => {
    if (window.confirm('Reset company information to default FastGate Logistics details?')) {
      setFormData({ ...DEFAULT_COMPANY_INFO });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-6 flex justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md border border-blue-400/30">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Company & Carrier Profile Setup
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your trucking company details, USDOT/MC numbers, FEIN, address, and IFTA accounts used on all settlements and filings.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
            title="Close Company Settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning banner if read-only */}
        {!canEdit && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 text-xs text-amber-800 font-medium flex items-center gap-2">
            <ShieldCheck size={16} className="text-amber-600 shrink-0" />
            <span>You are viewing company details in read-only mode. Only Administrators or Safety Managers & CEOs can save changes.</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
          
          {/* Section 1: Legal Entity & Authorities */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-150">
              <Building className="text-blue-600" size={15} /> Company Identification & DOT Authority
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Company Legal Name</label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  placeholder="e.g. Apex Express Freight LLC"
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">DBA / Operating Name (Optional)</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="e.g. Apex Logistics"
                  value={formData.dbaName || ''}
                  onChange={(e) => setFormData({ ...formData, dbaName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">USDOT Registration Number</label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  placeholder="e.g. 3892019"
                  value={formData.usdotNumber}
                  onChange={(e) => setFormData({ ...formData, usdotNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">MC / FF Operating Authority #</label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  placeholder="e.g. MC-1092841"
                  value={formData.mcNumber}
                  onChange={(e) => setFormData({ ...formData, mcNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tax IDs & Contact */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-150">
              <FileText className="text-blue-600" size={15} /> Federal Tax ID & Office Contact Info
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  Federal FEIN / Tax ID
                </label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  placeholder="e.g. 36-9812019"
                  value={formData.feinTaxId}
                  onChange={(e) => setFormData({ ...formData, feinTaxId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <Phone size={12} className="text-slate-400" /> Dispatch & Main Phone
                </label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  placeholder="(800) 555-3533"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <MapPin size={12} className="text-slate-400" /> Corporate Headquarters Street Address
                </label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  placeholder="Street Address, Suite, City, State, ZIP"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <Mail size={12} className="text-slate-400" /> Safety & Compliance Email
                </label>
                <input
                  type="email"
                  required
                  disabled={!canEdit}
                  placeholder="safety@yourdomain.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Chief Safety Manager Name</label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  placeholder="e.g. Alice Johnson"
                  value={formData.safetyManagerName}
                  onChange={(e) => setFormData({ ...formData, safetyManagerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: IFTA & Tax Registrations */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-150">
              <ShieldCheck className="text-blue-600" size={15} /> State IFTA & Payroll Tax Registrations
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">IFTA Base Jurisdiction</label>
                <input
                  type="text"
                  maxLength={2}
                  required
                  disabled={!canEdit}
                  placeholder="IL"
                  value={formData.iftaAccountState}
                  onChange={(e) => setFormData({ ...formData, iftaAccountState: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold uppercase focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">IFTA License Account #</label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  placeholder="e.g. IL-IFTA-98102"
                  value={formData.iftaAccountNumber}
                  onChange={(e) => setFormData({ ...formData, iftaAccountNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">State W-2 Tax Withholding ID</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="e.g. IL-W2-381920"
                  value={formData.stateTaxWithholdingId || ''}
                  onChange={(e) => setFormData({ ...formData, stateTaxWithholdingId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Operating Bank Account */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-150">
              <CreditCard className="text-blue-600" size={15} /> Company Operating Bank Account (Payroll Disbursements)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Bank Name</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="e.g. Chase Bank NA"
                  value={formData.bankName || ''}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Routing Number (Masked)</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="*****0210"
                  value={formData.payrollRoutingNumber || ''}
                  onChange={(e) => setFormData({ ...formData, payrollRoutingNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Account Number (Masked)</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="*****9012"
                  value={formData.payrollAccountNumber || ''}
                  onChange={(e) => setFormData({ ...formData, payrollAccountNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Save Actions */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            {savedSuccess ? (
              <div className="text-emerald-600 font-bold text-xs flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 size={16} /> Company profile saved!
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResetDefault}
                disabled={!canEdit}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} /> Reset to Default FastGate Profile
              </button>
            )}

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              {canEdit && (
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Save size={14} /> Save Company Settings
                </button>
              )}
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
