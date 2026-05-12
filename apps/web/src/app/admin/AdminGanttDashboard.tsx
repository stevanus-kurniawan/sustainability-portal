'use client';

import {
  AlertTriangle,
  Award,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  GripHorizontal,
  Pencil,
  Plus,
  Scale,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Select,
} from '@/components/ui';
import {
  adminCertificationsList,
  adminLicensesList,
  adminPlanningAssigneesList,
  adminPlanningActivitiesList,
  adminPlanningActivityCreate,
  adminPlanningActivityDelete,
  adminPlanningActivityUpdate,
  type PlanningActivityItem,
  type PlanningActivityStatus,
  type PlanningAssigneeOption,
} from '@/lib/admin-api';
import { cn } from '@/lib/utils';

type GanttView = 'month' | 'quarter' | 'year';

/** Non-expired items with expiry within this window (≈2 months). */
const EXPIRING_SOON_DAYS = 60;

type ExpiryDashboardRow = {
  kind: 'certification' | 'license';
  id: number;
  name: string;
  /** Operational Unit name; "-" when missing. */
  plant: string;
  expiryDate: string | null;
  status: string;
};

function operationalUnitName(attributes: Record<string, unknown>): string {
  const operationalUnit = attributes.operationalUnit as { data?: unknown } | undefined;
  const data = operationalUnit?.data;
  if (!data || typeof data !== 'object') return '-';
  const inner = data as { attributes?: Record<string, unknown> };
  const name = inner.attributes?.name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  return '-';
}

function parseExpiryList(
  res: { data?: unknown },
  kind: 'certification' | 'license'
): ExpiryDashboardRow[] {
  const raw = res.data;
  if (!Array.isArray(raw)) return [];
  const out: ExpiryDashboardRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as { id?: unknown; attributes?: Record<string, unknown> };
    const id = r.id;
    const a = r.attributes;
    if (typeof id !== 'number' || !a) continue;
    const name = typeof a.name === 'string' ? a.name : '';
    const expiryDate = typeof a.expiryDate === 'string' ? a.expiryDate : null;
    const status = typeof a.status === 'string' ? a.status : '';
    out.push({ kind, id, name, plant: operationalUnitName(a), expiryDate, status });
  }
  return out;
}

function formatExpiryLabel(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return iso;
  }
}

const STATUS_OPTIONS: { value: PlanningActivityStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'RESCHEDULE', label: 'Reschedule' },
];

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function exclusiveEndDay(d: Date): Date {
  return addDays(d, 1);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

function endOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3 + 3, 0);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31);
}

function dayCountInclusive(a: Date, b: Date): number {
  const x = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const y = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((y - x) / 86400000) + 1;
}

function periodBounds(view: GanttView, cursor: Date): { start: Date; end: Date; title: string } {
  if (view === 'month') {
    const s = startOfMonth(cursor);
    const e = endOfMonth(cursor);
    return {
      start: s,
      end: e,
      title: cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
    };
  }
  if (view === 'quarter') {
    const q = Math.floor(cursor.getMonth() / 3) + 1;
    return {
      start: startOfQuarter(cursor),
      end: endOfQuarter(cursor),
      title: `Q${q} ${cursor.getFullYear()}`,
    };
  }
  return {
    start: startOfYear(cursor),
    end: endOfYear(cursor),
    title: String(cursor.getFullYear()),
  };
}

function barPosition(
  startStr: string,
  endStr: string,
  rangeStart: Date,
  rangeEndInclusive: Date
): { leftPct: number; widthPct: number; visible: boolean } {
  const rs = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime();
  const re = exclusiveEndDay(
    new Date(rangeEndInclusive.getFullYear(), rangeEndInclusive.getMonth(), rangeEndInclusive.getDate())
  ).getTime();
  const totalMs = re - rs;
  if (totalMs <= 0) return { leftPct: 0, widthPct: 0, visible: false };

  const sMs = new Date(
    parseYmd(startStr).getFullYear(),
    parseYmd(startStr).getMonth(),
    parseYmd(startStr).getDate()
  ).getTime();
  const eEx = exclusiveEndDay(parseYmd(endStr)).getTime();

  const clipL = Math.max(sMs, rs);
  const clipR = Math.min(eEx, re);
  if (clipR <= clipL) return { leftPct: 0, widthPct: 0, visible: false };

  return {
    leftPct: ((clipL - rs) / totalMs) * 100,
    widthPct: ((clipR - clipL) / totalMs) * 100,
    visible: true,
  };
}

