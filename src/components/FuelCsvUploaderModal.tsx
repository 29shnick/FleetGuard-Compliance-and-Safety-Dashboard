import React, { useState } from 'react';
import { FuelTransaction } from '../types';
import { 
  Fuel, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  X, 
  FileSpreadsheet, 
  Download, 
  Layers, 
  ArrowRight,
  DollarSign
} from 'lucide-react';

interface FuelCsvUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFuelTransactions: (transactions: FuelTransaction[]) => void;
}

export default function FuelCsvUploaderModal({
  isOpen,
  onClose,
  onImportFuelTransactions
}: FuelCsvUploaderModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<FuelTransaction[]>([]);
  const [parseError, setParseError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Robust CSV parser supporting standard quotes and delimiter formats
  const parseCsvText = (text: string) => {
    try {
      setParseError('');
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setParseError('The uploaded CSV appears empty or missing header row.');
        return;
      }

      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.split(',').map(h => h.replace(/["']/g, '').trim());

      // Detect column indices
      const findIdx = (keywords: string[]) => 
        headers.findIndex(h => keywords.some(kw => h.includes(kw)));

      const dateIdx = findIdx(['date', 'trans_date', 'transaction date', 'time']);
      const truckIdx = findIdx(['truck', 'unit', 'card', 'vehicle', 'unit_id', 'equipment']);
      const stateIdx = findIdx(['state', 'jurisdiction', 'st', 'prov']);
      const gallonsIdx = findIdx(['gallon', 'gal', 'volume', 'quantity', 'qty']);
      const amountIdx = findIdx(['total', 'amount', 'cost', 'net', 'price_total', 'gross']);
      const ppgIdx = findIdx(['ppg', 'price_per_gal', 'unit_price', 'rate']);
      const merchantIdx = findIdx(['merchant', 'location', 'city', 'station', 'vendor', 'name']);

      if (stateIdx === -1 || gallonsIdx === -1) {
        setParseError('Could not identify required "State" or "Gallons" columns in the CSV header. Please check column names or use the sample template.');
        return;
      }

      const transactions: FuelTransaction[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Split with handling for quoted commas
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^["']|["']$/g, '').trim());

        const stateRaw = stateIdx !== -1 && cols[stateIdx] ? cols[stateIdx].toUpperCase() : 'IL';
        // Extract 2-letter state abbreviation
        const stateMatch = stateRaw.match(/\b([A-Z]{2})\b/);
        const stateCode = stateMatch ? stateMatch[1] : stateRaw.slice(0, 2);

        const gallonsRaw = gallonsIdx !== -1 ? cols[gallonsIdx]?.replace(/[^0-9.]/g, '') : '0';
        const gallons = parseFloat(gallonsRaw) || 0;

        const amountRaw = amountIdx !== -1 ? cols[amountIdx]?.replace(/[^0-9.]/g, '') : '0';
        const totalAmount = parseFloat(amountRaw) || (gallons * 3.85);

        const dateRaw = dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx] : '2026-05-20';
        const truckRaw = truckIdx !== -1 && cols[truckIdx] ? cols[truckIdx] : 'FLEET';
        const merchantRaw = merchantIdx !== -1 && cols[merchantIdx] ? cols[merchantIdx] : 'Pilot / Flying J';
        const ppg = ppgIdx !== -1 && cols[ppgIdx] ? parseFloat(cols[ppgIdx].replace(/[^0-9.]/g, '')) : (gallons > 0 ? totalAmount / gallons : 3.85);

        if (gallons > 0) {
          transactions.push({
            id: `FT-CSV-${Date.now()}-${i}`,
            date: dateRaw,
            cardOrTruckId: truckRaw,
            stateCode,
            gallons: parseFloat(gallons.toFixed(2)),
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            pricePerGallon: parseFloat(ppg.toFixed(3)),
            merchantOrCity: merchantRaw,
            invoiceOrRef: `CSV-ROW-${i}`
          });
        }
      }

      if (transactions.length === 0) {
        setParseError('No valid fuel transactions with positive gallons could be extracted from the file.');
        return;
      }

      setParsedRows(transactions);
    } catch (err: any) {
      setParseError(`Failed to parse CSV: ${err?.message || 'Unknown parsing error'}`);
    }
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        parseCsvText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Generate and download sample template
  const handleDownloadSample = () => {
    const sampleCsv = `Date,Truck_Unit,State,Gallons,Total_Amount,Price_Per_Gal,Merchant_Location
2026-05-18,TRK-101,IL,150.50,571.90,3.80,Pilot Travel Center #412 - Morris IL
2026-05-19,TRK-101,IN,135.00,499.50,3.70,Love's Travel Stop #220 - Gary IN
2026-05-20,TRK-202,OH,165.25,627.95,3.80,TA Travel Center - Toledo OH
2026-05-21,TRK-202,PA,140.00,560.00,4.00,Pilot Travel Center - Breezewood PA
2026-05-22,TRK-303,GA,125.80,478.04,3.80,TA Express - Atlanta GA
2026-05-23,TRK-303,TN,130.00,481.00,3.70,Flying J #219 - Nashville TN
2026-05-24,TRK-404,TX,185.00,647.50,3.50,Love's Travel Stop - Dallas TX`;

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Fleet_Fuel_Account_Sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // State summary of parsed rows
  const stateSummary = parsedRows.reduce<Record<string, { gallons: number; amount: number; count: number }>>((acc, row) => {
    if (!acc[row.stateCode]) {
      acc[row.stateCode] = { gallons: 0, amount: 0, count: 0 };
    }
    acc[row.stateCode].gallons += row.gallons;
    acc[row.stateCode].amount += row.totalAmount;
    acc[row.stateCode].count += 1;
    return acc;
  }, {});

  const totalGallons = parsedRows.reduce((sum, r) => sum + r.gallons, 0);
  const totalAmount = parsedRows.reduce((sum, r) => sum + r.totalAmount, 0);

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;
    onImportFuelTransactions(parsedRows);
    setSuccessMsg(`Successfully imported ${parsedRows.length} fuel transactions! IFTA and company fuel expense calculations updated.`);
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Fuel size={20} />
            </div>
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-amber-400 font-bold">
                Fuel Account Ingestion & IFTA Automation
              </span>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                Upload Fuel Provider CSV (EFS, Fleet One, Comdata, Wex)
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

        {/* Action / Help Banner */}
        <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300">
          <p className="text-[11px] leading-relaxed max-w-md">
            Upload your raw monthly or quarterly fuel card exports. The engine aggregates tax-paid gallons by jurisdiction and integrates fuel expenses into both your IFTA quarterly return and company P&L.
          </p>
          <button
            type="button"
            onClick={handleDownloadSample}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 font-mono font-bold flex items-center gap-1.5 text-xs transition-colors shrink-0"
          >
            <Download size={13} /> Sample CSV Template
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {successMsg ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={28} />
              </div>
              <h3 className="text-sm font-black text-slate-900">{successMsg}</h3>
              <p className="text-xs text-slate-500">Applying changes to IFTA tax credit schedules...</p>
            </div>
          ) : (
            <>
              {parseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2 font-medium">
                  <AlertCircle size={14} className="shrink-0 text-rose-600" />
                  {parseError}
                </div>
              )}

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all ${
                  dragOver
                    ? 'border-amber-500 bg-amber-50'
                    : parsedRows.length > 0
                    ? 'border-emerald-400 bg-emerald-50/40'
                    : 'border-slate-250 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <input
                  type="file"
                  id="fuel-csv-input"
                  className="hidden"
                  accept=".csv,.txt"
                  onChange={handleFileInput}
                />
                <label htmlFor="fuel-csv-input" className="cursor-pointer block">
                  <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto text-amber-600 mb-2">
                    <FileSpreadsheet size={24} />
                  </div>
                  {fileName ? (
                    <div>
                      <p className="font-bold text-slate-900 text-xs flex items-center justify-center gap-1.5">
                        <CheckCircle size={13} className="text-emerald-600" /> {fileName}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {parsedRows.length} transactions ready for IFTA ingestion • Click to swap file
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">
                        Drop fuel account CSV here, or <span className="text-amber-600 underline">browse computer</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Accepts EFS, Fleet One, Comdata, Pilot/Flying J, Love's, or custom fleet CSVs
                      </span>
                    </div>
                  )}
                </label>
              </div>

              {/* Parsed Summary Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-3 gap-3 bg-slate-900 text-white p-4 rounded-xl font-mono">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans block">Total Entries</span>
                      <strong className="text-base text-white">{parsedRows.length} Swipes</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans block">Total Gallons</span>
                      <strong className="text-base text-amber-400">{totalGallons.toLocaleString(undefined, { minimumFractionDigits: 1 })} Gal</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans block">Total Spend</span>
                      <strong className="text-base text-emerald-400">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers size={13} className="text-amber-600" /> State-by-State IFTA Tax Paid Gallons Breakdown
                    </h4>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="px-4 py-2.5">Jurisdiction</th>
                            <th className="px-4 py-2.5">Transactions</th>
                            <th className="px-4 py-2.5 text-right">Tax-Paid Gallons</th>
                            <th className="px-4 py-2.5 text-right">Total Fuel Spend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {(Object.entries(stateSummary) as [string, { gallons: number; amount: number; count: number }][]).map(([state, data]) => (
                            <tr key={state} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                                <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                  {state}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-600">{data.count} purchases</td>
                              <td className="px-4 py-2 text-right font-bold text-amber-700">
                                {data.gallons.toLocaleString(undefined, { minimumFractionDigits: 2 })} gal
                              </td>
                              <td className="px-4 py-2 text-right text-slate-800 font-bold">
                                ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!successMsg && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-500 font-mono">
              {parsedRows.length > 0 ? `${parsedRows.length} records parsed` : 'No file loaded'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedRows.length === 0}
                onClick={handleConfirmImport}
                className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all ${
                  parsedRows.length > 0
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle size={14} /> Import & Calculate IFTA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
