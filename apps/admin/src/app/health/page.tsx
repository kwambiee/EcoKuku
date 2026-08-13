'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Badge } from '@ecokuku/ui';
import { Plus, Syringe, Calendar, CheckCircle, Clock, AlertTriangle, Info, X, Stethoscope, ShieldAlert, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Batch {
  id: string;
  batchNumber: string;
  type: string;
  currentCount: number;
  startDate: string;
}

interface VaccinationLog {
  id: string;
  vaccineType: string;
  dateAdministered: string;
  dosage?: string;
  administeredBy?: string;
  batchNo?: string;
  notes?: string;
  batch?: { id: string; batchNumber: string };
}

interface VaccineScheduleItem {
  vaccine: string;
  daysOld: number;    // recommended/target day
  windowEnd: number;  // last day before truly overdue (give grace for delays)
  method: string;
  notes: string;
  supplementNotes: string;
}

// Vet-recommended vaccination schedule — daysOld = target/recommended day, windowEnd = last day before overdue
// The system recommends; farmer logs on the actual day they administer.
const VACCINE_SCHEDULE: VaccineScheduleItem[] = [
  {
    vaccine: "Marek's Disease",
    daysOld: 1, windowEnd: 3,
    method: 'Subcutaneous injection (hatchery)',
    notes: 'Done at hatchery on day 1. Confirm receipt of vaccinated chicks.',
    supplementNotes: 'Ensure glucose water available for first 6 hours after arrival. Chicks should be warm and stress-free.',
  },
  {
    vaccine: 'Newcastle Disease + IB',
    daysOld: 7, windowEnd: 14,
    method: 'Eye drop / Drinking water',
    notes: 'Combined ND + Infectious Bronchitis — first dose. Window: Day 7–14.',
    supplementNotes: 'Give multivitamins in drinking water 2 days before and 3 days after. Withhold water 1–2 hours before drinking-water administration.',
  },
  {
    vaccine: 'Gumboro (IBD)',
    daysOld: 14, windowEnd: 21,
    method: 'Drinking water',
    notes: 'First dose. Window: Day 14–21.',
    supplementNotes: 'Use chlorine-free water. Vitamin E + selenium supplement boosts immune response. Withhold water 1–2 hours before.',
  },
  {
    vaccine: 'Newcastle Disease (plain)',
    daysOld: 21, windowEnd: 28,
    method: 'Eye drop / Drinking water',
    notes: 'Second ND dose (plain/live vaccine). Window: Day 21–28.',
    supplementNotes: 'Multivitamins in water 2 days before and after. Do not combine with other vaccines on same day.',
  },
  {
    vaccine: 'Gumboro Booster',
    daysOld: 28, windowEnd: 35,
    method: 'Drinking water',
    notes: 'Gumboro second dose / booster. Window: Day 28–35.',
    supplementNotes: 'Electrolytes in water to reduce post-vaccination stress. Ensure all birds drink within 2 hours.',
  },
  {
    vaccine: 'Fowl Pox',
    daysOld: 42, windowEnd: 70,
    method: 'Wing web stab',
    notes: 'One-time. Window: Day 42–70. Check take-reaction (scab) 7–10 days after.',
    supplementNotes: 'Vitamin A supplement supports skin healing at stab site. Inspect wings 7–10 days post-vaccination for scab formation (confirms take).',
  },
  {
    vaccine: 'Fowl Typhoid',
    daysOld: 56, windowEnd: 84,
    method: 'Subcutaneous injection / Drinking water',
    notes: 'Salmonella gallinarum. Window: Day 56–84. Some vets recommend at point-of-lay (~18 weeks).',
    supplementNotes: 'Probiotics in feed 3 days after to support gut health. Ensure birds are in good health before vaccination.',
  },
];

const DOSAGE_GUIDE: Record<string, string> = {
  "Marek's Disease": 'Subcutaneous injection: 0.2 ml per chick at back of neck. Done at hatchery on day 1.',
  'Newcastle Disease + IB': 'Eye drop: 1 drop per bird. Drinking water: dissolve 1 vial (1000 doses) in chlorine-free water. Birds must drink within 2 hours.',
  'Gumboro (IBD)': 'Drinking water: dissolve 1 vial in clean, chlorine-free water. 20–40 litres per 1000 birds. Withhold water 1–2 hours before.',
  'Newcastle Disease (plain)': 'Eye drop: 1 drop per bird. Drinking water: dissolve in clean water. Let birds drink within 2 hours. Withhold water 1–2 hours before.',
  'Gumboro Booster': 'Same as first Gumboro dose. Chlorine-free water. Withhold 1–2 hours before. Ensure all birds drink.',
  'Fowl Pox': 'Wing web stab: dip applicator in reconstituted vaccine, stab through wing web. Use twin-needle applicator. Check for scab 7–10 days after.',
  'Fowl Typhoid': 'Injection: 0.5 ml subcutaneously or as per label. Drinking water: follow manufacturer dose. Ensure birds are healthy before vaccinating.',
};

// Keywords used for fuzzy matching vaccination logs to scheduled vaccines
const VACCINE_MATCH_KEYWORDS: Record<string, string[]> = {
  "Marek's Disease": ['MAREK'],
  'Newcastle Disease + IB': ['NEWCASTLE', 'IB', 'BRONCHITIS'],
  'Gumboro (IBD)': ['GUMBORO', 'IBD'],
  'Newcastle Disease (plain)': ['NEWCASTLE', 'ND'],
  'Gumboro Booster': ['GUMBORO', 'IBD'],
  'Fowl Pox': ['FOWL POX', 'POX'],
  'Fowl Typhoid': ['TYPHOID', 'SALMONELLA', 'GALLINARUM'],
};

const VACCINE_TYPES = [
  "Marek's Disease",
  'Newcastle Disease + IB',
  'Gumboro (IBD)',
  'Newcastle Disease (plain)',
  'Gumboro Booster',
  'Fowl Pox',
  'Fowl Typhoid',
  'Avian Influenza (AI)',
  'Other',
];

interface HealthEvent {
  id: string;
  batchId: string;
  type: string;
  date: string;
  disease?: string;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  dosage?: string;
  duration?: string;
  withdrawalPeriod?: number;
  withdrawalEnds?: string;
  outcome?: string;
  vetName?: string;
  cost?: number;
  notes?: string;
  batch?: { id: string; batchNumber: string; type: string };
}

const EVENT_TYPES = [
  { value: 'disease', label: 'Disease / Illness' },
  { value: 'injury', label: 'Injury' },
  { value: 'treatment', label: 'Preventive Treatment' },
  { value: 'vet_visit', label: 'Vet Visit / Consultation' },
];

const OUTCOMES = ['ONGOING', 'RECOVERING', 'RECOVERED', 'MORTALITY'];

const OUTCOME_STYLES: Record<string, string> = {
  ONGOING: 'bg-red-100 text-red-700',
  RECOVERING: 'bg-amber-100 text-amber-700',
  RECOVERED: 'bg-green-100 text-green-700',
  MORTALITY: 'bg-gray-100 text-gray-700',
};

const COMMON_DISEASES = [
  'Newcastle Disease', 'Coccidiosis', 'Fowl Pox', 'Infectious Bronchitis',
  'Gumboro / IBD', 'Fowl Typhoid', 'Chronic Respiratory Disease (CRD)',
  'E. coli Infection', 'Mycoplasma', 'Avian Influenza',
  'Worms / Internal Parasites', 'Mites / External Parasites',
  'Egg Drop Syndrome', 'Bumblefoot', 'Other',
];

type CellStatus = 'done' | 'overdue' | 'due' | 'upcoming';

interface MatrixCell {
  status: CellStatus;
  label: string;
  dateAdministered?: string;
  supplementNotes: string;
  vaccine: VaccineScheduleItem;
}

function getVaccineStatus(
  vaccine: VaccineScheduleItem,
  batchAgeInDays: number,
  batchLogs: VaccinationLog[],
  isBooster: boolean,
): { status: CellStatus; label: string; dateAdministered?: string } {
  const keywords = VACCINE_MATCH_KEYWORDS[vaccine.vaccine] || [vaccine.vaccine.split(' ')[0].toUpperCase()];

  // Find matching vaccination logs
  const matchingLogs = batchLogs.filter((log) => {
    const logType = log.vaccineType.toUpperCase();
    const hasKeyword = keywords.some((kw) => logType.includes(kw));
    if (!hasKeyword) return false;

    // For boosters, check if the log mentions "booster" or "2nd" or "second"
    // For first doses, exclude booster logs
    if (isBooster) {
      return logType.includes('BOOSTER') || logType.includes('2ND') || logType.includes('SECOND');
    } else {
      // For first-dose vaccines that have a booster counterpart, exclude booster logs
      const hasBoosterVersion = VACCINE_SCHEDULE.some(
        (v) => v.vaccine !== vaccine.vaccine && v.daysOld > vaccine.daysOld &&
          VACCINE_MATCH_KEYWORDS[v.vaccine]?.some((k) => keywords.includes(k)),
      );
      if (hasBoosterVersion) {
        return !logType.includes('BOOSTER') && !logType.includes('2ND') && !logType.includes('SECOND');
      }
      return true;
    }
  });

  if (matchingLogs.length > 0) {
    const dateStr = new Date(matchingLogs[0].dateAdministered).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
    });
    return { status: 'done', label: dateStr, dateAdministered: matchingLogs[0].dateAdministered };
  }

  const daysUntilTarget = vaccine.daysOld - batchAgeInDays;
  const daysUntilWindowEnd = vaccine.windowEnd - batchAgeInDays;

  // Only truly overdue once the entire recommended window has passed
  if (daysUntilWindowEnd < 0) {
    return { status: 'overdue', label: 'OVERDUE' };
  }

  // Within the window — show as "due" (actionable)
  if (daysUntilTarget <= 0) {
    return { status: 'due', label: `Due (window closes D${vaccine.windowEnd})` };
  }

  if (daysUntilTarget <= 3) {
    return { status: 'due', label: `Due in ${daysUntilTarget}d` };
  }

  return { status: 'upcoming', label: `Day ${vaccine.daysOld}–${vaccine.windowEnd}` };
}

