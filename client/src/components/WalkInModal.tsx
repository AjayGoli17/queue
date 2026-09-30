import React, { useState } from 'react';
import { UserPlus, X, Stethoscope, Phone, User, CheckCircle2 } from 'lucide-react';
import { addWalkInPatient } from '../services/api';

interface WalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, name: string) => void;
}

export const WalkInModal: React.FC<WalkInModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter the patient\'s name.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await addWalkInPatient(name.trim(), phone.trim(), 'dr-kumar');
      setName('');
      setPhone('');
      onSuccess(res.patient.token, res.patient.patient_name);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register walk-in patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-hospital-50 border border-hospital-200 text-hospital-700 rounded-xl">
            <UserPlus className="w-6 h-6 text-hospital-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">REGISTER WALK-IN PATIENT</h3>
            <p className="text-xs text-slate-500 font-medium">Instantly generate token and add to active queue</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Patient Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 98765 00000"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Doctor & Room
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
              <Stethoscope className="w-4 h-4 text-hospital-600" />
              <span>Dr. Kumar — Room 2 (General Medicine)</span>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Walk-in patients are automatically given the status <strong>WAITING</strong> and placed in the active FIFO queue.
            </span>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-hospital-600 hover:bg-hospital-700 text-white shadow-md shadow-hospital-600/20 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Registering...' : 'Register Walk-In Patient'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
