import React, { useState, useMemo } from 'react';
import { AuditLogEntry, UserSession } from '../types';
import { 
  History, 
  Search, 
  Trash2, 
  ShieldAlert, 
  SlidersHorizontal,
  Lock,
  User,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface AuditLogsProps {
  logs: AuditLogEntry[];
  currentUser: UserSession;
  onClear: () => void;
}

export default function AuditLogs({ logs, currentUser, onClear }: AuditLogsProps) {
  const [filterType, setFilterType] = useState<'all' | 'security' | 'data_edit' | 'approval'>('all');
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesType = filterType === 'all' || log.type === filterType;
      const matchesSearch = 
        log.action.toLowerCase().includes(search.toLowerCase()) || 
        log.userName.toLowerCase().includes(search.toLowerCase()) || 
        log.details.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [logs, filterType, search]);

  const getLogTypeStyle = (type: string) => {
    switch (type) {
      case 'security':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'data_edit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approval':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'Administrator':
        return 'text-rose-700 font-bold';
      case 'Fleet Manager':
        return 'text-amber-700 font-bold';
      case 'Driver':
        return 'text-blue-700 font-medium';
      default:
        return 'text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="text-slate-700" /> SEC-404 Security Compliance Audit Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            This read-only database collects every access level change, system login event, and compliance document update. It establishes an immutable security roadmap suitable for DOT safety audits.
          </p>
        </div>

        {currentUser.role === 'Safety Manager & CEO' && logs.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-bold text-xs uppercase transition-colors rounded-lg border border-rose-100"
          >
            <Trash2 size={13} /> Reset Logs
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          {['all', 'security', 'data_edit', 'approval'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                filterType === type 
                  ? 'bg-slate-900 text-white border-slate-900' 
                  : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              {type === 'data_edit' ? 'Edits' : type}
            </button>
          ))}
        </div>

        {/* Search input to test-drive */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input 
            type="text" 
            placeholder="Search security ledger..."
            className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-slate-800 outline-none w-full shadow-2xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Ledger Logs list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Identity (Role)</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Action Description</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Details Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No log events found matching the filter options.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-mono tracking-tight white-space-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${getLogTypeStyle(log.type)}`}>
                        {log.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-slate-800">{log.userName}</span>
                        <span className={`block text-[9px] ${getRoleStyle(log.role)}`}>
                          {log.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-[10px] max-w-xs truncate">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