function columnSpec(
  view: GanttView,
  rangeStart: Date,
  rangeEndInclusive: Date
): { count: number; labelAt: (i: number) => string } {
  const days = dayCountInclusive(rangeStart, rangeEndInclusive);
  if (view === 'month') {
    return {
      count: days,
      labelAt: (i) => {
        const d = addDays(rangeStart, i);
        return String(d.getDate());
      },
    };
  }
  if (view === 'quarter') {
    const weeks = Math.max(1, Math.ceil(days / 7));
    return {
      count: weeks,
      labelAt: (i) => {
        const d = addDays(rangeStart, i * 7);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      },
    };
  }
  return {
    count: 12,
    labelAt: (i) =>
      new Date(rangeStart.getFullYear(), i, 1).toLocaleString(undefined, { month: 'short' }),
  };
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const as = new Date(
    parseYmd(aStart).getFullYear(),
    parseYmd(aStart).getMonth(),
    parseYmd(aStart).getDate()
  ).getTime();
  const ae = exclusiveEndDay(parseYmd(aEnd)).getTime();
  const bs = new Date(
    parseYmd(bStart).getFullYear(),
    parseYmd(bStart).getMonth(),
    parseYmd(bStart).getDate()
  ).getTime();
  const be = exclusiveEndDay(parseYmd(bEnd)).getTime();
  return as < be && bs < ae;
}

function computeImpactMessages(items: PlanningActivityItem[]): string[] {
  const list = items.map((it) => ({
    desc: it.attributes.description.slice(0, 60) + (it.attributes.description.length > 60 ? '…' : ''),
    assigneeLabel: it.attributes.assignee,
    assigneeAdminId: it.attributes.assigneeAdminId ?? null,
    start: it.attributes.startDate,
    end: it.attributes.endDate,
  }));
  const messages: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.assigneeAdminId) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (!b.assigneeAdminId || b.assigneeAdminId !== a.assigneeAdminId) continue;
      if (rangesOverlap(a.start, a.end, b.start, b.end)) {
        messages.push(
          `Assignee "${a.assigneeLabel}": "${a.desc}" overlaps "${b.desc}".`
        );
      }
    }
  }
  return messages;
}

function statusBarClass(status: PlanningActivityStatus): string {
  switch (status) {
    case 'PENDING':
      return 'border-2 border-dashed border-steel/60 bg-surface text-steel grayscale';
    case 'IN_PROGRESS':
      return 'border border-primary/40 bg-primary/20 text-charcoal';
    case 'COMPLETE':
      return 'border border-border-medium bg-emerald-600/15 text-charcoal opacity-80';
    case 'RESCHEDULE':
      return 'border-2 border-amber-500/70 bg-amber-500/10 text-charcoal';
    default:
      return 'border border-border-medium bg-light text-charcoal';
  }
}

