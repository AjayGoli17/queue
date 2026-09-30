import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, X, CheckCircle2, AlertCircle, FileText, Sparkles } from 'lucide-react';
import { importAppointmentsCsv } from '../services/api';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

const SAMPLE_CSV = `Patient Name,Phone,Doctor,Appointment Time
Sunita Verma,9876543220,Dr. Kumar,01:00 PM
Manish Gupta,9876543221,Dr. Kumar,01:15 PM
Anjali Nair,9876543222,Dr. Kumar,01:30 PM
Deepak Joshi,9876543223,Dr. Kumar,01:45 PM
Kavita Roy,9876543224,Dr. Kumar,02:00 PM`;

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseCsvContent = (content: string) => {
    const lines = content.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must contain a header row and at least one data row.');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    
    // Find column indexes
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('patient'));
    const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('appointment'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('contact') || h.includes('mobile'));
    const doctorIdx = headers.findIndex(h => h.includes('doctor'));

    if (nameIdx === -1 || timeIdx === -1) {
      throw new Error('Unable to import this file. Please check the required columns (Patient Name, Appointment Time).');
    }

    const appointments: Array<{ patient_name: string; phone?: string; appointment_time: string; doctor_name?: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/['"]/g, ''));
      if (cols.length <= nameIdx || !cols[nameIdx]) continue;

      appointments.push({
        patient_name: cols[nameIdx],
        phone: phoneIdx !== -1 ? cols[phoneIdx] : undefined,
        appointment_time: cols[timeIdx] || '10:00 AM',
        doctor_name: doctorIdx !== -1 ? cols[doctorIdx] : 'Dr. Kumar',
      });
    }

    if (appointments.length === 0) {
      throw new Error('No valid appointment rows found in the CSV.');
    }

    return appointments;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setErrorMessage(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const appointments = parseCsvContent(csvText);
      const res = await importAppointmentsCsv(appointments, 'dr-kumar');
      setSuccessMessage(`${res.count} appointments imported successfully.`);
      onSuccess(res.count);
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to import this file. Please check the required columns.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
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
            <h3 className="text-lg font-black text-slate-900">IMPORT TODAY'S APPOINTMENTS</h3>
            <p className="text-xs text-slate-500 font-medium">Export from existing Hospital HMS → Import into floor queue</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'upload' ? 'bg-white text-hospital-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-1.5 rounded-lg transition ${
              activeTab === 'paste' ? 'bg-white text-hospital-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Preview / Paste CSV Data
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {activeTab === 'upload' ? (
          <label className="border-2 border-dashed border-slate-300 hover:border-hospital-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 hover:bg-hospital-50/30 group">
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-hospital-600 mb-3 group-hover:scale-105 transition">
              <UploadCloud className="w-6 h-6 text-hospital-600" />
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1">
              {fileName ? fileName : 'Choose CSV File from Existing HMS'}
            </p>
            <p className="text-xs text-slate-500 max-w-xs">
              Expected columns: <code className="text-hospital-700 font-mono">Patient Name, Phone, Doctor, Appointment Time</code>
            </p>
          </label>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">CSV Data (Comma-separated)</span>
              <button
                type="button"
                onClick={() => setCsvText(SAMPLE_CSV)}
                className="text-hospital-600 font-bold hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Load Sample HMS Batch
              </button>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:bg-white"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-hospital-600 hover:bg-hospital-700 text-white shadow-md shadow-hospital-600/20 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? 'Importing Appointments...' : 'Import Appointments'}
          </button>
        </div>
      </div>
    </div>
  );
};
