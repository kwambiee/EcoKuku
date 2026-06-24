'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button, Badge } from '@ecokuku/ui';
import { Plus, Syringe, Calendar, CheckCircle, Clock, AlertTriangle, Info, X } from 'lucide-react';

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
  batch?: { batchNumber: string };
}

interface VaccineScheduleItem {
  vaccine: string;
  daysOld: number;
  method: string;
  notes: string;
  supplementNotes: string;
}

// Standard poultry vaccination schedule (days of age) — sorted by daysOld for matrix columns
const VACCINE_SCHEDULE: VaccineScheduleItem[] = [
  { vaccine: "Marek's Disease", daysOld: 1, method: 'Subcutaneous injection', notes: 'At hatchery, day 1 only', supplementNotes: 'Usually done at hatchery. Ensure chicks have glucose water available' },
  { vaccine: 'Newcastle Disease (ND)', daysOld: 7, method: 'Eye drop / Drinking water', notes: 'First dose', supplementNotes: 'Give multivitamins in drinking water 2 days before and 3 days after vaccination to reduce stress' },
  { vaccine: 'Coccidiosis', daysOld: 7, method: 'Oral / Feed', notes: 'Or use medicated starter feed', supplementNotes: 'Probiotics in feed 3 days after to restore gut flora. Avoid coccidiostat in feed if using vaccine' },
  { vaccine: 'Infectious Bronchitis (IB)', daysOld: 10, method: 'Eye drop / Spray', notes: 'Optional based on area risk', supplementNotes: 'Vitamin C in water to reduce respiratory stress' },
  { vaccine: 'Gumboro (IBD)', daysOld: 14, method: 'Drinking water', notes: 'First dose', supplementNotes: 'Vitamin E and selenium supplement to boost immune response' },
  { vaccine: 'ND Booster', daysOld: 21, method: 'Drinking water', notes: 'Booster', supplementNotes: 'Multivitamins in water 2 days before and after' },
  { vaccine: 'Gumboro Booster', daysOld: 28, method: 'Drinking water', notes: 'Booster', supplementNotes: 'Electrolytes in water to reduce vaccination stress' },
  { vaccine: 'Fowl Pox', daysOld: 42, method: 'Wing web stab', notes: 'One-time', supplementNotes: 'Vitamin A supplement to support skin healing at injection site' },
];

const DOSAGE_GUIDE: Record<string, string> = {
  'Newcastle Disease (ND)': 'Eye drop: 1 drop per bird | Drinking water: dissolve 1 vial (1000 doses) in clean water for 1000 birds. Let birds drink within 2 hours.',
  'Gumboro (IBD)': 'Drinking water: dissolve 1 vial in clean, chlorine-free water. For 1000 birds use approx 20-40 litres. Withhold water 1-2 hours before.',
  'Fowl Pox': 'Wing web stab: dip applicator in reconstituted vaccine, stab through wing web. Use proper twin-needle applicator.',
  "Marek's Disease": 'Subcutaneous injection: 0.2ml per chick at the back of the neck. Typically done at hatchery on day 1.',
  'Infectious Bronchitis (IB)': 'Eye drop: 1 drop per bird | Spray: reconstitute in distilled water, spray as fine mist over birds in enclosed area.',
  'Coccidiosis': 'Oral/Feed: mix vaccine with feed or spray on feed. Ensure even distribution. 1 vial per manufacturer instruction per flock size.',
  'ND Booster': 'Drinking water: same as Newcastle first dose. Dissolve in clean water, let birds drink within 2 hours. Withhold water 1-2 hours before.',
  'Gumboro Booster': 'Drinking water: same as first Gumboro dose. Use chlorine-free water. Withhold water 1-2 hours before.',
  'Salmonella': 'Drinking water or spray: follow manufacturer instructions. Usually 1 vial per 1000-2000 birds.',
  'Avian Influenza (AI)': 'Subcutaneous or intramuscular injection: 0.5ml per bird. Follow veterinary guidance.',
};

