import React from 'react';
import { RenewalRequest, UserSession } from '../types';
import { 
  CheckCircle, 
  XCircle, 
  Inbox, 
  Clock, 
  ShieldAlert, 
  FileCheck, 
  PlusCircle, 
  UserCheck 
} from 'lucide-react';

interface ActionCenterProps {
  requests: RenewalRequest[];
  currentUser: UserSession;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
}

export default function ActionCenter({ 
  requests, 
  currentUser, 
  onApprove, 
  onDecline 
}: ActionCenterProps) {
  const pendingRequests = requests.filter(r => r.status === 'Pending');

  const showActions = currentUser.role === 'Safety Manager & CEO' || currentUser.role === 'Dispatcher';

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Inbox className="text-blue-600" /> Compliance Approvals Inbox
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xl">
          Review filed license uploads, physical cards, and equipment issue statements. Click 'Approve' to authorize integration into master safety rosters, which dynamically recalculates critical dates and compliance safety levels.
        </p>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <CheckCircle size={36} className="text-emerald-500 mx-auto mb-3 animate-bounce" />
          <p className="font-bold text-sm text-slate-800"> Roster Queue is Completely Checked</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
            No driver requests are currently awaiting security audits or DOT status updates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {pendingRequests.map((req) => (
            <div 
              key={req.id} 
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col justify-between"
            >
              {/* Card visual accent based on request type */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500"></div>

              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest text-xs flex items-center gap-1.5 mt-1">
                      {req.type === 'Vehicle Issue' ? 'Mechanical DVIR Log' : `${req.type} Renewal Request`}
                    </h4>
                    <p className="text-[10px] text-slate-400 uppercase font-mono tracking-widest mt-0.5">
                      {req.id} • Filed {req.submittedAt}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Clock size={10} /> PENDING REVIEW
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-5 text-slate-700 font-sans text-xs">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-3 mb-3 border-b border-dashed border-slate-200 pb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Filed By</span>
                      <span className="font-bold text-slate-800">{req.driverName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Driver ID</span>
                      <span className="font-mono text-slate-800 text-[11px]">{req.driverId}</span>
                    </div>
                  </div>

                  {req.type === 'Vehicle Issue' ? (
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Issue Description</span>
                      <p className="font-mono text-[11px] bg-white border border-slate-200 p-2 rounded-md font-bold text-slate-800">
                        "{req.requestedValue}"
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Proposed Expiration Extension</span>
                      <p className="font-mono text-[11px] font-bold text-slate-850 flex items-center gap-1.5 bg-white border border-slate-200 p-2 rounded-md">
                        <FileCheck size={14} className="text-emerald-500" />
                        {req.requestedValue}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                {showActions ? (
                  <>
                    <button
                      onClick={() => onApprove(req.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={14} /> Approve & Update
                    </button>
                    <button
                      onClick={() => onDecline(req.id)}
                      className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs uppercase tracking-wider py-2 rounded-lg transition-colors flex items-center justify-center gap-2 border border-rose-200"
                    >
                      <XCircle size={14} /> Decline
                    </button>
                  </>
                ) : (
                  <div className="w-full text-center text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg uppercase font-semibold">
                    🔒 Approvals restricted to Administative and Manager Roles
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
