import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
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

/**
 * Robust CSV parser that parses raw CSV string into rows and cells,
 * properly handling quotes, commas within quotes, escaped quotes,
 * CRLF/LF line endings, and stripping UTF-8 BOM.
 */
function parseCsvRows(text: string): string[][] {
  // Strip BOM if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[_\s-]+/g, ' ');
}

function getHeaderIndex(headers: string[], type: 'name' | 'phone' | 'doctor' | 'time'): number {
  const norm = headers.map(normalizeHeader);

  if (type === 'doctor') {
    return norm.findIndex(
      (h) => h.includes('doctor') || h === 'dr' || h.startsWith('dr ') || h.includes('physician')
    );
  }
  if (type === 'name') {
    return norm.findIndex(
      (h) => !h.includes('doctor') && (h.includes('patient') || h.includes('name'))
    );
  }
  if (type === 'phone') {
    return norm.findIndex(
      (h) => h.includes('phone') || h.includes('mobile') || h.includes('contact') || h.includes('cell')
    );
  }
  if (type === 'time') {
    return norm.findIndex(
      (h) => h.includes('time') || h.includes('appointment') || h.includes('appt') || h.includes('schedule')
    );
  }
  return -1;
}

export function parseCsvContent(content: string) {
  const rows = parseCsvRows(content);
  console.log('[CSV IMPORT] raw file size:', content.length, 'bytes');
  console.log('[CSV IMPORT] first 500 characters:\n', content.slice(0, 500));

  if (rows.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row.');
  }

  const headerRow = rows[0];
  console.log('[CSV IMPORT] parsed headers:', JSON.stringify(headerRow));
  console.log('[CSV IMPORT] normalized headers:', JSON.stringify(headerRow.map(normalizeHeader)));

  const nameIdx = getHeaderIndex(headerRow, 'name');
  const phoneIdx = getHeaderIndex(headerRow, 'phone');
  const doctorIdx = getHeaderIndex(headerRow, 'doctor');
  const timeIdx = getHeaderIndex(headerRow, 'time');

  // Validate required columns
  const missingColumns: string[] = [];
  if (nameIdx === -1) missingColumns.push('Patient Name');
  if (phoneIdx === -1) missingColumns.push('Phone');
  if (doctorIdx === -1) missingColumns.push('Doctor');
  if (timeIdx === -1) missingColumns.push('Appointment Time');

  if (missingColumns.length > 0) {
    if (missingColumns.length === 1) {
      throw new Error(`Missing required column: ${missingColumns[0]}`);
    }
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  const appointments: Array<{
    patient_name: string;
    phone: string;
    appointment_time: string;
    doctor_name: string;
  }> = [];

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const patientName = cols[nameIdx]?.trim();
    if (!patientName) continue;

    const phone = cols[phoneIdx]?.trim() || '+91 98765 00000';
    const doctorName = cols[doctorIdx]?.trim() || 'Dr. Kumar';
    const apptTime = cols[timeIdx]?.trim() || '10:00 AM';

    appointments.push({
      patient_name: patientName,
      phone,
      appointment_time: apptTime,
      doctor_name: doctorName,
    });
  }

  console.log('[CSV IMPORT] parsed row count:', rows.length - 1);
  console.log('[CSV IMPORT] mapped rows count:', appointments.length);

  if (appointments.length === 0) {
    throw new Error('No valid appointment rows found in the CSV.');
  }

  return appointments;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[CSV IMPORT] filename:', file.name, 'size:', file.size);
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
      console.log('[CSV IMPORT] API payload:', { count: appointments.length, appointments });
      const res = await importAppointmentsCsv(appointments, 'dr-kumar');
      console.log('[CSV IMPORT] API response:', res);
      setSuccessMessage(`${res.count} appointments imported successfully.`);
      onSuccess(res.count);
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      console.error('[CSV IMPORT] Error caught in UI:', err);
      setErrorMessage(err.message || 'Import failed. Please check your data and try again.');
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
