import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  Cell 
} from 'recharts';
import { Vehicle, MaintenanceInvoice } from '../types';
import { 
  TrendingUp, 
  Wrench, 
  Gauge, 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  Sliders, 
  Truck,
  Layers,
  CheckCircle
} from 'lucide-react';

interface MaintenanceCostProjectionChartProps {
  vehicles: Vehicle[];
  fleetPaceMultiplier?: number;
  maintenanceInvoices?: MaintenanceInvoice[];
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

export default function MaintenanceCostProjectionChart({
  vehicles,
  fleetPaceMultiplier = 1.0,
  maintenanceInvoices = [],
  onSelectVehicle
}: MaintenanceCostProjectionChartProps) {
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [costPerMileRate, setCostPerMileRate] = useState<number>(0.15); // Industry average $0.15/mile
  const [activeSegment, setActiveSegment] = useState<'stacked' | 'total'>('stacked');

  // Filtered vehicles according to selection
  const targetVehicles = useMemo(() => {
    if (selectedUnit === 'ALL') return vehicles;
    return vehicles.filter(v => v.unitNumber === selectedUnit || v.id === selectedUnit);
  }, [vehicles, selectedUnit]);

  // Generate 6-month forecast starting from next month
  const projectionData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    // Track cumulative projected miles and intervals per vehicle
    const vehicleSim = targetVehicles.map(v => ({
      unitNumber: v.unitNumber,
      currentMileage: v.mileage ?? 50000,
      lastInspectionMileage: v.lastInspectionMileage ?? 45000,
      interval: v.inspectionIntervalMiles ?? 10000,
      avgMonthlyMiles: Math.round((v.averageMonthlyMiles ?? 4000) * fleetPaceMultiplier),
      inspectionExpiryDate: v.inspectionExpiry ? new Date(v.inspectionExpiry) : null
    }));

    for (let i = 1; i <= 6; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthLabel = forecastDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const monthFull = forecastDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      let monthlyMileageCost = 0;
      let scheduledPmCost = 0;
      let annualInspectionCost = 0;
      let totalMonthlyMiles = 0;
      const triggeringUnits: string[] = [];

      vehicleSim.forEach(v => {
        const milesThisMonth = v.avgMonthlyMiles;
        totalMonthlyMiles += milesThisMonth;

        // Base mileage wear cost (tires, fluids, brake friction wear)
        monthlyMileageCost += milesThisMonth * (costPerMileRate * 0.65);

        // Advance simulated odometer
        v.currentMileage += milesThisMonth;
        const milesSinceLastService = v.currentMileage - v.lastInspectionMileage;

        // Check if vehicle crosses PM threshold in this month (e.g. 10k PM cycle)
        if (milesSinceLastService >= v.interval) {
          scheduledPmCost += 520; // Average commercial B-service PM + filters & oil
          v.lastInspectionMileage = v.currentMileage; // reset service baseline
          triggeringUnits.push(`${v.unitNumber} (PM Due)`);
        }

        // Check if DOT Annual Inspection is due in this calendar month
        if (v.inspectionExpiryDate && 
            v.inspectionExpiryDate.getMonth() === forecastDate.getMonth() && 
            v.inspectionExpiryDate.getFullYear() === forecastDate.getFullYear()) {
          annualInspectionCost += 380; // DOT 396.17 inspection & certification
          triggeringUnits.push(`${v.unitNumber} (DOT Annual)`);
        }
      });

      // Baseline contingency / wear factor (~$0.025/mile)
      const contingencyCost = totalMonthlyMiles * (costPerMileRate * 0.35);

      const routinePmAndFluids = Math.round(monthlyMileageCost + scheduledPmCost);
      const wearTiresBrakes = Math.round(contingencyCost);
      const inspectionsAndRepairs = Math.round(annualInspectionCost + (totalMonthlyMiles > 0 ? (totalMonthlyMiles * 0.015) : 0));
      const totalProjected = routinePmAndFluids + wearTiresBrakes + inspectionsAndRepairs;

      months.push({
        month: monthLabel,
        monthFull,
        totalMiles: totalMonthlyMiles,
        routinePm: routinePmAndFluids,
        wearAndTires: wearTiresBrakes,
        inspections: inspectionsAndRepairs,
        totalCost: totalProjected,
        triggeringUnits
      });
    }

    return months;
  }, [targetVehicles, fleetPaceMultiplier, costPerMileRate]);

  // Aggregate metrics
  const total6MonthCost = useMemo(() => {
    return projectionData.reduce((sum, m) => sum + m.totalCost, 0);
  }, [projectionData]);

  const avgMonthlyCost = useMemo(() => {
    return Math.round(total6MonthCost / 6);
  }, [total6MonthCost]);

  const total6MonthMiles = useMemo(() => {
    return projectionData.reduce((sum, m) => sum + m.totalMiles, 0);
  }, [projectionData]);

  const avgMonthlyMiles = useMemo(() => {
    return Math.round(total6MonthMiles / 6);
  }, [total6MonthMiles]);

  const peakMonth = useMemo(() => {
    return projectionData.reduce((max, m) => m.totalCost > max.totalCost ? m : max, projectionData[0] || { month: 'N/A', totalCost: 0, triggeringUnits: [] });
  }, [projectionData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Header: Title & Interactive Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-150">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              <TrendingUp size={15} />
            </span>
            <span className="text-[10px] font-mono uppercase font-black tracking-widest text-blue-600">
              Predictive Mileage Analytics
            </span>
            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              6-Month Rolling Horizon
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 mt-1 flex items-center gap-2">
            Projected Maintenance Costs & PM Milestones
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamic cost simulation driven by average monthly mileage ({avgMonthlyMiles.toLocaleString()} mi/mo) and PM wear thresholds.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Unit Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <Truck size={13} className="text-slate-450 shrink-0" />
            <span className="text-slate-400 font-bold text-[10px] uppercase">Unit:</span>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer"
            >
              <option value="ALL">Entire Fleet ({vehicles.length} Units)</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.unitNumber}>
                  {v.unitNumber} ({v.averageMonthlyMiles?.toLocaleString() ?? 4000} mi/mo)
                </option>
              ))}
            </select>
          </div>

          {/* Cost Per Mile Benchmark Presets */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 text-[10px] font-bold">
            <span className="text-slate-400 px-1.5 uppercase tracking-wider text-[9px] flex items-center gap-1">
              <Sliders size={11} /> CPM:
            </span>
            {[
              { label: 'Low ($0.12)', rate: 0.12 },
              { label: 'Avg ($0.15)', rate: 0.15 },
              { label: 'High ($0.18)', rate: 0.18 }
            ].map(preset => (
              <button
                key={preset.rate}
                type="button"
                onClick={() => setCostPerMileRate(preset.rate)}
                className={`px-2 py-0.5 rounded transition-all ${
                  costPerMileRate === preset.rate 
                    ? 'bg-slate-900 text-white shadow-xs font-black' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* View Mode Toggle: Stacked vs Total */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setActiveSegment('stacked')}
              className={`px-2 py-0.5 rounded transition-colors ${activeSegment === 'stacked' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'}`}
              title="View breakdown by category"
            >
              Categorized
            </button>
            <button
              type="button"
              onClick={() => setActiveSegment('total')}
              className={`px-2 py-0.5 rounded transition-colors ${activeSegment === 'total' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500'}`}
              title="View single total bar"
            >
              Net Total
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            6-Month Total Forecast
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-slate-900 font-mono">
              ${total6MonthCost.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Across {total6MonthMiles.toLocaleString()} projected miles
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Monthly Run Rate
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-blue-600 font-mono">
              ${avgMonthlyCost.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">/ mo</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            ~{avgMonthlyMiles.toLocaleString()} mi/month baseline
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Unit Utilization
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-slate-800 font-mono">
              {targetVehicles.length} Unit{targetVehicles.length > 1 ? 's' : ''}
            </span>
            {fleetPaceMultiplier !== 1.0 && (
              <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                {fleetPaceMultiplier}x Pace
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Est. ${(costPerMileRate).toFixed(3)}/mi wear index
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Projected Peak Month
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-black text-rose-600 font-mono">
              {peakMonth.month}
            </span>
            <span className="text-xs font-bold text-slate-700 font-mono">
              ${peakMonth.totalCost.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 truncate block mt-0.5" title={peakMonth.triggeringUnits.join(', ') || 'Normal operational wear'}>
            {peakMonth.triggeringUnits.length > 0 ? `${peakMonth.triggeringUnits.length} scheduled event(s)` : 'Normal operational wear'}
          </span>
        </div>
      </div>

      {/* Small Bar Chart Container */}
      <div className="bg-slate-900 rounded-xl p-4 text-white space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span className="text-slate-300 font-bold uppercase tracking-wider text-[10px] font-mono">
              6-Month Estimated Expenditure ($ USD)
            </span>
          </div>
          {activeSegment === 'stacked' && (
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block"></span>
                Routine PM & Oil
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-400 inline-block"></span>
                Tires & Brakes Wear
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block"></span>
                DOT & Contingency
              </span>
            </div>
          )}
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={projectionData}
              margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
              <XAxis 
                dataKey="month" 
                stroke="#94a3b8" 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={false}
              />
              <YAxis 
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1.5 font-sans min-w-[200px] z-50">
                        <div className="flex justify-between items-center pb-1 border-b border-slate-800">
                          <strong className="text-blue-300 font-bold">{data.monthFull}</strong>
                          <span className="text-[10px] font-mono text-slate-400">{data.totalMiles.toLocaleString()} mi</span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between text-slate-300">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Routine PM & Oil:
                            </span>
                            <span className="font-mono font-bold">${data.routinePm.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Tires & Brakes:
                            </span>
                            <span className="font-mono font-bold">${data.wearAndTires.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Inspections / Contingency:
                            </span>
                            <span className="font-mono font-bold">${data.inspections.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-800 pt-1 font-bold text-white">
                            <span>Total Projected:</span>
                            <span className="font-mono text-emerald-400 text-xs">${data.totalCost.toLocaleString()}</span>
                          </div>
                        </div>

                        {data.triggeringUnits && data.triggeringUnits.length > 0 && (
                          <div className="pt-1 border-t border-slate-800 text-[10px] text-amber-300/90 font-mono">
                            ⚠️ Expected: {data.triggeringUnits.join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {activeSegment === 'stacked' ? (
                <>
                  <Bar dataKey="routinePm" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Routine PM" />
                  <Bar dataKey="wearAndTires" stackId="a" fill="#818cf8" radius={[0, 0, 0, 0]} name="Tires & Wear" />
                  <Bar dataKey="inspections" stackId="a" fill="#fbbf24" radius={[3, 3, 0, 0]} name="Inspections & Reserve" />
                </>
              ) : (
                <Bar dataKey="totalCost" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Projected Cost">
                  {projectionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.month === peakMonth.month ? '#f43f5e' : '#3b82f6'} 
                    />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Advisory Insight Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
        <CheckCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-blue-950">Fleet Maintenance Budgeting Guidance</span>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Reserve approximately <strong>${avgMonthlyCost.toLocaleString()}</strong> per month into the operating escrow maintenance account. Peak expenditure is anticipated in <strong>{peakMonth.monthFull}</strong> ({peakMonth.triggeringUnits.slice(0, 2).join(', ') || 'scheduled periodic checkups'}).
          </p>
        </div>
      </div>
    </div>
  );
}