// Keywords used for fuzzy matching vaccination logs to scheduled vaccines
const VACCINE_MATCH_KEYWORDS: Record<string, string[]> = {
  "Marek's Disease": ['MAREK'],
  'Newcastle Disease (ND)': ['NEWCASTLE'],
  'Coccidiosis': ['COCCIDIOSIS', 'COCCI'],
  'Infectious Bronchitis (IB)': ['BRONCHITIS', 'IB'],
  'Gumboro (IBD)': ['GUMBORO', 'IBD'],
  'ND Booster': ['NEWCASTLE', 'ND'],
  'Gumboro Booster': ['GUMBORO', 'IBD'],
  'Fowl Pox': ['FOWL POX', 'POX'],
};

const VACCINE_TYPES = [
  'Newcastle Disease (ND)',
  'Gumboro (IBD)',
  'Fowl Pox',
  "Marek's Disease",
  'Infectious Bronchitis (IB)',
  'Coccidiosis',
  'Salmonella',
  'Avian Influenza (AI)',
  'Other',
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

  const daysUntilDue = vaccine.daysOld - batchAgeInDays;

  if (daysUntilDue < 0) {
    return { status: 'overdue', label: 'OVERDUE' };
  }

  if (daysUntilDue <= 3) {
    if (daysUntilDue === 0) {
      return { status: 'due', label: 'Due today' };
    }
    return { status: 'due', label: `Due in ${daysUntilDue}d` };
  }

  return { status: 'upcoming', label: `Day ${vaccine.daysOld}` };
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

  useEffect(() => {
    fetchLogs();
    fetchBatches();
  }, []);

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
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Health & Vaccination</h1>
              <p className="text-gray-600 mt-1">Track vaccinations and health events per batch</p>
            </div>
            <Button onClick={() => { setShowForm(true); setError(''); setSuccess(''); }} className="flex items-center gap-2 bg-green-800 text-white hover:bg-green-700">
              <Plus size={18} /> Log Vaccination
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Alerts */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle size={18} /> {success}
            </div>
          )}

          {/* Vaccination Matrix */}
          {batches.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-5 border-b border-gray-200">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Syringe size={20} className="text-green-700" /> Vaccination Matrix
                </h2>
                <p className="text-sm text-gray-500 mt-1">Click any cell for supplement/vitamin guidance</p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs">
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
                <table className="w-full border-collapse">
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
                            <div className="text-gray-400 font-normal mt-0.5">Day {v.daysOld}</div>
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
            </div>
          )}

          {/* Standard Vaccine Schedule Reference */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Calendar size={20} className="text-green-700" /> Standard Vaccination Schedule
              </h2>
              <p className="text-sm text-gray-500 mt-1">Reference guide for poultry vaccination timing</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
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
                      <td className="px-4 py-3 text-sm text-gray-700">Day {v.daysOld}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{v.method}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 italic">{v.notes}</td>
                      <td className="px-4 py-3 text-sm text-amber-700 max-w-xs">{v.supplementNotes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vaccination History */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Syringe size={20} className="text-green-700" /> Vaccination History
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Vaccine</th>
                    <th className="px-4 py-3 text-left">Batch</th>
                    <th className="px-4 py-3 text-left">Dosage</th>
                    <th className="px-4 py-3 text-left">Administered By</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No vaccination records yet. Log your first vaccination above.</td></tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Vaccine Cell Info Modal (replaces inline tooltip) */}
        {activeTooltip && tooltipCell && tooltipBatch && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setActiveTooltip(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{tooltipCell.vaccine.vaccine}</h3>
                  <p className="text-sm text-gray-500">{tooltipBatch.batchNumber} &middot; Day {tooltipCell.vaccine.daysOld}</p>
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
                     `Scheduled for day ${tooltipCell.vaccine.daysOld}`}
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
      </main>
    </div>
  );
}
