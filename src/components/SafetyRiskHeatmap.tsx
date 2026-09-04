import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  User, 
  Search, 
  SlidersHorizontal, 
  Grid, 
  Layers, 
  ExternalLink, 
  ChevronRight, 
  Info, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  TrendingDown,
  Clock,
  Car
} from 'lucide-react';
import { Driver, IncidentReport, ComplianceStatus } from '../types';

interface SafetyRiskHeatmapProps {
  drivers: Driver[];
  incidents?: IncidentReport[];
  onSelectDriver?: (driver: Driver) => void;
  onNavigateToDrivers?: () => void;
  currentUserId?: string;
}

export interface DriverSafetyMetrics {
  driver: Driver;
  score: number; // 0 - 100
  riskLevel: 'CRITICAL' | 'ELEVATED' | 'MODERATE' | 'LOW';
  violationsScore: number;
  complianceScore: number;
  incidentScore: number;
  activeIncidentsCount: number;
  earliestDaysRemaining: number;
  earliestDocType: 'CDL' | 'Medical Exam';
  actionRecommendation: string;
}

// Calculate days remaining relative to mock system baseline (2026-05-24)
const calculateDaysDifference = (dateStr: string): number => {
  if (!dateStr) return 0;
  const expiry = new Date(dateStr);
  const baseline = new Date('2026-05-24');
  expiry.setHours(0, 0, 0, 0);
  baseline.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - baseline.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export default function SafetyRiskHeatmap({
  drivers,
  incidents = [],
  onSelectDriver,
  onNavigateToDrivers,
  currentUserId
}: SafetyRiskHeatmapProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'matrix'>('grid');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'CRITICAL' | 'ELEVATED' | 'MODERATE' | 'LOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'risk_desc' | 'violations_desc' | 'expiry_asc' | 'name_asc'>('risk_desc');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Compute safety metrics & normalized scores for each driver
  const driverMetrics = useMemo<DriverSafetyMetrics[]>(() => {
    return drivers.map((driver) => {
      const cdlDays = calculateDaysDifference(driver.cdlExpiry);
      const medDays = calculateDaysDifference(driver.medCertExpiry);
      const minDays = Math.min(cdlDays, medDays);
      const earliestDocType: 'CDL' | 'Medical Exam' = cdlDays <= medDays ? 'CDL' : 'Medical Exam';

      // 1. Violations Component (max 45 points)
      // 0 = 0pts, 1 = 18pts, 2 = 30pts, 3 = 40pts, 4+ = 45pts
      let vScore = 0;
      if (driver.criticalViolations === 1) vScore = 18;
      else if (driver.criticalViolations === 2) vScore = 30;
      else if (driver.criticalViolations === 3) vScore = 40;
      else if (driver.criticalViolations >= 4) vScore = 45;

      // 2. Compliance Component (max 40 points)
      let cScore = 0;
      if (driver.overallStatus === 'NON-COMPLIANT') {
        cScore = 40; // Expired credential
      } else if (driver.overallStatus === 'Warning' || minDays <= 30) {
        cScore = 20; // Expiring soon
      } else {
        cScore = 0; // Fully compliant
      }

      // 3. Active Incident Component (max 20 points)
      const openIncidents = incidents.filter(
        i => i.driverId === driver.id && i.status !== 'Resolved / Cleared'
      );
      let iScore = openIncidents.length > 0 ? Math.min(20, openIncidents.length * 15) : 0;

      // High risk legacy flag adjustment
      if (driver.isHighRisk && vScore < 30) {
        vScore = Math.max(vScore, 25);
      }

      const totalScore = Math.min(100, vScore + cScore + iScore);

      // Determine Risk Tier
      let riskLevel: 'CRITICAL' | 'ELEVATED' | 'MODERATE' | 'LOW';
      let actionRecommendation = '';

      if (totalScore >= 65 || driver.overallStatus === 'NON-COMPLIANT' || driver.criticalViolations >= 3) {
        riskLevel = 'CRITICAL';
        actionRecommendation = 'Immediate Dispatch Hold: Requires mandatory DOT remediation and credential recertification.';
      } else if (totalScore >= 40 || driver.criticalViolations >= 2 || minDays <= 15) {
        riskLevel = 'ELEVATED';
        actionRecommendation = 'Close Supervisory Monitoring: Prioritize renewal file processing and conduct safety audit.';
      } else if (totalScore >= 20 || minDays <= 30 || driver.criticalViolations === 1) {
        riskLevel = 'MODERATE';
        actionRecommendation = 'Pre-Expiration Watch: Track upcoming certification deadline within 30 days.';
      } else {
        riskLevel = 'LOW';
        actionRecommendation = 'Nominal Standing: Unrestricted dispatch clearance with pristine safety rating.';
      }

      return {
        driver,
        score: totalScore,
        riskLevel,
        violationsScore: vScore,
        complianceScore: cScore,
        incidentScore: iScore,
        activeIncidentsCount: openIncidents.length,
        earliestDaysRemaining: minDays,
        earliestDocType,
        actionRecommendation
      };
    });
  }, [drivers, incidents]);

  // Aggregate counts for summary
  const summaryCounts = useMemo(() => {
    const counts = { CRITICAL: 0, ELEVATED: 0, MODERATE: 0, LOW: 0 };
    driverMetrics.forEach(m => {
      counts[m.riskLevel]++;
    });
    return counts;
  }, [driverMetrics]);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    return driverMetrics
      .filter(m => {
        if (riskFilter !== 'ALL' && m.riskLevel !== riskFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = m.driver.name.toLowerCase().includes(q);
          const matchTruck = m.driver.truckId.toLowerCase().includes(q);
          const matchId = m.driver.id.toLowerCase().includes(q);
          return matchName || matchTruck || matchId;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'risk_desc') return b.score - a.score;
        if (sortBy === 'violations_desc') return b.driver.criticalViolations - a.driver.criticalViolations;
        if (sortBy === 'expiry_asc') return a.earliestDaysRemaining - b.earliestDaysRemaining;
        if (sortBy === 'name_asc') return a.driver.name.localeCompare(b.driver.name);
        return 0;
      });
  }, [driverMetrics, riskFilter, searchQuery, sortBy]);

  // High-risk personnel for rapid identification
  const criticalDrivers = useMemo(() => {
    return driverMetrics.filter(m => m.riskLevel === 'CRITICAL');
  }, [driverMetrics]);

  // Selected driver detail metric
  const activeSelectedMetric = useMemo(() => {
    if (!selectedDriverId) return null;
    return driverMetrics.find(m => m.driver.id === selectedDriverId) || null;
  }, [selectedDriverId, driverMetrics]);

  // Visual helper styles for risk tiers
  const getRiskStyles = (level: 'CRITICAL' | 'ELEVATED' | 'MODERATE' | 'LOW') => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-600',
          text: 'text-white',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
          border: 'border-rose-300 ring-1 ring-rose-400',
          cardBg: 'bg-rose-50/70',
          heatGradient: 'from-rose-500 to-red-600',
          dotColor: 'bg-rose-500',
          label: 'Critical Risk'
        };
      case 'ELEVATED':
        return {
          bg: 'bg-amber-500',
          text: 'text-slate-950',
          badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
          border: 'border-amber-300 ring-1 ring-amber-400',
          cardBg: 'bg-amber-50/60',
          heatGradient: 'from-amber-400 to-amber-500',
          dotColor: 'bg-amber-500',
          label: 'Elevated Risk'
        };
      case 'MODERATE':
        return {
          bg: 'bg-yellow-400',
          text: 'text-slate-900',
          badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
          border: 'border-yellow-200',
          cardBg: 'bg-yellow-50/50',
          heatGradient: 'from-yellow-300 to-yellow-400',
          dotColor: 'bg-yellow-400',
          label: 'Moderate Risk'
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-emerald-600',
          text: 'text-white',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          border: 'border-emerald-200',
          cardBg: 'bg-emerald-50/30',
          heatGradient: 'from-emerald-500 to-teal-600',
          dotColor: 'bg-emerald-500',
          label: 'Low Risk'
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Header Card Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <Flame size={18} />
            </div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              Driver Safety Risk Heatmap
            </h2>
            <span className="text-[10px] bg-slate-900 text-white font-black uppercase px-2 py-0.5 rounded tracking-wider">
              FMCSA / DOT Compliant Matrix
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-factor risk assessment synthesizing safety violations, credential expirations, and active roadside incidents.
          </p>
        </div>

        {/* View Mode & Jump button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid size={13} />
              Heat Tiles
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'matrix' 
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={13} />
              2D Risk Matrix
            </button>
          </div>

          {onNavigateToDrivers && (
            <button
              onClick={onNavigateToDrivers}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors flex items-center gap-1 shrink-0"
            >
              Operator Roster <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Fleet Risk Distribution Ticker Bar */}
      <div className="px-5 sm:px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-rose-400" />
            <span className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">
              Fleet Risk Profile:
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              ({drivers.length} Evaluated Operators)
            </span>
          </div>

          {/* Interactive Tier Badges for Rapid Filtering */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setRiskFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all border ${
                riskFilter === 'ALL'
                  ? 'bg-white text-slate-900 border-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              All ({drivers.length})
            </button>

            <button
              onClick={() => setRiskFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                riskFilter === 'CRITICAL'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-xs ring-2 ring-rose-400/50'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800/80 hover:bg-rose-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
              Critical ({summaryCounts.CRITICAL})
            </button>

            <button
              onClick={() => setRiskFilter('ELEVATED')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                riskFilter === 'ELEVATED'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-2 ring-amber-300/50'
                  : 'bg-amber-950/60 text-amber-300 border-amber-800/80 hover:bg-amber-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Elevated ({summaryCounts.ELEVATED})
            </button>

            <button
              onClick={() => setRiskFilter('MODERATE')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                riskFilter === 'MODERATE'
                  ? 'bg-yellow-400 text-slate-950 border-yellow-300 shadow-xs'
                  : 'bg-yellow-950/60 text-yellow-300 border-yellow-800/80 hover:bg-yellow-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              Moderate ({summaryCounts.MODERATE})
            </button>

            <button
              onClick={() => setRiskFilter('LOW')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                riskFilter === 'LOW'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Low ({summaryCounts.LOW})
            </button>
          </div>
        </div>

        {/* Visual Multi-Segment Heat Spectrum Bar */}
        <div className="w-full h-2 rounded-full bg-slate-800 flex overflow-hidden mt-3 gap-0.5">
          {summaryCounts.CRITICAL > 0 && (
            <div 
              style={{ width: `${(summaryCounts.CRITICAL / drivers.length) * 100}%` }}
              className="bg-rose-500 hover:opacity-90 transition-all cursor-pointer"
              title={`Critical Risk: ${summaryCounts.CRITICAL} drivers`}
              onClick={() => setRiskFilter('CRITICAL')}
            />
          )}
          {summaryCounts.ELEVATED > 0 && (
            <div 
              style={{ width: `${(summaryCounts.ELEVATED / drivers.length) * 100}%` }}
              className="bg-amber-500 hover:opacity-90 transition-all cursor-pointer"
              title={`Elevated Risk: ${summaryCounts.ELEVATED} drivers`}
              onClick={() => setRiskFilter('ELEVATED')}
            />
          )}
          {summaryCounts.MODERATE > 0 && (
            <div 
              style={{ width: `${(summaryCounts.MODERATE / drivers.length) * 100}%` }}
              className="bg-yellow-400 hover:opacity-90 transition-all cursor-pointer"
              title={`Moderate Risk: ${summaryCounts.MODERATE} drivers`}
              onClick={() => setRiskFilter('MODERATE')}
            />
          )}
          {summaryCounts.LOW > 0 && (
            <div 
              style={{ width: `${(summaryCounts.LOW / drivers.length) * 100}%` }}
              className="bg-emerald-500 hover:opacity-90 transition-all cursor-pointer"
              title={`Low Risk: ${summaryCounts.LOW} drivers`}
              onClick={() => setRiskFilter('LOW')}
            />
          )}
        </div>
      </div>

      {/* Quick Identification Callout for High-Risk Personnel */}
      {criticalDrivers.length > 0 && (
        <div className="bg-rose-50 border-b border-rose-200 px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-md bg-rose-600 text-white shrink-0 mt-0.5 animate-pulse">
              <AlertTriangle size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-rose-950 uppercase tracking-wide">
                  High-Risk Personnel Identified ({criticalDrivers.length}):
                </span>
                {criticalDrivers.map(cd => (
                  <button
                    key={cd.driver.id}
                    onClick={() => setSelectedDriverId(cd.driver.id)}
                    className="inline-flex items-center gap-1 bg-white hover:bg-rose-100 border border-rose-300 text-rose-900 text-[11px] font-extrabold px-2 py-0.5 rounded-md transition-colors"
                  >
                    <span>{cd.driver.name}</span>
                    <span className="font-mono text-[10px] bg-rose-600 text-white px-1 rounded">
                      {cd.score}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-rose-800 mt-0.5">
                Personnel flagged with expired credentials, repeated critical violations (≥3), or active immobilized incidents. Recommended for immediate dispatch restriction.
              </p>
            </div>
          </div>

          <button
            onClick={() => setRiskFilter('CRITICAL')}
            className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg transition-colors shrink-0 shadow-xs"
          >
            Filter Critical Only
          </button>
        </div>
      )}

      {/* Search and Sort Toolbar */}
      <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search driver or truck..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full focus:bg-white focus:ring-1 focus:ring-slate-800 outline-none"
            />
          </div>

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-slate-400 hover:text-slate-600 underline font-bold"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider shrink-0 flex items-center gap-1">
            <SlidersHorizontal size={11} /> Sort by:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-xs text-slate-800 focus:bg-white outline-none"
          >
            <option value="risk_desc">Highest Safety Risk</option>
            <option value="violations_desc">Most Citations / Violations</option>
            <option value="expiry_asc">Nearest Credential Expiry</option>
            <option value="name_asc">Driver Name (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Main Visual Display: Heat Tiles OR 2D Matrix */}
      <div className="p-5 sm:p-6 bg-slate-50/50">
        {viewMode === 'grid' ? (
          /* --- VIEW MODE 1: COLOR-CODED HEAT TILES GRID --- */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSorted.map((metric) => {
              const styles = getRiskStyles(metric.riskLevel);
              const isSelected = selectedDriverId === metric.driver.id;

              return (
                <div
                  key={metric.driver.id}
                  onClick={() => setSelectedDriverId(isSelected ? null : metric.driver.id)}
                  className={`rounded-xl border p-4 transition-all cursor-pointer relative overflow-hidden bg-white hover:shadow-md ${
                    isSelected ? 'ring-2 ring-slate-900 shadow-md' : 'hover:border-slate-300'
                  }`}
                >
                  {/* Color-Coded Heat Header Strip */}
                  <div className={`h-1.5 w-full absolute top-0 left-0 ${styles.bg}`} />

                  {/* Top Bar with Avatar, Name, and Risk Score Gauge */}
                  <div className="flex justify-between items-start gap-2 pt-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${styles.bg} ${styles.text}`}>
                        {metric.driver.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-900 text-xs truncate">
                          {metric.driver.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">
                          {metric.driver.id} • {metric.driver.truckId}
                        </span>
                      </div>
                    </div>

                    {/* Prominent Score Chip */}
                    <div className="text-right shrink-0">
                      <div className={`inline-flex items-center gap-1 font-mono font-black text-xs px-2 py-0.5 rounded-md ${styles.badgeBg}`}>
                        <Flame size={11} className={metric.riskLevel === 'CRITICAL' ? 'animate-pulse text-rose-600' : ''} />
                        <span>{metric.score}</span>
                        <span className="text-[9px] opacity-75">/100</span>
                      </div>
                      <span className="text-[9px] font-extrabold block text-slate-400 uppercase tracking-widest mt-0.5">
                        {styles.label}
                      </span>
                    </div>
                  </div>

                  {/* Heat Factors Visual Chips */}
                  <div className="grid grid-cols-2 gap-2 mt-3.5 pt-2.5 border-t border-slate-100 text-[10px]">
                    {/* Violations factor */}
                    <div className={`p-1.5 rounded-lg border ${
                      metric.driver.criticalViolations > 0 
                        ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold' 
                        : 'bg-slate-50 border-slate-150 text-slate-600'
                    }`}>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Violations</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {metric.driver.criticalViolations > 0 ? (
                          <AlertTriangle size={11} className="text-rose-600 shrink-0" />
                        ) : (
                          <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                        )}
                        <span className="font-black">
                          {metric.driver.criticalViolations} Record{metric.driver.criticalViolations !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Compliance status factor */}
                    <div className={`p-1.5 rounded-lg border ${
                      metric.driver.overallStatus === 'NON-COMPLIANT' 
                        ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold' 
                        : metric.driver.overallStatus === 'Warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-900 font-bold'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                    }`}>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Compliance</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {metric.driver.overallStatus === 'NON-COMPLIANT' ? (
                          <XCircle size={11} className="text-rose-600 shrink-0" />
                        ) : metric.driver.overallStatus === 'Warning' ? (
                          <AlertCircle size={11} className="text-amber-600 shrink-0" />
                        ) : (
                          <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                        )}
                        <span className="truncate">{metric.driver.overallStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expiration Timeline Countdown */}
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-150">
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="text-slate-400" />
                      <span>{metric.earliestDocType}:</span>
                    </span>
                    <span className={`font-mono font-bold ${
                      metric.earliestDaysRemaining < 0 
                        ? 'text-rose-600' 
                        : metric.earliestDaysRemaining <= 30 
                        ? 'text-amber-600' 
                        : 'text-emerald-600'
                    }`}>
                      {metric.earliestDaysRemaining < 0 
                        ? `EXPIRED (${Math.abs(metric.earliestDaysRemaining)}d ago)` 
                        : `${metric.earliestDaysRemaining} days remaining`}
                    </span>
                  </div>

                  {/* Roadside Incidents Indicator if any */}
                  {metric.activeIncidentsCount > 0 && (
                    <div className="mt-2 bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-1 rounded-md flex items-center justify-between border border-rose-200 animate-pulse">
                      <span className="flex items-center gap-1">
                        <Car size={11} /> 🚨 Active Roadside Incident
                      </span>
                      <span className="font-mono">{metric.activeIncidentsCount}</span>
                    </div>
                  )}

                  {/* Action Link Footer */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-semibold">
                      {isSelected ? 'Click to close breakdown' : 'Click for risk drilldown'}
                    </span>
                    <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:underline">
                      Inspect <ChevronRight size={11} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* --- VIEW MODE 2: 2D RISK MATRIX (VIOLATIONS × COMPLIANCE STATUS) --- */
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-150 bg-slate-50/70">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers size={14} className="text-blue-600" />
                Two-Dimensional Safety Risk Matrix
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Drivers partitioned by Violations Count (Rows) versus Regulatory Credential Clearance (Columns). The top-right sector represents maximum fleet hazard.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px] text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                    <th className="p-3 font-extrabold uppercase text-[10px] w-48 border-r border-slate-200 bg-slate-100">
                      Citations / Violations
                    </th>
                    <th className="p-3 font-extrabold uppercase text-[10px] text-emerald-800 bg-emerald-50/70 border-r border-slate-200 text-center">
                      ✓ Compliant Clearance
                    </th>
                    <th className="p-3 font-extrabold uppercase text-[10px] text-amber-800 bg-amber-50/70 border-r border-slate-200 text-center">
                      ⚠️ Warning (≤30 Days)
                    </th>
                    <th className="p-3 font-extrabold uppercase text-[10px] text-rose-800 bg-rose-50/70 text-center">
                      🚨 Non-Compliant (Expired)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Row 1: 3+ Critical Violations */}
                  <tr className="divide-x divide-slate-200">
                    <td className="p-3.5 bg-slate-50 font-bold">
                      <div className="text-rose-700 flex items-center gap-1.5">
                        <AlertTriangle size={13} />
                        <span className="font-black text-xs">3+ Citations</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                        Severe Historical Infractions
                      </span>
                    </td>

                    {/* 3+ Violations & Compliant */}
                    <td className="p-3 bg-amber-50/30 align-top">
                      {driverMetrics.filter(m => m.driver.criticalViolations >= 3 && m.driver.overallStatus === 'Compliant').map(m => (
                        <button
                          key={m.driver.id}
                          onClick={() => setSelectedDriverId(m.driver.id)}
                          className="w-full text-left mb-1.5 p-2 rounded-lg bg-white border border-amber-300 shadow-2xs hover:bg-amber-50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-900">{m.driver.name}</span>
                            <span className="font-mono text-[10px] font-black bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded">
                              {m.score}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {m.driver.truckId} • {m.driver.criticalViolations} Violations
                          </span>
                        </button>
                      ))}
                    </td>

                    {/* 3+ Violations & Warning */}
                    <td className="p-3 bg-rose-50/40 align-top">
                      {driverMetrics.filter(m => m.driver.criticalViolations >= 3 && m.driver.overallStatus === 'Warning').map(m => (
                        <button
                          key={m.driver.id}
                          onClick={() => setSelectedDriverId(m.driver.id)}
                          className="w-full text-left mb-1.5 p-2 rounded-lg bg-white border border-rose-300 shadow-2xs hover:bg-rose-50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-900">{m.driver.name}</span>
                            <span className="font-mono text-[10px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded">
                              {m.score}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {m.driver.truckId} • {m.driver.criticalViolations} Violations
                          </span>
                        </button>
                      ))}
                    </td>

                    {/* 3+ Violations & Non-Compliant (CRITICAL HAZARD CELL) */}
                    <td className="p-3 bg-rose-100/50 align-top">
                      {driverMetrics.filter(m => m.driver.criticalViolations >= 3 && m.driver.overallStatus === 'NON-COMPLIANT').map(m => (
                        <button
                          key={m.driver.id}
                          onClick={() => setSelectedDriverId(m.driver.id)}
                          className="w-full text-left mb-1.5 p-2 rounded-lg bg-rose-600 text-white shadow-sm hover:bg-rose-700 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-black text-white">{m.driver.name}</span>
                            <span className="font-mono text-[10px] font-black bg-white text-rose-800 px-1.5 py-0.2 rounded">
                              {m.score}
                            </span>
                          </div>
                          <span className="text-[10px] text-rose-100 font-mono block">
                            🚨 CRITICAL HOLD • {m.driver.criticalViolations} Violations
                          </span>
                        </button>
                      ))}
                    </td>
                  </tr>

                  {/* Row 2: 1-2 Violations */}
                  <tr className="divide-x divide-slate-200">
                    <td className="p-3.5 bg-slate-50 font-bold">
                      <div className="text-amber-700 flex items-center gap-1.5">
                        <AlertCircle size={13} />
                        <span className="font-black text-xs">1–2 Citations</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                        Minor / Moderate Infractions
                      </span>
                    </td>

                    {/* 1-2 Violations & Compliant */}
                    <td className="p-3 bg-emerald-50/20 align-top">
                      {driverMetrics.filter(m => (m.driver.criticalViolations === 1 || m.driver.criticalViolations === 2) && m.driver.overallStatus === 'Compliant').map(m => (
                        <button
                          key={m.driver.id}
                          onClick={() => setSelectedDriverId(m.driver.id)}
                          className="w-full text-left mb-1.5 p-2 rounded-lg bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">{m.driver.name}</span>
                            <span className="font-mono text-[10px] font-black bg-yellow-400 text-slate-900 px-1.5 py-0.2 rounded">
                              {m.score}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {m.driver.truckId} • {m.driver.criticalViolations} Violation
                          </span>
                        </button>
                      ))}
                    </td>

                    {/* 1-2 Violations & Warning */}
                    <td className="p-3 bg-amber-50/40 align-top">
                      {driverMetrics.filter(m => (m.driver.criticalViolations === 1 || m.driver.criticalViolations === 2) && m.driver.overallStatus === 'Warning').map(m => (
                        <button
                          key={m.driver.id}
                          onClick={() => setSelectedDriverId(m.driver.id)}
                          className="w-full text-left mb-1.5 p-2 rounded-lg bg-white border border-amber-300 shadow-2xs hover:bg-amber-50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-slate-900">{m.driver.name}</span>
                            <span className="font-mono text-[10px] font-black bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded">
                              {m.score}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {m.driver.truckId} • {m.driver.criticalViolations} Violations
                          </span>
                        </button>
                      ))}
                    </td>

                    {/* 1-2 Violations & Non-Compliant */}
                    <td className="p-3 bg-rose-50/50 align-top">
                      {driverMetrics.filter(m => (m.driver.criticalViolations === 1 || m.driver.criticalViolations === 2) && m.driver.overallStatus === 'NON-COMPLIANT').map(m => (
                        <button
                          key={m.driver.id}
                          onClick={() => setSelectedDriverId(m.driver.id)}
                          className="w-full text-left mb-1.5 p-2 rounded-lg bg-white border border-rose-400 shadow-2xs hover:bg-rose-50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-black text-rose-900">{m.driver.name}</span>
                            <span className="font-mono text-[10px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded">
                              {m.score}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {m.driver.truckId} • Expired Credential
                          </span>
                        </button>
                      ))}
                    </td>
                  </tr>

                  {/* Row 3: 0 Violations (Clean Record) */}
                  <tr className="divide-x divide-slate-200">
                    <td className="p-3.5 bg-slate-50 font-bold">
                      <div className="text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 size={13} />
                        <span className="font-black text-xs">0 Citations</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                        Pristine Driving History
                      </span>
                    </td>

                    {/* 0 Violations & Compliant (SAFEST GREEN CELL) */}
                    <td className="p-3 bg-emerald-50/40 align-top">
                      {driverMetrics.filter(m => m.driver.criticalViolations === 0 && m.driver.overallStatus === 'Compliant').map(m => (
                        <button
                          key={m.driver.id}
                          onClick={() => setSelectedDriverId(m.driver.id)}
                          className="w-full text-left mb-1.5 p-2 rounded-lg bg-white border border-emerald-300 shadow-2xs hover:bg-emerald-50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">{m.driver.name}</span>
                            <span className="font-mono text-[10px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded">
                              {m.score}
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-mono block">
                            ✓ {m.driver.truckId} • Clean Record
                          </span>
                        </button>
                      ))}
                    </td>

                    {/* 0 Violations & Warning */}
                    <td className="p-3 bg-yellow-50/30 align-top">
                      {driverMetrics.filter(m => m.driver.criticalViolations === 0 && m.driver.overallStatus === 'Warning').map(m => (
                        <button
                          key={m.driver.id}
                          onClick={() => setSelectedDriverId(m.driver.id)}
                          className="w-full text-left mb-1.5 p-2 rounded-lg bg-white border border-yellow-300 shadow-2xs hover:bg-yellow-50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">{m.driver.name}</span>
                            <span className="font-mono text-[10px] font-black bg-yellow-400 text-slate-950 px-1.5 py-0.2 rounded">
                              {m.score}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {m.driver.truckId} • Renewal Imminent
                          </span>
                        </button>
                      ))}
                    </td>

                    {/* 0 Violations & Non-Compliant */}
                    <td className="p-3 bg-rose-50/30 align-top">
                      {driverMetrics.filter(m => m.driver.criticalViolations === 0 && m.driver.overallStatus === 'NON-COMPLIANT').map(m => (
                        <button
                          key={m.driver.id}
                          onClick={() => setSelectedDriverId(m.driver.id)}
                          className="w-full text-left mb-1.5 p-2 rounded-lg bg-white border border-rose-300 shadow-2xs hover:bg-rose-50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-black text-rose-900">{m.driver.name}</span>
                            <span className="font-mono text-[10px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded">
                              {m.score}
                            </span>
                          </div>
                          <span className="text-[10px] text-rose-700 font-mono block">
                            Expired Credential Document
                          </span>
                        </button>
                      ))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Selected Driver Detailed Drilldown Drawer / Card */}
      {activeSelectedMetric && (
        <div className="p-5 sm:p-6 bg-slate-900 text-white border-t border-slate-800 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                getRiskStyles(activeSelectedMetric.riskLevel).bg
              } ${getRiskStyles(activeSelectedMetric.riskLevel).text}`}>
                {activeSelectedMetric.driver.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-white">
                    {activeSelectedMetric.driver.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    getRiskStyles(activeSelectedMetric.riskLevel).badgeBg
                  }`}>
                    {activeSelectedMetric.riskLevel} SAFETY RISK
                  </span>
                  <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    ID: {activeSelectedMetric.driver.id} • Assigned: {activeSelectedMetric.driver.truckId}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tax Setup: <strong className="text-slate-200">{activeSelectedMetric.driver.taxClassification || 'W2'}</strong> • Phone: {activeSelectedMetric.driver.profileInfo?.phone || '(312) 555-0192'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {onSelectDriver && (
                <button
                  onClick={() => onSelectDriver(activeSelectedMetric.driver)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  Edit Driver Credentials <ExternalLink size={12} />
                </button>
              )}
              <button
                onClick={() => setSelectedDriverId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Close Drilldown
              </button>
            </div>
          </div>

          {/* Drilldown Factors Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs">
            {/* Factor 1: Risk Score Gauge */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                Composite Risk Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white">
                  {activeSelectedMetric.score}
                </span>
                <span className="text-xs text-slate-400">/ 100 max</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full ${getRiskStyles(activeSelectedMetric.riskLevel).bg}`}
                  style={{ width: `${activeSelectedMetric.score}%` }}
                />
              </div>
            </div>

            {/* Factor 2: Citations Score */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                Violations Contribution
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black font-mono ${activeSelectedMetric.driver.criticalViolations > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {activeSelectedMetric.driver.criticalViolations} Records
                </span>
                <span className="text-[10px] text-slate-400">
                  (+{activeSelectedMetric.violationsScore} pts)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {activeSelectedMetric.driver.criticalViolations >= 3 ? 'Exceeds fleet violation threshold (≥3)' : 'Within acceptable violation limits'}
              </p>
            </div>

            {/* Factor 3: Credentials Expiry */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                Credential Validity
              </span>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">CDL License:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {activeSelectedMetric.driver.cdlExpiry} ({calculateDaysDifference(activeSelectedMetric.driver.cdlExpiry)}d)
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Medical Cert:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {activeSelectedMetric.driver.medCertExpiry} ({calculateDaysDifference(activeSelectedMetric.driver.medCertExpiry)}d)
                  </span>
                </div>
              </div>
            </div>

            {/* Factor 4: Roadside Status */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                Roadside Incidents
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black font-mono ${activeSelectedMetric.activeIncidentsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {activeSelectedMetric.activeIncidentsCount} Active
                </span>
                <span className="text-[10px] text-slate-400">
                  (+{activeSelectedMetric.incidentScore} pts)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {activeSelectedMetric.activeIncidentsCount > 0 ? 'Open roadside triage dispatch event' : 'No active vehicle breakdowns'}
              </p>
            </div>
          </div>

          {/* Action Recommendation Banner */}
          <div className="mt-4 p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-start gap-2.5">
            <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-white font-bold">Safety Compliance Action Recommendation:</strong>{' '}
              <span className="text-slate-300">{activeSelectedMetric.actionRecommendation}</span>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Legend & Methodology Footer */}
      <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap text-[11px]">
          <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">Heatmap Scale:</span>
          
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span className="text-slate-700 font-bold">Critical Risk (65–100)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-700 font-bold">Elevated Risk (40–64)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
            <span className="text-slate-700 font-bold">Moderate Risk (20–39)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span className="text-slate-700 font-bold">Low Risk (0–19)</span>
          </div>
        </div>

        <span className="text-[10px] text-slate-400 font-mono">
          Model: Violations (max 45) + Non-Compliance (max 40) + Roadside (max 20)
        </span>
      </div>
    </div>
  );
}
