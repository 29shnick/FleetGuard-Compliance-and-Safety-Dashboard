import React, { useState } from 'react';
import { Driver, TaxClassification, UserRole, Vehicle } from '../types';
import { 
  X, 
  User, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  ShieldCheck, 
  FileText, 
  Award, 
  AlertTriangle,
  Save,
  CheckCircle2,
  DollarSign,
  Truck,
  Calendar
} from 'lucide-react';

interface DriverProfileModalProps {
  driver: Driver;
  vehicles: Vehicle[];
  currentUserRole: UserRole;
  onClose: () => void;
  onSave: (updatedDriver: Driver) => void;
}

export default function DriverProfileModal({
  driver,
  vehicles,
  currentUserRole,
  onClose,
  onSave
}: DriverProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'tax' | 'cdl' | 'banking'>('general');
  const [editedDriver, setEditedDriver] = useState<Driver>({ ...driver });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const profile = editedDriver.profileInfo || {};

  const handleProfileInfoChange = (field: string, value: any) => {
    setEditedDriver(prev => ({
      ...prev,
      profileInfo: {
        ...prev.profileInfo,
        [field]: value
      }
    }));
  };

  const handleTaxChange = (taxClass: TaxClassification) => {
    setEditedDriver(prev => ({
      ...prev,
      taxClassification: taxClass
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedDriver);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const canEditSensitive = currentUserRole === 'Safety Manager & CEO' || (currentUserRole as string) === 'Administrator';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-6 relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md border border-indigo-400/30">
              {editedDriver.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">{editedDriver.name}</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                  editedDriver.taxClassification === 'W2' 
                    ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40' 
                    : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                }`}>
                  {editedDriver.taxClassification || '1099-NEC'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Driver Profile ID: {editedDriver.id} • Truck: <strong className="text-indigo-300">{editedDriver.truckId}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors self-start md:self-auto"
            title="Close Profile Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Tax Classification Toggle Bar */}
        <div className="bg-slate-100 p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">Tax & Payment Classification</span>
            <span className="text-xs font-semibold text-slate-800">
              Define whether this driver is an employee (W-2) or an independent contractor (1099-NEC).
            </span>
          </div>

          <div className="inline-flex p-1 bg-slate-200 rounded-xl border border-slate-300">
            <button
              type="button"
              onClick={() => handleTaxChange('W2')}
              disabled={!canEditSensitive}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                editedDriver.taxClassification === 'W2'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              } ${!canEditSensitive ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              W-2 Employee
            </button>
            <button
              type="button"
              onClick={() => handleTaxChange('1099-NEC')}
              disabled={!canEditSensitive}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                editedDriver.taxClassification === '1099-NEC' || !editedDriver.taxClassification
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              } ${!canEditSensitive ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              1099-NEC Contractor
            </button>
          </div>
        </div>

        {/* Section Sub-Navigation */}
        <div className="flex border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User size={14} /> Personal & Contact
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tax')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 ${
              activeTab === 'tax'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign size={14} /> Tax & Compensation
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cdl')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 ${
              activeTab === 'cdl'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck size={14} /> CDL & DOT Safety
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banking')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-1.5 ${
              activeTab === 'banking'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard size={14} /> Direct Deposit
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
          
          {/* TAB 1: GENERAL & CONTACT */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  disabled={!canEditSensitive}
                  value={editedDriver.name}
                  onChange={(e) => setEditedDriver({ ...editedDriver, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Assigned Fleet Truck Unit</label>
                <select
                  value={editedDriver.truckId}
                  onChange={(e) => setEditedDriver({ ...editedDriver, truckId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="None">None (Unassigned)</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.unitNumber}>{v.unitNumber} ({v.vin.substring(0, 8)}...)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                  <Phone size={12} className="text-slate-400" /> Phone Number
                </label>
                <input
                  type="text"
                  placeholder="(312) 555-0192"
                  value={profile.phone || ''}
                  onChange={(e) => handleProfileInfoChange('phone', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                  <Mail size={12} className="text-slate-400" /> Corporate Email
                </label>
                <input
                  type="email"
                  placeholder="driver@fastgatelogistics.com"
                  value={profile.email || ''}
                  onChange={(e) => handleProfileInfoChange('email', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                  <MapPin size={12} className="text-slate-400" /> Residential Address
                </label>
                <input
                  type="text"
                  placeholder="Street Address, City, State, ZIP"
                  value={profile.address || ''}
                  onChange={(e) => handleProfileInfoChange('address', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Emergency Contact Person</label>
                <input
                  type="text"
                  placeholder="Contact Name (e.g. Spouse, Relative)"
                  value={profile.emergencyContactName || ''}
                  onChange={(e) => handleProfileInfoChange('emergencyContactName', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Emergency Contact Phone</label>
                <input
                  type="text"
                  placeholder="(312) 555-9900"
                  value={profile.emergencyContactPhone || ''}
                  onChange={(e) => handleProfileInfoChange('emergencyContactPhone', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-slate-400" /> Contract / Hire Date
                </label>
                <input
                  type="date"
                  value={profile.hireDate || '2023-01-15'}
                  onChange={(e) => handleProfileInfoChange('hireDate', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Driver Roster Status</label>
                <select
                  value={profile.operatingStatus || 'Active'}
                  onChange={(e) => handleProfileInfoChange('operatingStatus', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white outline-none"
                >
                  <option value="Active">Active Duty</option>
                  <option value="On Leave">On Leave / Medical Hold</option>
                  <option value="Inactive">Inactive / Terminated</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 2: TAX & COMPENSATION */}
          {activeTab === 'tax' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="text-indigo-600" size={15} /> IRS Tax Classification Setup
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => canEditSensitive && handleTaxChange('W2')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      editedDriver.taxClassification === 'W2'
                        ? 'border-indigo-600 bg-indigo-50/60'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="font-black text-indigo-950 uppercase block text-xs">W-2 Staff Employee</span>
                    <p className="text-[10px] text-slate-600 mt-1 leading-normal">
                      Subject to statutory payroll tax withholding (Federal, State, Social Security, Medicare). Issued Annual IRS Form W-2.
                    </p>
                  </div>

                  <div
                    onClick={() => canEditSensitive && handleTaxChange('1099-NEC')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      editedDriver.taxClassification === '1099-NEC' || !editedDriver.taxClassification
                        ? 'border-amber-600 bg-amber-50/60'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="font-black text-amber-950 uppercase block text-xs">1099-NEC Contractor</span>
                    <p className="text-[10px] text-slate-600 mt-1 leading-normal">
                      Independent owner-operator or contractor. Gross settlements paid without tax withholding. Issued Annual IRS Form 1099-NEC.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">SSN or EIN Tax ID (Masked)</label>
                  <input
                    type="text"
                    disabled={!canEditSensitive}
                    placeholder="331-XX-9812 or 36-9812019"
                    value={profile.ssnEin || ''}
                    onChange={(e) => handleProfileInfoChange('ssnEin', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Base Mileage Pay Rate ($ / mile)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.30"
                    max="2.50"
                    value={profile.payRatePerMile || 0.70}
                    onChange={(e) => handleProfileInfoChange('payRatePerMile', parseFloat(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono font-bold focus:bg-white outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CDL & DOT SAFETY */}
          {activeTab === 'cdl' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Commercial Driver License (CDL) Number</label>
                  <input
                    type="text"
                    disabled={!canEditSensitive}
                    placeholder="IL-CDL-8492019"
                    value={profile.cdlNumber || ''}
                    onChange={(e) => handleProfileInfoChange('cdlNumber', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">CDL Issuing State</label>
                  <input
                    type="text"
                    maxLength={2}
                    disabled={!canEditSensitive}
                    placeholder="IL"
                    value={profile.cdlState || 'IL'}
                    onChange={(e) => handleProfileInfoChange('cdlState', e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono font-bold uppercase focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">CDL Expiration Date</label>
                  <input
                    type="date"
                    disabled={!canEditSensitive}
                    value={editedDriver.cdlExpiry}
                    onChange={(e) => setEditedDriver({ ...editedDriver, cdlExpiry: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">FMCSA Medical Exam Expiration</label>
                  <input
                    type="date"
                    disabled={!canEditSensitive}
                    value={editedDriver.medCertExpiry}
                    onChange={(e) => setEditedDriver({ ...editedDriver, medCertExpiry: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Safety Deficiencies Count</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    disabled={!canEditSensitive}
                    value={editedDriver.criticalViolations}
                    onChange={(e) => setEditedDriver({ ...editedDriver, criticalViolations: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono font-bold focus:bg-white outline-none"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      disabled={!canEditSensitive}
                      checked={editedDriver.isHighRisk}
                      onChange={(e) => setEditedDriver({ ...editedDriver, isHighRisk: e.target.checked })}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-rose-700">Flag for Mandatory DOT Risk Audit</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BANKING & DIRECT DEPOSIT */}
          {activeTab === 'banking' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="Chase Bank NA"
                  value={profile.bankName || ''}
                  onChange={(e) => handleProfileInfoChange('bankName', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">ABA Routing Number (Masked)</label>
                <input
                  type="text"
                  placeholder="*****0210"
                  value={profile.routingNumber || ''}
                  onChange={(e) => handleProfileInfoChange('routingNumber', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Account Number (Masked)</label>
                <input
                  type="text"
                  placeholder="*****8492"
                  value={profile.accountNumber || ''}
                  onChange={(e) => handleProfileInfoChange('accountNumber', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white outline-none"
                />
              </div>
            </div>
          )}

          {/* Footer Save Actions */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
            {savedSuccess ? (
              <div className="text-emerald-600 font-bold text-xs flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 size={16} /> Driver Profile and Tax Classification updated!
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">
                Changes will take effect immediately across dispatch and payroll systems.
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Save size={14} /> Save Profile Changes
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
