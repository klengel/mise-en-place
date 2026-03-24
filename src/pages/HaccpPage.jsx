import { db } from '@/lib/db';
import { useState, useEffect } from 'react';
import { Save, Printer, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const SECTIONS = [
  {
    key: 'receipt',
    title: 'Receipt',
    description: 'Incoming goods check',
    columns: ['Date', 'Product', 'Temp (°C)', 'Quality OK', 'Packaging intact', 'Label correct', 'Use-by date OK', 'Initials', 'Action taken'],
    columnTypes: ['date', 'text', 'number', 'yesno', 'yesno', 'yesno', 'yesno', 'text', 'text'],
    rows: [
      { label: 'Dairy', sublabel: '≤ 7°C' },
      { label: 'Meat & meat products', sublabel: '≤ 7°C' },
      { label: 'Cut fruit/veg (AGF)', sublabel: '≤ 7°C' },
      { label: 'Poultry', sublabel: '≤ 4°C' },
      { label: 'Game & fowl', sublabel: '≤ 7°C' },
      { label: 'Fish, shellfish & seafood', sublabel: '≤ 7°C' },
      { label: 'Frozen products', sublabel: '≤ -15°C' },
    ],
  },
  {
    key: 'storage',
    title: 'Storage',
    description: 'Refrigerator & freezer temperatures',
    columns: ['Date', 'Temp (°C)', 'Products covered', 'Use-by date OK', 'Initials', 'Action taken'],
    columnTypes: ['date', 'number', 'yesno', 'yesno', 'text', 'text'],
    rows: [
      { label: 'Fridge 1', sublabel: '≤ 7°C' },
      { label: 'Fridge 2', sublabel: '≤ 7°C' },
      { label: 'Fridge 3', sublabel: '≤ 7°C' },
      { label: 'Fridge 4', sublabel: '≤ 7°C' },
      { label: 'Fridge 5', sublabel: '≤ 7°C' },
      { label: 'Freezer 1', sublabel: '≤ -18°C' },
      { label: 'Freezer 2', sublabel: '≤ -18°C' },
    ],
  },
  {
    key: 'preparation',
    title: 'Preparation',
    description: 'Cooking & assembly temperatures',
    columns: ['Date', 'Product', 'Temp (°C)', 'Initials', 'Action taken'],
    columnTypes: ['date', 'text', 'number', 'text', 'text'],
    rows: [
      { label: 'Hot products at end of heating', sublabel: '≥ 75°C' },
      { label: 'Cold products after assembly', sublabel: '≤ 7°C, 2 days shelf life' },
      { label: 'Hot products at start of assembly', sublabel: '≥ 60°C' },
    ],
  },
  {
    key: 'cooling',
    title: 'Cooling',
    description: 'Cool-down monitoring',
    columns: ['Date', 'Product', 'Temp (°C)', 'Initials', 'Action taken'],
    columnTypes: ['date', 'text', 'number', 'text', 'text'],
    rows: [
      { label: 'End of cooling', sublabel: '≤ 7°C within 5 hours' },
    ],
  },
  {
    key: 'reheating',
    title: 'Reheating',
    description: 'Reheating temperature checks',
    columns: ['Date', 'Product', 'Temp (°C)', 'Initials', 'Action taken'],
    columnTypes: ['date', 'text', 'number', 'text', 'text'],
    rows: [
      { label: 'End of reheating within 1 hour', sublabel: '≥ 60°C' },
      { label: 'End of reheating without time limit', sublabel: '≥ 75°C' },
    ],
  },
  {
    key: 'serving',
    title: 'Serving',
    description: 'Service temperature checks',
    columns: ['Date', 'Product', 'Temp (°C)', 'Initials', 'Action taken'],
    columnTypes: ['date', 'text', 'number', 'text', 'text'],
    rows: [
      { label: 'Hot serving', sublabel: '≥ 60°C *' },
      { label: 'Cold serving', sublabel: '≤ 7°C' },
    ],
  },
];

function YesNoCell({ value, onChange }) {
  return (
    <div className="flex gap-1 justify-center">
      <button onClick={() => onChange('yes')}
        className={`px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${value === 'yes' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground hover:bg-green-100'}`}>
        Yes
      </button>
      <button onClick={() => onChange('no')}
        className={`px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${value === 'no' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:bg-red-100'}`}>
        No
      </button>
    </div>
  );
}

function HaccpSection({ section, data, onChange }) {
  function getCellValue(rowIdx, colIdx) {
    return data?.[section.key]?.[rowIdx]?.[colIdx] ?? '';
  }
  function setCellValue(rowIdx, colIdx, val) {
    onChange(section.key, rowIdx, colIdx, val);
  }

  return (
    <div className="mb-8">
      <div className="mb-2">
        <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
        <p className="text-xs text-muted-foreground">{section.description}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2 font-semibold text-foreground border-r border-border w-36">Category</th>
              {section.columns.map((col, i) => (
                <th key={i} className="text-center px-2 py-2 font-semibold text-foreground border-r border-border last:border-r-0 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2 border-r border-border">
                  <p className="font-medium text-foreground">{row.label}</p>
                  {row.sublabel && <p className="text-muted-foreground">{row.sublabel}</p>}
                </td>
                {section.columns.map((_, colIdx) => (
                  <td key={colIdx} className="px-1 py-1 border-r border-border last:border-r-0">
                    {section.columnTypes[colIdx] === 'yesno' ? (
                      <YesNoCell value={getCellValue(rowIdx, colIdx)} onChange={val => setCellValue(rowIdx, colIdx, val)} />
                    ) : (
                      <Input
                        type={section.columnTypes[colIdx] === 'number' ? 'number' : section.columnTypes[colIdx] === 'date' ? 'date' : 'text'}
                        value={getCellValue(rowIdx, colIdx)}
                        onChange={e => setCellValue(rowIdx, colIdx, e.target.value)}
                        className="h-7 text-xs border-0 bg-transparent focus-visible:ring-1 min-w-[70px]"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HaccpPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [week, setWeek] = useState(getWeekNumber(now));
  const [data, setData] = useState({});
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadRecord(); }, [year, week]);

  async function loadRecord() {
    setLoading(true);
    const records = await db.entities.HaccpRecord.filter({ year, week_number: week });
    if (records.length > 0) {
      setData(records[0].data || {});
      setRecordId(records[0].id);
    } else {
      setData({});
      setRecordId(null);
    }
    setLoading(false);
  }

  function handleCellChange(sectionKey, rowIdx, colIdx, val) {
    setData(prev => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        [rowIdx]: {
          ...(prev[sectionKey]?.[rowIdx] || {}),
          [colIdx]: val,
        },
      },
    }));
  }

  async function saveRecord() {
    setSaving(true);
    const payload = { year, week_number: week, data };
    if (recordId) {
      await db.entities.HaccpRecord.update(recordId, payload);
    } else {
      const created = await db.entities.HaccpRecord.create(payload);
      setRecordId(created.id);
    }

    // Also save to Files
    await db.entities.SavedFile.create({
      title: `HACCP — Week ${week}, ${year}`,
      type: 'haccp',
      content: { year, week, data },
      file_date: `${year}-W${String(week).padStart(2, '0')}`,
    });

    setSaving(false);
    toast.success('HACCP record saved!');
  }

  function prevWeek() {
    if (week === 1) { setWeek(52); setYear(y => y - 1); }
    else setWeek(w => w - 1);
  }
  function nextWeek() {
    if (week === 52) { setWeek(1); setYear(y => y + 1); }
    else setWeek(w => w + 1);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto print:p-4">
      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">HACCP Weekly Registration — Week {week}, {year}</h1>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">HACCP</h1>
          <p className="text-muted-foreground text-sm">Weekly food safety registrations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button onClick={saveRecord} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </div>

      {/* Week selector */}
      <div className="flex items-center gap-4 mb-6 bg-card border border-border rounded-xl px-4 py-3 print:hidden">
        <Button variant="outline" size="sm" onClick={prevWeek}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="font-semibold text-sm flex-1 text-center">Week {week} — {year}</span>
        <Button variant="outline" size="sm" onClick={nextWeek}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      <p className="text-xs text-muted-foreground mb-6 print:hidden">
        * When dishes are served immediately after preparation or reheating, no temperature registration is required.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        SECTIONS.map(section => (
          <HaccpSection key={section.key} section={section} data={data} onChange={handleCellChange} />
        ))
      )}
    </div>
  );
}
