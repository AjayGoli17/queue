import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedSuccess, setSimulatedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setIsSimulating(true);
      setTimeout(() => {
        setIsSimulating(false);
        setSimulatedSuccess(true);
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-hospital-50 border border-hospital-200 text-hospital-700 rounded-xl">
            <FileSpreadsheet className="w-6 h-6 text-hospital-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">IMPORT TODAY'S APPOINTMENTS</h3>
            <p className="text-xs text-slate-500 font-medium">Existing HMS CSV / Excel Integration</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-5">
          <div className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-hospital-600 shrink-0 mt-0.5" />
            <p>
              <strong>Architecture Note:</strong> Our system works alongside your hospital's existing HMS. Export today's booked appointments from your HMS as CSV/Excel and upload here to populate the floor queue.
            </p>
          </div>
        </div>

        {!simulatedSuccess ? (
          <label className="border-2 border-dashed border-slate-300 hover:border-hospital-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 hover:bg-hospital-50/30 group">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-hospital-600 mb-3 group-hover:scale-105 transition">
              {isSimulating ? (
                <div className="w-5 h-5 border-2 border-hospital-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6 text-hospital-600" />
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-1">
              {isSimulating ? 'Validating CSV columns...' : 'Click to Upload CSV / Excel file'}
            </p>
            <p className="text-xs text-slate-500 max-w-xs">
              Import today's appointments from the hospital's existing HMS (CSV, XLSX format).
            </p>
          </label>
        ) : (
          <div className="rounded-2xl p-6 bg-emerald-50 border border-emerald-200 flex flex-col items-center text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2" />
            <p className="font-bold text-slate-900">{selectedFileName || 'Appointments_Today.csv'}</p>
            <p className="text-xs text-emerald-700 mt-1">
              Ready for Prompt 2 automated column mapping & batch check-in ingestion.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            Close
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-hospital-600 hover:bg-hospital-700 text-white shadow-sm transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
