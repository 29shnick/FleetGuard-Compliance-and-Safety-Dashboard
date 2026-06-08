import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Unlock, 
  User, 
  ChevronDown, 
  Info, 
  UserCheck, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { UserSession, UserRole } from '../types';

export const SIMULATED_USERS: UserSession[] = [
  { id: 'admin-alice', name: 'Alice Vance', role: 'Safety Manager & CEO' },
  { id: 'dispatcher-bob', name: 'Bob Carter', role: 'Dispatcher' },
  { id: 'D1', name: 'Nikola Shikaleski', role: 'Driver', driverId: 'D1' },
  { id: 'D2', name: 'James Wilson', role: 'Driver', driverId: 'D2' },
  { id: 'D4', name: 'Robert Brown', role: 'Driver', driverId: 'D4' },
];

interface RbacPanelProps {
  currentUser: UserSession;
  onUserChange: (user: UserSession) => void;
  pendingInboxCount: number;
}

export default function RbacPanel({ currentUser, onUserChange, pendingInboxCount }: RbacPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Safety Manager & CEO':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Dispatcher':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Driver':
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const currentMockTime = '2026-05-24 14:14';

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shrink-0 shadow-xs">
      {/* Security Context Status Indicator */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-200 flex items-center justify-center">
            {currentUser.role === 'Safety Manager & CEO' ? (
              <Shield className="w-5 h-5 text-rose-500 animate-pulse" />
            ) : currentUser.role === 'Dispatcher' ? (
              <Shield className="w-5 h-5 text-amber-500" />
            ) : (
              <User className="w-5 h-5 text-blue-500" />
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center" title="RBAC Active">
            <span className="w-1 h-1 bg-white rounded-full"></span>
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Role-Based Access Control State
            </h2>
            <button 
              onClick={() => setShowGuide(!showGuide)} 
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="Toggle Security Rules Matrix"
            >
              <Info size={14} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="font-semibold text-slate-700">User:</span> {currentUser.name}
            </span>
            <span className="h-3 w-px bg-slate-200 hidden sm:inline"></span>
            <span className="flex items-center gap-1">
              <span className="font-semibold text-slate-700">Security Gate:</span> 
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadgeColor(currentUser.role)}`}>
                {currentUser.role}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Selector dropdown and rules guidelines */}
      <div className="flex flex-wrap items-center gap-3 relative">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
          <Clock size={12} />
          <span>{currentMockTime} UTC</span>
        </div>

        {/* Dynamic Simulation Switcher */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <UserCheck size={14} />
            <span>Simulate Log In</span>
            <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Simulated User Session</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {SIMULATED_USERS.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      onUserChange(user);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 flex flex-col transition-colors border-l-4 ${
                      currentUser.id === user.id ? 'bg-slate-50/75 border-slate-900' : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-slate-800">{user.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {user.role === 'Safety Manager & CEO' ? 'Full Compliance View, Auditing, Multi-state Payroll Expiries' :
                       user.role === 'Dispatcher' ? 'Load Management, Trip Dispatching & Miles Cost Calculation' :
                       `Driver desk for truck status and cert renewal uploads`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Instant Indicator badge for approval inbox item count */}
        {pendingInboxCount > 0 && (currentUser.role === 'Safety Manager & CEO' || currentUser.role === 'Dispatcher') && (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-duration-1000"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" title="Pending authorizations awaiting review"></span>
          </span>
        )}
      </div>

      {/* Rules matrix drawer */}
      {showGuide && (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 text-slate-300 shadow-2xl z-50 p-6 flex flex-col border-l border-slate-800 overflow-y-auto font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Shield className="text-blue-500 w-5 h-5" />
              <h3 className="text-sm font-bold text-white">RBAC Security Policy</h3>
            </div>
            <button 
              onClick={() => setShowGuide(false)}
              className="px-2 py-1 text-xs hover:bg-slate-800 rounded text-slate-400"
            >
              Close
            </button>
          </div>

          <div className="space-y-6 text-xs text-slate-300">
            <div>
              <p className="font-bold text-slate-100 uppercase text-[10px] tracking-wider mb-2">1. Safety Manager & CEO Profile</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400">
                <li><span className="text-emerald-400 font-semibold">View</span>: Global diagnostics, driver logs, fleet statuses, and FMCSA audit checklists. Also commands and releases weekly payroll stubs.</li>
                <li><span className="text-emerald-400 font-semibold">Audit Actions</span>: Flag high-risk drivers, audit CDL & medical certificate expiration warnings.</li>
                <li><span className="text-emerald-400 font-semibold">Decisions</span>: Approve/Decline proposed driver credentials updates instantly. Approve and authorize weekly paychecks.</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <p className="font-bold text-slate-100 uppercase text-[10px] tracking-wider mb-2">2. Dispatcher Profile</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400">
                <li><span className="text-emerald-400 font-semibold">View</span>: Active dispatcher loads list, driver availability statuses.</li>
                <li><span className="text-emerald-400 font-semibold">Actions</span>: Enter shipping loads, select custom hubs, and run auto-calculation.</li>
                <li><span className="text-amber-400 font-semibold">Miles calculation</span>: Automatic route miles and gross payout calculation.</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <p className="font-bold text-slate-100 uppercase text-[10px] tracking-wider mb-2">3. Driver Profile</p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400">
                <li><span className="text-emerald-400 font-semibold">View</span>: Restricted strictly to their own individual record, compliance notifications, and active loads.</li>
                <li><span className="text-rose-400 font-semibold">Privacy Gates</span>: Other driver logs, vehicle indices, and sensitive dispatcher data are hidden.</li>
                <li><span className="text-emerald-400 font-semibold">Actions</span>: Submit documents renewal, see trip distance alerts.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
