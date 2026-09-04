import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Activity,
  Calendar,
  CheckCircle2,
  Info,
  Car,
  ChevronRight,
  Filter,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { IncidentReport, HistoricalViolation, MonthlySafetyRiskDataPoint } from '../types';
import { HISTORICAL_VIOLATIONS } from '../data';

interface SafetyRiskTrendChartProps {
  incidents: IncidentReport[];
  historicalViolations?: HistoricalViolation[];
  onSelectDriver?: (driverId: string) => void;
}

export default function SafetyRiskTrendChart({
  incidents,
  historicalViolations = HISTORICAL_VIOLATIONS,
  onSelectDriver
}: SafetyRiskTrendChartProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<{
    safetyRisk: boolean;
    criticalViolations: boolean;
    unresolvedIncidents: boolean;
  }>({
    safetyRisk: true,
    criticalViolations: true,
    unresolvedIncidents: true
  });

  // Define the last 6 months sequence up to current time (2026-09)
  const monthConfigs = useMemo(() => {
    return [
      { key: '2026-04', label: 'Apr 2026', short: 'Apr' },
      { key: '2026-05', label: 'May 2026', short: 'May' },
      { key: '2026-06', label: 'Jun 2026', short: 'Jun' },
      { key: '2026-07', label: 'Jul 2026', short: 'Jul' },
      { key: '2026-08', label: 'Aug 2026', short: 'Aug' },
      { key: '2026-09', label: 'Sep 2026', short: 'Sep (MTD)' }
    ];
  }, []);

  // Compute aggregated monthly safety risk metrics
  const monthlyData = useMemo<MonthlySafetyRiskDataPoint[]>(() => {
    return monthConfigs.map((cfg) => {
      // Filter violations matching this month
      const monthViolations = historicalViolations.filter(v => v.date.startsWith(cfg.key));
      const criticalViolationsList = monthViolations.filter(v => v.severity === 'Critical');
      const criticalViolationsCount = criticalViolationsList.length;

      // Filter roadside incidents reported in this month
      const monthIncidents = incidents.filter(i => i.reportedAt.startsWith(cfg.key));
      
      // Unresolved roadside incidents in this month
      // An incident is unresolved if it's currently open/in-progress, or was not resolved in that reporting period
      const unresolvedIncidentsList = monthIncidents.filter(i => i.status !== 'Resolved / Cleared');
      const unresolvedIncidentsCount = unresolvedIncidentsList.length;

      const resolvedIncidentsCount = monthIncidents.filter(i => i.status === 'Resolved / Cleared').length;

      // Safety Risk Formula: Total Critical Violations + Unresolved Roadside Incidents
      const safetyRisk = criticalViolationsCount + unresolvedIncidentsCount;

      return {
        monthKey: cfg.key,
        monthLabel: cfg.label,
        criticalViolations: criticalViolationsCount,
        unresolvedIncidents: unresolvedIncidentsCount,
        safetyRisk,
        resolvedIncidents: resolvedIncidentsCount,
        totalIncidents: monthIncidents.length,
        violationsList: monthViolations,
        incidentsList: monthIncidents
      };
    });
  }, [monthConfigs, historicalViolations, incidents]);

  // Aggregate stats across the 6-month period
  const stats = useMemo(() => {
    if (monthlyData.length === 0) return { current: 0, average: 0, delta: 0, peak: 0, peakMonth: '' };

    const current = monthlyData[monthlyData.length - 1].safetyRisk;
    const previous = monthlyData[monthlyData.length - 2]?.safetyRisk || current;
    const totalRisk = monthlyData.reduce((acc, m) => acc + m.safetyRisk, 0);
    const average = (totalRisk / monthlyData.length).toFixed(1);
    
    // Find peak risk month
    let peak = -1;
    let peakMonth = '';
    monthlyData.forEach(m => {
      if (m.safetyRisk > peak) {
        peak = m.safetyRisk;
        peakMonth = m.monthLabel;
      }
    });

    // 6-month delta percentage
    const firstMonthRisk = monthlyData[0].safetyRisk;
    const delta = current - firstMonthRisk;

    const totalCriticalViolations = monthlyData.reduce((acc, m) => acc + m.criticalViolations, 0);
    const totalUnresolved = monthlyData.reduce((acc, m) => acc + m.unresolvedIncidents, 0);

    return {
      current,
      previous,
      average,
      peak,
      peakMonth,
      delta,
      totalCriticalViolations,
      totalUnresolved
    };
  }, [monthlyData]);

  // Active selected month record for drilldown
  const activeDetail = useMemo(() => {
    const key = selectedMonth || monthlyData[monthlyData.length - 1]?.monthKey;
    return monthlyData.find(m => m.monthKey === key) || monthlyData[monthlyData.length - 1];
  }, [selectedMonth, monthlyData]);

  const toggleSeries = (key: 'safetyRisk' | 'criticalViolations' | 'unresolvedIncidents') => {
    setVisibleSeries(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header & Title Section */}
      <div className="p-5 sm:p-6 border-b border-slate-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <TrendingUp size={18} />
            </div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              6-Month Safety Risk Trend
            </h2>
            <span className="text-[10px] bg-indigo-100 text-indigo-900 font-black uppercase px-2 py-0.5 rounded tracking-wider border border-indigo-200">
              Violations + Roadside Incidents
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Historical trajectory of composite Safety Risk (<span className="font-semibold text-slate-700">Total Critical Violations + Unresolved Roadside Incidents</span>) spanning April – September 2026.
          </p>
        </div>

        {/* Dynamic Series Toggle Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => toggleSeries('safetyRisk')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              visibleSeries.safetyRisk
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white ring-2 ring-indigo-400"></span>
            Composite Safety Risk
          </button>

          <button
            onClick={() => toggleSeries('criticalViolations')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              visibleSeries.criticalViolations
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Critical Violations
          </button>

          <button
            onClick={() => toggleSeries('unresolvedIncidents')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              visibleSeries.unresolvedIncidents
                ? 'bg-rose-100 text-rose-900 border-rose-300 shadow-2xs'
                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            Unresolved Incidents
          </button>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 border-b border-slate-150 bg-slate-50/60">
        <div className="p-4 sm:px-6">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            Current Safety Risk
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
              {stats.current}
            </span>
            <span className="text-[11px] text-slate-500">Points</span>
            <span className={`text-[11px] font-bold flex items-center ${
              stats.current <= stats.previous ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {stats.current <= stats.previous ? (
                <><ArrowDownRight size={13} /> MoM Stable</>
              ) : (
                <><ArrowUpRight size={13} /> MoM Higher</>
              )}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {monthlyData[monthlyData.length - 1]?.criticalViolations} violations + {monthlyData[monthlyData.length - 1]?.unresolvedIncidents} unresolved
          </span>
        </div>

        <div className="p-4 sm:px-6">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            6-Month Fleet Average
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
              {stats.average}
            </span>
            <span className="text-[11px] text-slate-500">Avg / Month</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Baseline threshold: ≤ 3.0 safe
          </span>
        </div>

        <div className="p-4 sm:px-6">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            Peak Risk Month
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-rose-600">
              {stats.peak}
            </span>
            <span className="text-xs font-bold text-slate-700">{stats.peakMonth}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Highest hazard concentration
          </span>
        </div>

        <div className="p-4 sm:px-6">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            6-Mo Total Criticals
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
              {stats.totalCriticalViolations}
            </span>
            <span className="text-[11px] text-slate-500">Violations</span>
            <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
              {stats.totalUnresolved} Unresolved Inc.
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            Across active driver roster
          </span>
        </div>
      </div>

      {/* Recharts Trend Line Visual Display */}
      <div className="p-5 sm:p-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyData}
              margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const clickedKey = e.activePayload[0].payload?.monthKey;
                  if (clickedKey) setSelectedMonth(clickedKey);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'dataMax + 1']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as MonthlySafetyRiskDataPoint;
                    return (
                      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[220px]">
                        <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2">
                          <span className="font-extrabold text-slate-200">{data.monthLabel}</span>
                          <span className="bg-indigo-600 text-white font-mono font-black px-2 py-0.5 rounded text-[11px]">
                            Safety Risk: {data.safetyRisk}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1.5 text-amber-300">
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                              Critical Violations:
                            </span>
                            <span className="font-mono font-bold text-white">{data.criticalViolations}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1.5 text-rose-300">
                              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                              Unresolved Roadside Incidents:
                            </span>
                            <span className="font-mono font-bold text-white">{data.unresolvedIncidents}</span>
                          </div>

                          <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800">
                            <span>Resolved Roadside Incidents:</span>
                            <span className="font-mono">{data.resolvedIncidents}</span>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                          <span className="italic font-sans text-indigo-300">
                            Risk = {data.criticalViolations} + {data.unresolvedIncidents} = {data.safetyRisk}
                          </span>
                          <span className="text-slate-400">Click to inspect</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
              />

              {/* Target Warning Baseline Reference Line */}
              <ReferenceLine
                y={3}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                label={{ value: 'Elevated Risk (≥ 3)', fill: '#e11d48', fontSize: 10, position: 'insideTopRight' }}
              />

              {/* Series 1: Primary Composite Safety Risk */}
              {visibleSeries.safetyRisk && (
                <Line
                  name="Safety Risk (Composite)"
                  type="monotone"
                  dataKey="safetyRisk"
                  stroke="#4f46e5"
                  strokeWidth={3.5}
                  dot={{ r: 5, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 8, fill: '#4338ca', stroke: '#c7d2fe', strokeWidth: 3 }}
                />
              )}

              {/* Series 2: Critical Violations component */}
              {visibleSeries.criticalViolations && (
                <Line
                  name="Critical Violations"
                  type="monotone"
                  dataKey="criticalViolations"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ r: 4, fill: '#f59e0b' }}
                />
              )}

              {/* Series 3: Unresolved Roadside Incidents component */}
              {visibleSeries.unresolvedIncidents && (
                <Line
                  name="Unresolved Roadside Incidents"
                  type="monotone"
                  dataKey="unresolvedIncidents"
                  stroke="#e11d48"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 4, fill: '#e11d48' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Click-to-Select Month Quick Pills */}
        <div className="flex items-center justify-between flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Calendar size={13} className="text-slate-400" />
            <span className="font-semibold">Inspect Historical Month:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {monthlyData.map(m => {
              const isSelected = activeDetail.monthKey === m.monthKey;
              return (
                <button
                  key={m.monthKey}
                  onClick={() => setSelectedMonth(m.monthKey)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{m.monthLabel.split(' ')[0]}</span>
                  <span className={`ml-1.5 font-mono text-[10px] px-1 rounded ${
                    m.safetyRisk >= 3 
                      ? 'bg-rose-500 text-white' 
                      : 'bg-slate-200 text-slate-800'
                  }`}>
                    {m.safetyRisk}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drilldown Month Inspection Tray */}
      <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Layers size={14} className="text-indigo-600" />
              Monthly Risk Drilldown: {activeDetail.monthLabel}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Breakdown of individual citations and roadside incident occurrences driving the monthly Safety Risk metric.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold">
            <span className="text-slate-500">Calculated Safety Risk:</span>
            <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-black">
              {activeDetail.criticalViolations} (Violations) + {activeDetail.unresolvedIncidents} (Unresolved) = {activeDetail.safetyRisk} Points
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Violations in selected month */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-500" />
                Critical Violations Recorded ({activeDetail.criticalViolations})
              </span>
              <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">
                FMCSA Citations
              </span>
            </div>

            {activeDetail.violationsList.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                No safety citations recorded in this month. Clean driving record.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activeDetail.violationsList.map((v) => (
                  <div
                    key={v.id}
                    className={`p-2.5 rounded-lg border text-xs ${
                      v.severity === 'Critical' 
                        ? 'bg-rose-50/50 border-rose-200' 
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900">{v.driverName}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-2">({v.date})</span>
                      </div>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                        v.severity === 'Critical' 
                          ? 'bg-rose-600 text-white' 
                          : 'bg-yellow-400 text-slate-900'
                      }`}>
                        {v.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 font-medium mt-1">
                      {v.type}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-150">
                      <span>Category: <strong>{v.category}</strong></span>
                      {v.fmcsaCode && <span className="font-mono text-slate-600">FMCSA: {v.fmcsaCode}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Roadside Incidents in selected month */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-150">
              <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Car size={13} className="text-rose-500" />
                Roadside Incidents ({activeDetail.incidentsList.length})
              </span>
              <span className="text-[10px] bg-rose-50 text-rose-800 font-bold px-2 py-0.5 rounded border border-rose-200">
                {activeDetail.unresolvedIncidents} Active / Unresolved
              </span>
            </div>

            {activeDetail.incidentsList.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                No roadside incidents recorded during this month.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activeDetail.incidentsList.map((inc) => {
                  const isUnresolved = inc.status !== 'Resolved / Cleared';
                  return (
                    <div
                      key={inc.id}
                      className={`p-2.5 rounded-lg border text-xs ${
                        isUnresolved 
                          ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200' 
                          : 'bg-emerald-50/40 border-emerald-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-slate-900">{inc.driverName}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-2">({inc.truckId})</span>
                        </div>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                          isUnresolved 
                            ? 'bg-rose-600 text-white animate-pulse' 
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {isUnresolved ? 'UNRESOLVED (+1 RISK)' : 'RESOLVED / CLEARED'}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 mt-1 flex items-center gap-1">
                        <span>{inc.type}</span>
                        <span className="text-[10px] text-slate-500 font-normal">• {inc.severity} Severity</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {inc.location}
                      </p>
                      {inc.serviceVendor && (
                        <div className="mt-1 text-[10px] text-slate-600 font-mono bg-white/70 px-2 py-0.5 rounded border border-slate-150">
                          Vendor: {inc.serviceVendor} {inc.etaMinutes ? `• ETA ${inc.etaMinutes}m` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