export default function HealthPage() {
  const [logs, setLogs] = useState<VaccinationLog[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [tooltipBatch, setTooltipBatch] = useState<Batch | null>(null);
  const [tooltipCell, setTooltipCell] = useState<MatrixCell | null>(null);
  const [formData, setFormData] = useState({
    vaccineType: '',
    dateAdministered: new Date().toISOString().split('T')[0],
    batchId: '',
    dosage: '',
    administeredBy: '',
    batchNo: '',
    notes: '',
    cost: '',
  });

  // Disease & treatment state
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [activeWithdrawals, setActiveWithdrawals] = useState<HealthEvent[]>([]);
  const [healthStats, setHealthStats] = useState<{ activeIssues: number; activeWithdrawals: number; mortalityFromDisease: number } | null>(null);
  const [showDiseaseForm, setShowDiseaseForm] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<HealthEvent | null>(null);
  const [showMatrix, setShowMatrix] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showDiseaseLog, setShowDiseaseLog] = useState(true);
  const [editingLog, setEditingLog] = useState<VaccinationLog | null>(null);
  const [editForm, setEditForm] = useState({
    vaccineType: '', dateAdministered: '', batchId: '', dosage: '', administeredBy: '', notes: '',
  });

  const emptyDiseaseForm = {
    batchId: '', type: 'disease', date: new Date().toISOString().split('T')[0],
    disease: '', symptoms: '', diagnosis: '', treatment: '', dosage: '',
    duration: '', withdrawalPeriod: '', outcome: 'ONGOING', vetName: '', cost: '', notes: '',
  };
  const [diseaseForm, setDiseaseForm] = useState(emptyDiseaseForm);

  useEffect(() => {
    fetchLogs();
    fetchBatches();
    fetchHealthEvents();
  }, []);

  const fetchHealthEvents = async () => {
    try {
      const res = await fetch('/api/health-events?limit=50');
      const data = await res.json();
      setHealthEvents(data.data || []);
      setActiveWithdrawals(data.activeWithdrawals || []);
      setHealthStats(data.stats || null);
    } catch {
      console.error('Failed to load health events');
    }
  };

  const handleDiseaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/health-events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diseaseForm),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Health event logged');
      setDiseaseForm(emptyDiseaseForm);
      setShowDiseaseForm(false);
      fetchHealthEvents();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSubmitting(false); }
  };

  const handleUpdateOutcome = async (eventId: string, outcome: string) => {
    try {
      const res = await fetch('/api/health-events', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, outcome }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`Outcome updated to ${outcome}`);
      setShowUpdateModal(false);
      setSelectedEvent(null);
      fetchHealthEvents();
    } catch { toast.error('Failed to update'); }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this health event?')) return;
    try {
      await fetch('/api/health-events', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      toast.success('Deleted');
      fetchHealthEvents();
    } catch { toast.error('Failed to delete'); }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/health-logs?limit=50');
      const data = await res.json();
      setLogs(data.data || []);
    } catch {
      setError('Failed to load vaccination history');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/batches?status=ACTIVE&limit=50');
      const data = await res.json();
      setBatches(data.data || []);
    } catch {
      console.error('Failed to load batches');
    }
  };

  const openEditLog = (log: VaccinationLog) => {
    setEditingLog(log);
    setEditForm({
      vaccineType: log.vaccineType,
      dateAdministered: new Date(log.dateAdministered).toISOString().split('T')[0],
      batchId: log.batch?.id || '',
      dosage: log.dosage || '',
      administeredBy: log.administeredBy || '',
      notes: log.notes || '',
    });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/health-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaccinationId: editingLog.id,
          vaccineType: editForm.vaccineType,
          dateAdministered: editForm.dateAdministered,
          batchId: editForm.batchId || null,
          dosage: editForm.dosage || null,
          administeredBy: editForm.administeredBy || null,
          notes: editForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Vaccination updated');
      setEditingLog(null);
      fetchLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = (log: VaccinationLog) => {
    toast(`Delete ${log.vaccineType} record?`, {
      description: `${log.batch?.batchNumber || 'All batches'} · ${new Date(log.dateAdministered).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const res = await fetch('/api/health-logs', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ vaccinationId: log.id }),
            });
            if (!res.ok) throw new Error();
            toast.success('Vaccination record deleted');
            fetchLogs();
          } catch {
            toast.error('Failed to delete');
          }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload: any = {
        vaccineType: formData.vaccineType,
        dateAdministered: formData.dateAdministered,
        batchId: formData.batchId || null,
        dosage: formData.dosage || null,
        administeredBy: formData.administeredBy || null,
        batchNo: formData.batchNo || null,
        notes: formData.notes || null,
      };
      if (formData.cost) payload.cost = formData.cost;

      const res = await fetch('/api/health-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to log vaccination');
      }

      setSuccess('Vaccination logged successfully');
      setFormData({
        vaccineType: '',
        dateAdministered: new Date().toISOString().split('T')[0],
        batchId: '',
        dosage: '',
        administeredBy: '',
        batchNo: '',
        notes: '',
        cost: '',
      });
      setShowForm(false);
      fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log vaccination');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build the vaccination matrix data
  const getMatrixData = (batch: Batch): MatrixCell[] => {
    const ageInDays = Math.floor(
      (Date.now() - new Date(batch.startDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    const batchLogs = logs.filter((l) => l.batch?.batchNumber === batch.batchNumber);

    return VACCINE_SCHEDULE.map((vaccine) => {
      const isBooster = vaccine.vaccine.includes('Booster');
      const { status, label, dateAdministered } = getVaccineStatus(vaccine, ageInDays, batchLogs, isBooster);
      return {
        status,
        label,
        dateAdministered,
        supplementNotes: vaccine.supplementNotes,
        vaccine,
      };
    });
  };

  const getCellStyles = (status: CellStatus) => {
    switch (status) {
      case 'done':
        return 'bg-green-50 border-green-200';
      case 'overdue':
        return 'bg-red-50 border-red-200';
      case 'due':
        return 'bg-orange-50 border-orange-200';
      case 'upcoming':
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getCellIcon = (status: CellStatus) => {
    switch (status) {
      case 'done':
        return <CheckCircle size={14} className="text-green-600" />;
      case 'overdue':
        return <AlertTriangle size={14} className="text-red-600" />;
      case 'due':
        return <Clock size={14} className="text-orange-600" />;
      default:
        return null;
    }
  };

  const getCellTextColor = (status: CellStatus) => {
    switch (status) {
      case 'done':
        return 'text-green-700';
      case 'overdue':
        return 'text-red-700 font-semibold';
      case 'due':
        return 'text-orange-700 font-medium';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold">Health & Vaccination</h1>
              <p className="text-gray-500 text-sm mt-1">Vaccination matrix, disease tracking and treatment logs</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowDiseaseForm(true); setDiseaseForm(emptyDiseaseForm); }}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                <Stethoscope size={15} /> Log Disease / Treatment
              </button>
              <button onClick={() => { setShowForm(true); setError(''); setSuccess(''); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                <Syringe size={15} /> Log Vaccination
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Alerts */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle size={18} /> {success}
            </div>
          )}

          {/* Vaccination Matrix */}
          {batches.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <button onClick={() => setShowMatrix(!showMatrix)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Syringe size={20} className="text-green-700" />
                  <h2 className="font-bold text-lg">Vaccination Matrix</h2>
                  <span className="text-xs text-gray-400">{batches.length} active batches</span>
                </div>
                {showMatrix ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </button>
              {showMatrix && (
              <>
              <div className="px-5 pb-3 border-b border-gray-200">
                <p className="text-sm text-gray-500">Click any cell for supplement/vitamin guidance</p>
                <div className="flex flex-wrap gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-300" />
                    Administered
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" />
                    Overdue
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded bg-orange-100 border border-orange-300" />
                    Due / Approaching
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded bg-gray-100 border border-gray-300" />
                    Not yet due
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-max border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                        Batch
                      </th>
                      {VACCINE_SCHEDULE.map((v) => (
                        <th
                          key={v.vaccine}
                          className="px-3 py-3 text-center text-xs font-semibold text-gray-600 border-b border-gray-200 min-w-[110px]"
                        >
                          <div className="leading-tight">
                            <div>{v.vaccine.replace(' Disease', '').replace(' (IBD)', '').replace(' (ND)', '').replace('Infectious Bronchitis (IB)', 'IB')}</div>
                            <div className="text-gray-400 font-normal mt-0.5">D{v.daysOld}–{v.windowEnd}</div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {batches.map((batch) => {
                      const ageInDays = Math.floor(
                        (Date.now() - new Date(batch.startDate).getTime()) / (1000 * 60 * 60 * 24),
                      );
                      const matrixCells = getMatrixData(batch);

                      return (
                        <tr key={batch.id}>
                          <td className="px-4 py-3 border-r border-gray-100 sticky left-0 bg-white z-10">
                            <div className="font-semibold text-sm text-gray-900">{batch.batchNumber}</div>
                            <div className="text-xs text-gray-500">
                              {batch.type} &middot; {ageInDays} days old &middot; {batch.currentCount.toLocaleString()} birds
                            </div>
                          </td>
                          {matrixCells.map((cell, idx) => {
                            const cellKey = `${batch.id}-${cell.vaccine.vaccine}`;

                            return (
                              <td key={idx} className="px-1 py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTooltip(cellKey);
                                    setTooltipBatch(batch);
                                    setTooltipCell(cell);
                                  }}
                                  className={`w-full rounded-md border px-2 py-2 text-center transition-colors cursor-pointer hover:shadow-sm ${getCellStyles(cell.status)}`}
                                >
                                  <div className="flex flex-col items-center gap-0.5">
                                    {getCellIcon(cell.status)}
                                    <span className={`text-xs leading-tight ${getCellTextColor(cell.status)}`}>
                                      {cell.label}
                                    </span>
                                  </div>
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
              )}
            </div>
          )}

          {/* Standard Vaccine Schedule Reference */}
          <div className="bg-white rounded-lg border border-gray-200">
            <button onClick={() => setShowSchedule(!showSchedule)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-green-700" />
                <h2 className="font-bold text-lg">Standard Vaccination Schedule</h2>
              </div>
              {showSchedule ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {showSchedule && (
            <div className="overflow-x-auto border-t border-gray-200">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Vaccine</th>
                    <th className="px-4 py-3 text-left">Age (Days)</th>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                    <th className="px-4 py-3 text-left">Supplement / Vitamin Guidance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {VACCINE_SCHEDULE.map((v) => (
                    <tr key={v.vaccine} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-sm text-gray-900">{v.vaccine}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">Day {v.daysOld}–{v.windowEnd}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{v.method}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 italic">{v.notes}</td>
                      <td className="px-4 py-3 text-sm text-amber-700 max-w-xs">{v.supplementNotes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>

          {/* Vaccination History */}
          <div className="bg-white rounded-lg border border-gray-200">
            <button onClick={() => setShowHistory(!showHistory)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <Syringe size={20} className="text-green-700" />
                <h2 className="font-bold text-lg">Vaccination History</h2>
                {logs.length > 0 && <span className="text-xs text-gray-400">{logs.length} records</span>}
              </div>
              {showHistory ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {showHistory && (
            <div className="overflow-x-auto border-t border-gray-200">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Vaccine</th>
                    <th className="px-4 py-3 text-left">Batch</th>
                    <th className="px-4 py-3 text-left">Dosage</th>
                    <th className="px-4 py-3 text-left">Administered By</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No vaccination records yet. Log your first vaccination above.</td></tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 text-sm">{new Date(log.dateAdministered).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3 font-medium text-sm text-gray-900">{log.vaccineType}</td>
                        <td className="px-4 py-3 text-sm">
                          {log.batch?.batchNumber ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">{log.batch.batchNumber}</Badge>
                          ) : <span className="text-gray-400">All batches</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{log.dosage || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{log.administeredBy || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{log.notes || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditLog(log)} title="Edit"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDeleteLog(log)} title="Delete"
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>

          {/* ===== DISEASE & TREATMENT LOG ===== */}

          {/* Active Withdrawal Warnings */}
          {activeWithdrawals.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={18} className="text-red-600" />
                <span className="font-semibold text-red-900">Active Withdrawal Periods</span>
              </div>
              <div className="space-y-1">
                {activeWithdrawals.map((w) => {
                  const endsDate = w.withdrawalEnds ? new Date(w.withdrawalEnds) : null;
                  const daysLeft = endsDate ? Math.ceil((endsDate.getTime() - Date.now()) / 86400000) : 0;
                  return (
                    <div key={w.id} className="flex items-center justify-between text-sm">
                      <span className="text-red-800">
                        <strong>{w.batch?.batchNumber}</strong> — {w.disease || w.symptoms} treated with {w.treatment || 'medication'}
                      </span>
                      <span className="text-red-700 font-medium">
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Ends today'} · No eggs/meat until {endsDate?.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Disease & Treatment Log Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-5 flex items-center justify-between">
              <button onClick={() => setShowDiseaseLog(!showDiseaseLog)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Stethoscope size={20} className="text-red-700" />
                <h2 className="font-bold text-lg">Disease & Treatment Log</h2>
                {healthStats && healthStats.activeIssues > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{healthStats.activeIssues} active</span>
                )}
                {showDiseaseLog ? <ChevronUp size={18} className="text-gray-400 ml-1" /> : <ChevronDown size={18} className="text-gray-400 ml-1" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowDiseaseForm(true); setDiseaseForm(emptyDiseaseForm); }}
                className="text-sm text-green-700 font-medium hover:underline flex items-center gap-1">
                <Plus size={14} /> Log event
              </button>
            </div>
            {showDiseaseLog && healthEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm border-t">No disease or treatment events logged yet</div>
            ) : showDiseaseLog && (
              <div className="overflow-x-auto border-t border-gray-200">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Batch</th>
                      <th className="px-4 py-3 text-left">Disease / Symptoms</th>
                      <th className="px-4 py-3 text-left">Diagnosis</th>
                      <th className="px-4 py-3 text-left">Treatment</th>
                      <th className="px-4 py-3 text-left">Withdrawal</th>
                      <th className="px-4 py-3 text-left">Outcome</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {healthEvents.map((ev) => {
                      const hasActiveWithdrawal = ev.withdrawalEnds && new Date(ev.withdrawalEnds) > new Date();
                      return (
                        <tr key={ev.id} className={`hover:bg-gray-50 ${hasActiveWithdrawal ? 'bg-red-50/30' : ''}`}>
                          <td className="px-4 py-3 text-sm">{new Date(ev.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</td>
                          <td className="px-4 py-3 text-sm font-medium">{ev.batch?.batchNumber || '—'}</td>
                          <td className="px-4 py-3 text-sm">
                            {ev.disease && <span className="font-medium text-gray-900">{ev.disease}</span>}
                            {ev.disease && ev.symptoms && <br />}
                            {ev.symptoms && <span className="text-gray-500 text-xs">{ev.symptoms}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {ev.diagnosis || <span className="text-gray-300">—</span>}
                            {ev.vetName && <span className="block text-[11px] text-gray-400">Vet: {ev.vetName}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {ev.treatment && <span className="text-gray-800">{ev.treatment}</span>}
                            {ev.dosage && <span className="block text-[11px] text-gray-400">{ev.dosage}</span>}
                            {ev.duration && <span className="block text-[11px] text-gray-400">Duration: {ev.duration}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {ev.withdrawalPeriod ? (
                              <span className={hasActiveWithdrawal ? 'text-red-700 font-semibold' : 'text-gray-500'}>
                                {ev.withdrawalPeriod}d
                                {hasActiveWithdrawal && (
                                  <span className="block text-[11px]">until {new Date(ev.withdrawalEnds!).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</span>
                                )}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${OUTCOME_STYLES[ev.outcome || 'ONGOING'] || 'bg-gray-100 text-gray-600'}`}>
                              {ev.outcome || 'ONGOING'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => { setSelectedEvent(ev); setShowUpdateModal(true); }}
                                className="text-xs px-2 py-1 border rounded hover:bg-gray-50">Update</button>
                              <button onClick={() => handleDeleteEvent(ev.id)}
                                className="text-xs px-2 py-1 text-red-500 hover:text-red-700">✕</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Update Outcome Modal */}
        {showUpdateModal && selectedEvent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-5 border-b flex justify-between">
                <h2 className="font-bold text-lg">Update Outcome</h2>
                <button onClick={() => setShowUpdateModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-600 mb-1">{selectedEvent.disease || selectedEvent.symptoms}</p>
                <p className="text-xs text-gray-400 mb-4">{selectedEvent.batch?.batchNumber} — logged {new Date(selectedEvent.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</p>
                <div className="space-y-2">
                  {OUTCOMES.map((o) => (
                    <button key={o} onClick={() => handleUpdateOutcome(selectedEvent.id, o)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${selectedEvent.outcome === o ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${o === 'RECOVERED' ? 'bg-green-500' : o === 'RECOVERING' ? 'bg-amber-500' : o === 'ONGOING' ? 'bg-red-500' : 'bg-gray-400'}`} />
                      {o.charAt(0) + o.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Log Disease / Treatment Modal */}
        {showDiseaseForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex justify-between sticky top-0 bg-white rounded-t-xl">
                <h2 className="font-bold text-xl">Log Disease / Treatment</h2>
                <button onClick={() => setShowDiseaseForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleDiseaseSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                    <input type="date" required value={diseaseForm.date}
                      onChange={(e) => setDiseaseForm({ ...diseaseForm, date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Affected *</label>
                    <select required value={diseaseForm.batchId}
                      onChange={(e) => setDiseaseForm({ ...diseaseForm, batchId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select batch...</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.batchNumber} — {b.type} ({b.currentCount} birds)</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Event Type</label>
                    <select value={diseaseForm.type}
                      onChange={(e) => setDiseaseForm({ ...diseaseForm, type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Disease / Condition</label>
                    <select value={diseaseForm.disease}
                      onChange={(e) => setDiseaseForm({ ...diseaseForm, disease: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select or type below...</option>
                      {COMMON_DISEASES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Symptoms Observed *</label>
                  <textarea required rows={2} value={diseaseForm.symptoms}
                    onChange={(e) => setDiseaseForm({ ...diseaseForm, symptoms: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Watery droppings, loss of appetite, drooping wings, respiratory distress..." />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Diagnosis <span className="font-normal text-gray-400">(if vet consulted)</span></label>
                  <input type="text" value={diseaseForm.diagnosis}
                    onChange={(e) => setDiseaseForm({ ...diseaseForm, diagnosis: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Confirmed coccidiosis via lab test" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Treatment Given</label>
                    <input type="text" value={diseaseForm.treatment}
                      onChange={(e) => setDiseaseForm({ ...diseaseForm, treatment: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Amprolium in water" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Dosage</label>
                    <input type="text" value={diseaseForm.dosage}
                      onChange={(e) => setDiseaseForm({ ...diseaseForm, dosage: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 10ml per litre of water" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Duration</label>
                    <input type="text" value={diseaseForm.duration}
                      onChange={(e) => setDiseaseForm({ ...diseaseForm, duration: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 5 days" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Withdrawal (days)
                      <Info size={12} className="inline ml-1 text-gray-400" />
                    </label>
                    <input type="number" min="0" value={diseaseForm.withdrawalPeriod}
                      onChange={(e) => setDiseaseForm({ ...diseaseForm, withdrawalPeriod: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 7" />
                    <p className="text-[11px] text-gray-400 mt-0.5">No eggs/meat during this period</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Outcome</label>
                    <select value={diseaseForm.outcome}
                      onChange={(e) => setDiseaseForm({ ...diseaseForm, outcome: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {OUTCOMES.map((o) => <option key={o} value={o}>{o.charAt(0) + o.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                </div>

                {diseaseForm.withdrawalPeriod && parseInt(diseaseForm.withdrawalPeriod) > 0 && diseaseForm.date && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <ShieldAlert size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">
                      Withdrawal period: <strong>{diseaseForm.withdrawalPeriod} days</strong>.
                      No eggs or meat from this batch until{' '}
                      <strong>
                        {new Date(new Date(diseaseForm.date).getTime() + parseInt(diseaseForm.withdrawalPeriod) * 86400000)
                          .toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </strong>.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Vet Name</label>
                    <input type="text" value={diseaseForm.vetName}
                      onChange={(e) => setDiseaseForm({ ...diseaseForm, vetName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Vet / consultant name" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Treatment Cost (KSh)</label>
                    <input type="number" step="0.01" value={diseaseForm.cost}
                      onChange={(e) => setDiseaseForm({ ...diseaseForm, cost: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="0" />
                    <p className="text-[11px] text-gray-400 mt-0.5">Auto-creates expense record</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Notes</label>
                  <textarea value={diseaseForm.notes} rows={2}
                    onChange={(e) => setDiseaseForm({ ...diseaseForm, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Number of birds affected, mortality count, observations..." />
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Log Health Event'}
                  </button>
                  <button type="button" onClick={() => setShowDiseaseForm(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Vaccine Cell Info Modal (replaces inline tooltip) */}
        {activeTooltip && tooltipCell && tooltipBatch && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setActiveTooltip(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{tooltipCell.vaccine.vaccine}</h3>
                  <p className="text-sm text-gray-500">{tooltipBatch.batchNumber} &middot; Recommended: Day {tooltipCell.vaccine.daysOld}–{tooltipCell.vaccine.windowEnd}</p>
                </div>
                <button onClick={() => setActiveTooltip(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  {getCellIcon(tooltipCell.status)}
                  <span className={`text-sm font-medium ${getCellTextColor(tooltipCell.status)}`}>
                    {tooltipCell.status === 'done' ? `Administered on ${tooltipCell.label}` :
                     tooltipCell.status === 'overdue' ? 'Overdue — should have been given' :
                     tooltipCell.status === 'due' ? tooltipCell.label :
                     `Recommended window: Day ${tooltipCell.vaccine.daysOld}–${tooltipCell.vaccine.windowEnd}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Method:</span>
                    <p className="text-gray-600">{tooltipCell.vaccine.method}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Notes:</span>
                    <p className="text-gray-600">{tooltipCell.vaccine.notes}</p>
                  </div>
                </div>

                {/* Dosage guidance */}
                {DOSAGE_GUIDE[tooltipCell.vaccine.vaccine] && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-800 mb-1">Dosage & Administration</p>
                    <p className="text-xs text-blue-700 leading-relaxed">{DOSAGE_GUIDE[tooltipCell.vaccine.vaccine]}</p>
                  </div>
                )}

                {/* Supplement guidance */}
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-amber-800 font-medium text-xs mb-1">
                    <Info size={12} /> Supplement & Vitamin Guidance
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">{tooltipCell.supplementNotes}</p>
                </div>
              </div>

              <div className="p-5 border-t flex gap-3">
                {(tooltipCell.status === 'overdue' || tooltipCell.status === 'due' || tooltipCell.status === 'upcoming') && (
                  <button
                    onClick={() => {
                      const vaccineType = tooltipCell.vaccine.vaccine;
                      const dosageHint = DOSAGE_GUIDE[vaccineType] || '';
                      setFormData({
                        vaccineType,
                        dateAdministered: new Date().toISOString().split('T')[0],
                        batchId: tooltipBatch.id,
                        dosage: '',
                        administeredBy: '',
                        batchNo: '',
                        notes: dosageHint ? `Recommended: ${tooltipCell.vaccine.method}` : '',
                        cost: '',
                      });
                      setActiveTooltip(null);
                      setShowForm(true);
                    }}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Syringe size={16} /> Log This Vaccination
                  </button>
                )}
                <button onClick={() => setActiveTooltip(null)}
                  className={`${tooltipCell.status === 'done' ? 'flex-1' : ''} py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200`}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Log Vaccination Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold">Log Vaccination</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">{error}</div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Vaccine Type *</label>
                    <select
                      required
                      value={formData.vaccineType}
                      onChange={(e) => setFormData({ ...formData, vaccineType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    >
                      <option value="">Select vaccine...</option>
                      {VACCINE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date Administered *</label>
                    <input
                      type="date"
                      required
                      value={formData.dateAdministered}
                      onChange={(e) => setFormData({ ...formData, dateAdministered: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Batch <span className="font-normal text-gray-400">(optional -- leave blank for all batches)</span></label>
                  <select
                    value={formData.batchId}
                    onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  >
                    <option value="">All active batches</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>{b.batchNumber} -- {b.type} ({b.currentCount.toLocaleString()} birds)</option>
                    ))}
                  </select>
                </div>

                {/* Dosage guidance panel */}
                {formData.vaccineType && DOSAGE_GUIDE[formData.vaccineType] && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-800 mb-1">Recommended Dosage & Administration</p>
                    <p className="text-xs text-blue-700 leading-relaxed">{DOSAGE_GUIDE[formData.vaccineType]}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Dosage</label>
                    <input
                      type="text"
                      placeholder="e.g. 0.5ml per bird"
                      value={formData.dosage}
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Administered By</label>
                    <input
                      type="text"
                      placeholder="Staff / Vet name"
                      value={formData.administeredBy}
                      onChange={(e) => setFormData({ ...formData, administeredBy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Vaccine Batch No.</label>
                    <input
                      type="text"
                      placeholder="Manufacturer batch number"
                      value={formData.batchNo}
                      onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Cost (KSh)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Vaccine cost"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">Auto-creates expense record</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="Any observations..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? 'Saving...' : 'Log Vaccination'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT VACCINATION MODAL */}
        {editingLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold text-xl">Edit Vaccination Record</h2>
                <button onClick={() => setEditingLog(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditSave} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vaccine *</label>
                  <input type="text" required value={editForm.vaccineType}
                    onChange={(e) => setEditForm({ ...editForm, vaccineType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                    <input type="date" required value={editForm.dateAdministered}
                      onChange={(e) => setEditForm({ ...editForm, dateAdministered: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Batch</label>
                    <select value={editForm.batchId}
                      onChange={(e) => setEditForm({ ...editForm, batchId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">All batches</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.batchNumber}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Dosage</label>
                    <input type="text" value={editForm.dosage}
                      onChange={(e) => setEditForm({ ...editForm, dosage: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. 1 drop per bird" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Administered By</label>
                    <input type="text" value={editForm.administeredBy}
                      onChange={(e) => setEditForm({ ...editForm, administeredBy: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Name or role" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="Any observations..." />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => setEditingLog(null)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