export function AdminGanttDashboard() {
  const [items, setItems] = useState<PlanningActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<GanttView>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlanningActivityItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [fDescription, setFDescription] = useState('');
  const [fAssigneeAdminId, setFAssigneeAdminId] = useState('');
  const [assigneeOptions, setAssigneeOptions] = useState<PlanningAssigneeOption[]>([]);
  const [fStatus, setFStatus] = useState<PlanningActivityStatus>('PENDING');
  const [fStart, setFStart] = useState('');
  const [fEnd, setFEnd] = useState('');
  const [fProgress, setFProgress] = useState(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    startClientX: number;
    origStart: string;
    origEnd: string;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: number; start: string; end: string } | null>(null);

  const [expiryLoading, setExpiryLoading] = useState(true);
  const [expiringSoonRows, setExpiringSoonRows] = useState<ExpiryDashboardRow[]>([]);
  const [expiredRows, setExpiredRows] = useState<ExpiryDashboardRow[]>([]);

  const { start: periodStart, end: periodEnd, title: periodTitle } = useMemo(
    () => periodBounds(view, cursor),
    [view, cursor]
  );

  const cols = useMemo(
    () => columnSpec(view, periodStart, periodEnd),
    [view, periodStart, periodEnd]
  );

  const impactMessages = useMemo(() => computeImpactMessages(items), [items]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const from = formatYmd(periodStart);
      const to = formatYmd(periodEnd);
      const res = await adminPlanningActivitiesList({ from, to });
      setItems(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activities');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminPlanningAssigneesList();
        if (!cancelled) setAssigneeOptions(res.data ?? []);
      } catch {
        if (!cancelled) setAssigneeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setExpiryLoading(true);
      try {
        const [cSoon, lSoon, cExp, lExp] = await Promise.all([
          adminCertificationsList({
            page: 1,
            pageSize: 500,
            contentVersion: 'V2',
            expiringWithinDays: EXPIRING_SOON_DAYS,
          }),
          adminLicensesList({
            page: 1,
            pageSize: 500,
            contentVersion: 'V2',
            expiringWithinDays: EXPIRING_SOON_DAYS,
          }),
          adminCertificationsList({ page: 1, pageSize: 500, contentVersion: 'V2', status: 'EXPIRED' }),
          adminLicensesList({ page: 1, pageSize: 500, contentVersion: 'V2', expiredByDate: true }),
        ]);
        if (cancelled) return;
        const soon = [
          ...parseExpiryList(cSoon, 'certification'),
          ...parseExpiryList(lSoon, 'license'),
        ].sort((a, b) => {
          const ea = a.expiryDate || '';
          const eb = b.expiryDate || '';
          return ea.localeCompare(eb);
        });
        const expired = [
          ...parseExpiryList(cExp, 'certification'),
          ...parseExpiryList(lExp, 'license').map((row) => ({ ...row, status: 'EXPIRED' })),
        ].sort((a, b) => {
          const ea = a.expiryDate || '';
          const eb = b.expiryDate || '';
          return eb.localeCompare(ea);
        });
        setExpiringSoonRows(soon);
        setExpiredRows(expired);
      } catch {
        if (!cancelled) {
          setExpiringSoonRows([]);
          setExpiredRows([]);
        }
      } finally {
        if (!cancelled) setExpiryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const assigneeSelectOptions = useMemo(() => {
    return assigneeOptions.map((a) => {
      const label = (a.name || '').trim() || a.email;
      return {
        value: a.id,
        label: `${label} (${a.role})`,
      };
    });
  }, [assigneeOptions]);

  const openCreate = () => {
    setEditing(null);
    setFDescription('');
    setFAssigneeAdminId('');
    setFStatus('PENDING');
    setFStart(formatYmd(periodStart));
    setFEnd(formatYmd(addDays(periodStart, Math.min(6, dayCountInclusive(periodStart, periodEnd) - 1))));
    setFProgress(0);
    setFormOpen(true);
  };

  const openEdit = (it: PlanningActivityItem) => {
    const a = it.attributes;
    setEditing(it);
    setFDescription(a.description);
    setFAssigneeAdminId(a.assigneeAdminId ?? '');
    setFStatus(a.status);
    setFStart(a.startDate.slice(0, 10));
    setFEnd(a.endDate.slice(0, 10));
    setFProgress(a.progressPercent ?? 0);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const submitForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        description: fDescription.trim(),
        status: fStatus,
        startDate: fStart,
        endDate: fEnd,
        ...(fStatus === 'IN_PROGRESS' ? { progressPercent: Math.min(100, Math.max(0, fProgress)) } : {}),
      };
      if (!body.description) {
        setError('Description is required.');
        setSaving(false);
        return;
      }
      if (editing) {
        const updated = await adminPlanningActivityUpdate(editing.id, {
          ...body,
          assigneeAdminId: fAssigneeAdminId.trim() ? fAssigneeAdminId.trim() : null,
        });
        setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await adminPlanningActivityCreate({
          ...body,
          ...(fAssigneeAdminId.trim() ? { assigneeAdminId: fAssigneeAdminId.trim() } : {}),
        });
        setItems((prev) => [...prev, created].sort((a, b) => a.attributes.startDate.localeCompare(b.attributes.startDate)));
      }
      closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm('Delete this activity?')) return;
    setSaving(true);
    try {
      await adminPlanningActivityDelete(editing.id);
      setItems((prev) => prev.filter((x) => x.id !== editing.id));
      closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const shiftPeriod = (dir: -1 | 1) => {
    setCursor((c) => {
      const n = new Date(c);
      if (view === 'month') n.setMonth(n.getMonth() + dir);
      else if (view === 'quarter') n.setMonth(n.getMonth() + dir * 3);
      else n.setFullYear(n.getFullYear() + dir);
      return n;
    });
  };

  const applyDragDates = useCallback(async (id: number, start: string, end: string) => {
    try {
      const updated = await adminPlanningActivityUpdate(id, { startDate: start, endDate: end });
      setItems((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update dates');
    }
  }, []);

  const onBarPointerDown = (e: React.PointerEvent, it: PlanningActivityItem) => {
    if (it.attributes.status === 'COMPLETE') return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      id: it.id,
      startClientX: e.clientX,
      origStart: it.attributes.startDate.slice(0, 10),
      origEnd: it.attributes.endDate.slice(0, 10),
    };
    setDragPreview(null);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      const track = trackRef.current;
      if (!d || !track) return;
      const rect = track.getBoundingClientRect();
      const w = rect.width;
      if (w <= 0) return;
      const rs = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate()).getTime();
      const re = exclusiveEndDay(
        new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate())
      ).getTime();
      const totalMs = re - rs;
      const deltaPx = e.clientX - d.startClientX;
      const deltaMs = (deltaPx / w) * totalMs;
      const deltaDays = Math.round(deltaMs / 86400000);
      const os = parseYmd(d.origStart);
      const oe = parseYmd(d.origEnd);
      const ns = addDays(os, deltaDays);
      const ne = addDays(oe, deltaDays);
      setDragPreview({
        id: d.id,
        start: formatYmd(ns),
        end: formatYmd(ne),
      });
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDragPreview(null);
      if (!d) return;
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const w = rect.width;
      if (w <= 0) return;
      const rs = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate()).getTime();
      const re = exclusiveEndDay(
        new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate())
      ).getTime();
      const totalMs = re - rs;
      const deltaPx = e.clientX - d.startClientX;
      const deltaMs = (deltaPx / w) * totalMs;
      const deltaDays = Math.round(deltaMs / 86400000);
      if (deltaDays === 0) return;
      const os = parseYmd(d.origStart);
      const oe = parseYmd(d.origEnd);
      const ns = addDays(os, deltaDays);
      const ne = addDays(oe, deltaDays);
      void applyDragDates(d.id, formatYmd(ns), formatYmd(ne));
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [periodStart, periodEnd, applyDragDates]);

  const displayItemDates = (it: PlanningActivityItem) => {
    if (dragPreview && dragPreview.id === it.id) {
      return { start: dragPreview.start, end: dragPreview.end };
    }
    return {
      start: it.attributes.startDate.slice(0, 10),
      end: it.attributes.endDate.slice(0, 10),
    };
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <Card className="p-0 overflow-hidden border-border-medium shadow-sm">
        <div className="border-b border-border-light bg-light/40 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h2 className="font-heading text-h2 text-charcoal">Planning timeline</h2>
              <p className="text-steel text-sm mt-1 max-w-xl">
                Schedule activities by month, quarter, or year. Drag bars to reschedule; overlapping work for the same
                assignee is highlighted as impact alerts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-medium bg-surface px-3 py-2.5 shadow-sm shrink-0">
              <div className="inline-flex rounded-md border border-border-light bg-light/80 p-0.5">
                {(['month', 'quarter', 'year'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={cn(
                      'rounded px-3 py-1.5 text-sm font-medium capitalize',
                      view === v ? 'bg-primary text-white' : 'text-steel hover:text-charcoal'
                    )}
                  >
                    {v === 'month' ? 'Month' : v === 'quarter' ? 'Quarter' : 'Year'}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={() => shiftPeriod(-1)}>
                Prev
              </Button>
              <Button variant="outline" size="sm" rightIcon={<ChevronRight className="h-4 w-4" />} onClick={() => shiftPeriod(1)}>
                Next
              </Button>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                Add activity
              </Button>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6 space-y-4">
          <div className="flex items-center gap-2 text-charcoal pb-1 border-b border-border-light/80">
            <CalendarDays className="h-5 w-5 text-primary shrink-0" />
            <span className="font-heading text-lg font-semibold">{periodTitle}</span>
          </div>

      {error && (
        <Alert className="mb-4" variant="error">
          {error}
        </Alert>
      )}

      {impactMessages.length > 0 && (
        <Alert className="mb-4" variant="warning">
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Impact alerts (scheduling overlap)</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {impactMessages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
        </Alert>
      )}

      {formOpen && (
        <Card className="border-primary/20 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{editing ? 'Edit activity' : 'New activity'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
              <textarea
                className="input min-h-[88px] w-full resize-y"
                value={fDescription}
                onChange={(e) => setFDescription(e.target.value)}
                placeholder="What will be done?"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Assignee</label>
                <Select
                  options={[
                    { value: '', label: '— Unassigned —' },
                    ...assigneeSelectOptions,
                  ]}
                  value={fAssigneeAdminId}
                  onChange={(e) => setFAssigneeAdminId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
                <Select
                  options={STATUS_OPTIONS}
                  value={fStatus}
                  onChange={(e) => setFStatus(e.target.value as PlanningActivityStatus)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Start date</label>
                <Input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">End date</label>
                <Input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} />
              </div>
            </div>
            {fStatus === 'IN_PROGRESS' && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Progress (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={fProgress}
                  onChange={(e) => setFProgress(Number(e.target.value) || 0)}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void submitForm()} isLoading={saving}>
                {editing ? 'Save changes' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-danger border-danger/40 hover:bg-danger/10"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => void handleDelete()}
                  disabled={saving}
                >
                  Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-steel text-sm py-8">Loading timeline…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No activities in this period"
          description="Add an activity or move to another month, quarter, or year."
          action={
            <Button size="sm" onClick={openCreate}>
              Add activity
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border-light bg-surface overflow-hidden">
            <div className="flex border-b border-border-light bg-light/80">
              <div className="w-[min(40%,280px)] shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-steel">
                Activity
              </div>
              <div
                className="flex-1 min-w-[320px] grid border-l border-border-light"
                style={{ gridTemplateColumns: `repeat(${cols.count}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: cols.count }, (_, i) => (
                  <div
                    key={i}
                    className="px-1 py-2 text-center text-xs text-steel border-l border-border-light first:border-l-0 truncate"
                  >
                    {cols.labelAt(i)}
                  </div>
                ))}
              </div>
            </div>

            <div className="max-h-[min(70vh,720px)] overflow-y-auto">
              {items.map((it, rowIdx) => {
                const a = it.attributes;
                const { start: ds, end: de } = displayItemDates(it);
                const pos = barPosition(ds, de, periodStart, periodEnd);
                const overlapWarn =
                  !!a.assigneeAdminId &&
                  items.some(
                    (other) =>
                      other.id !== it.id &&
                      other.attributes.assigneeAdminId === a.assigneeAdminId &&
                      rangesOverlap(ds, de, other.attributes.startDate, other.attributes.endDate)
                  );
                return (
                  <div
                    key={it.id}
                    className="flex border-b border-border-light min-h-[52px] items-stretch hover:bg-light/50"
                  >
                    <div className="w-[min(40%,280px)] shrink-0 px-3 py-2 flex flex-col justify-center gap-1 border-r border-border-light">
                      <p className="text-sm font-medium text-charcoal line-clamp-2">{a.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-steel">
                        {a.assignee && <span>{a.assignee}</span>}
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 font-medium',
                            a.status === 'COMPLETE' && 'bg-emerald-600/15 text-emerald-800',
                            a.status === 'IN_PROGRESS' && 'bg-primary/15 text-primary',
                            a.status === 'PENDING' && 'bg-steel/10 text-steel',
                            a.status === 'RESCHEDULE' && 'bg-amber-500/15 text-amber-900'
                          )}
                        >
                          {STATUS_OPTIONS.find((o) => o.value === a.status)?.label ?? a.status}
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-0.5 text-primary hover:underline"
                          onClick={() => openEdit(it)}
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      </div>
                    </div>
                    <div
                      ref={rowIdx === 0 ? trackRef : undefined}
                      className="flex-1 min-w-[320px] relative py-2 px-1"
                    >
                      <div
                        className="absolute inset-y-2 left-1 right-1 grid pointer-events-none opacity-40"
                        style={{ gridTemplateColumns: `repeat(${cols.count}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: cols.count }, (_, i) => (
                          <div key={i} className="border-l border-border-light first:border-l-0" />
                        ))}
                      </div>
                      {pos.visible && (
                        <div
                          role="slider"
                          tabIndex={0}
                          aria-label={`${a.description} timeline`}
                          onPointerDown={(e) => onBarPointerDown(e, it)}
                          className={cn(
                            'absolute top-1/2 -translate-y-1/2 h-8 rounded-md flex items-center px-2 text-xs cursor-grab active:cursor-grabbing select-none overflow-hidden shadow-sm',
                            statusBarClass(a.status),
                            overlapWarn && 'ring-2 ring-amber-500 ring-offset-1',
                            a.status === 'COMPLETE' && 'cursor-default opacity-90'
                          )}
                          style={{ left: `${pos.leftPct}%`, width: `${Math.max(pos.widthPct, 1.5)}%` }}
                        >
                          {a.status === 'COMPLETE' && (
                            <Check className="h-3.5 w-3.5 shrink-0 mr-1 text-emerald-700" aria-hidden />
                          )}
                          {a.status === 'IN_PROGRESS' && (
                            <div
                              className="absolute inset-y-0 left-0 bg-primary/35 pointer-events-none"
                              style={{ width: `${Math.min(100, Math.max(0, a.progressPercent))}%` }}
                            />
                          )}
                          <span className="relative z-[1] truncate flex-1">{a.description}</span>
                          {a.status !== 'COMPLETE' && (
                            <GripHorizontal className="h-3.5 w-3.5 shrink-0 ml-1 text-steel opacity-70" aria-hidden />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      )}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden border-border-medium shadow-sm">
        <div className="border-b border-border-light bg-light/40 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <Clock className="h-6 w-6 text-primary shrink-0 mt-0.5" aria-hidden />
            <div>
              <h2 className="font-heading text-h2 text-charcoal">Certificates &amp; licenses</h2>
              <p className="text-sm text-steel mt-1 max-w-3xl">
                Items expiring within the next {EXPIRING_SOON_DAYS} days (about two months), and all items that are already
                expired (with an expiry date in the past).
              </p>
            </div>
          </div>
        </div>
        <CardContent className="px-5 py-5 sm:px-6">
          {expiryLoading ? (
            <p className="text-sm text-steel py-2">Loading…</p>
          ) : expiringSoonRows.length === 0 && expiredRows.length === 0 ? (
            <p className="text-sm text-steel py-2">No matching certificates or licenses.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border-light">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-light/80 border-b border-border-light text-left">
                    <th className="px-3 py-2 font-medium text-steel">Type</th>
                    <th className="px-3 py-2 font-medium text-steel">Name</th>
                    <th className="px-3 py-2 font-medium text-steel">Plant</th>
                    <th className="px-3 py-2 font-medium text-steel">Expiry</th>
                    <th className="px-3 py-2 font-medium text-steel">Status</th>
                    <th className="px-3 py-2 font-medium text-steel w-28"> </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      key: 'soon' as const,
                      label: `Expiring soon (next ${EXPIRING_SOON_DAYS} days)`,
                      rows: expiringSoonRows,
                    },
                    { key: 'expired' as const, label: 'Expired', rows: expiredRows },
                  ].map((section) =>
                    section.rows.length === 0 ? null : (
                      <Fragment key={section.key}>
                        <tr className="bg-light/90 border-b border-border-light">
                          <td
                            colSpan={6}
                            className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
                          >
                            {section.label}
                          </td>
                        </tr>
                        {section.rows.map((row) => {
                          const href =
                            row.kind === 'certification'
                              ? `/admin/certifications/${row.id}`
                              : `/admin/licenses/${row.id}`;
                          return (
                            <tr
                              key={`${section.key}-${row.kind}-${row.id}`}
                              className="border-b border-border-light last:border-0 hover:bg-light/50"
                            >
                              <td className="px-3 py-2 text-charcoal">
                                <span className="inline-flex items-center gap-1.5">
                                  {row.kind === 'certification' ? (
                                    <Award className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
                                  ) : (
                                    <Scale className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
                                  )}
                                  {row.kind === 'certification' ? 'Certificate' : 'License'}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-medium text-charcoal">{row.name}</td>
                              <td className="px-3 py-2 text-steel">{row.plant}</td>
                              <td className="px-3 py-2 text-steel tabular-nums">
                                {formatExpiryLabel(row.expiryDate)}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={cn(
                                    'rounded px-1.5 py-0.5 text-xs font-medium',
                                    row.status === 'EXPIRING' && 'bg-warning/10 text-charcoal',
                                    row.status === 'EXPIRED' && 'bg-danger/10 text-danger',
                                    row.status === 'ACTIVE' && 'bg-emerald-600/10 text-emerald-800'
                                  )}
                                >
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Link
                                  href={href}
                                  className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
                                >
                                  Open <ExternalLink className="h-3 w-3" aria-hidden />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
