"use client";

import { useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, Loader2, AlertTriangle, Building2, Check, Upload, FileSpreadsheet
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from "@/components/ui/table";

type Position   = { id: string; title: string; departmentId: string };
type Department = { id: string; name: string; positions: Position[] };

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  const Icon = type === 'success' ? Check : AlertTriangle;
  return (
    <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-bold animate-slide-up ${bg}`}>
      <Icon size={16} /> {msg}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><XIcon size={14} /></button>
    </div>
  );
}

// Custom simple XIcon for compatibility
function XIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

export default function DepartmentsClient({ initialDepartments }: { initialDepartments: Department[] }) {
  const [depts, setDepts]           = useState<Department[]>(initialDepartments);
  const [search, setSearch]         = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editDept, setEditDept]     = useState<Department | null>(null);
  const [deptName, setDeptName]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [posInputs, setPosInputs]   = useState<Record<string, string>>({});
  const [addPosDept, setAddPosDept] = useState<Department | null>(null);
  const [posTitle, setPosTitle]     = useState('');
  const [confirm, setConfirm]       = useState<{ type: 'dept' | 'pos'; id: string; label: string; deptId?: string } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importTab, setImportTab]   = useState<'text' | 'file'>('text');
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [parsedData, setParsedData] = useState<Array<{
    name: string;
    positions: string[];
    status: 'new' | 'merge' | 'skip';
    newPositionsToAdd: string[];
    existingPositionsCount: number;
  }>>([]);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') =>
    setToast({ msg, type }), []);

  const api = useCallback(async (body: Record<string, unknown>) => {
    const res  = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, []);

  const analyzeImport = useCallback((text: string) => {
    if (!text.trim()) {
      setParsedData([]);
      return;
    }

    let parsedDepts: { name: string; positions: string[] }[] = [];

    const trimmed = text.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const json = JSON.parse(trimmed);
        const arr = Array.isArray(json) ? json : [json];
        parsedDepts = arr.map((item: any) => {
          const name = item.name || item.department || '';
          const pos = Array.isArray(item.positions) ? item.positions : [];
          return { name: String(name), positions: pos.map(String) };
        }).filter((d: any) => d.name.trim().length > 0);
      } catch (e) {
        // Ignored, fallback silently
      }
    } else {
      const lines = trimmed.split(/\r?\n/);
      const hasHeader = lines[0].toLowerCase().includes('department') || lines[0].toLowerCase().includes('position');
      const startIdx = hasHeader ? 1 : 0;

      const deptMap: Record<string, Set<string>> = {};

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const commaIdx = line.indexOf(',');
        if (commaIdx === -1) {
          const name = line.trim();
          if (name) {
            if (!deptMap[name]) deptMap[name] = new Set();
          }
        } else {
          let deptPart = line.substring(0, commaIdx).replace(/^["']|["']$/g, '').trim();
          let posPart = line.substring(commaIdx + 1).replace(/^["']|["']$/g, '').trim();

          if (deptPart) {
            if (!deptMap[deptPart]) deptMap[deptPart] = new Set();
            const posList = posPart.split(/[;|\n]/).map(p => p.trim()).filter(Boolean);
            posList.forEach(p => deptMap[deptPart].add(p));
          }
        }
      }

      parsedDepts = Object.keys(deptMap).map(name => ({
        name,
        positions: Array.from(deptMap[name])
      }));
    }

    const enriched = parsedDepts.map(item => {
      const deptName = item.name.trim();
      const existing = depts.find(d => d.name.toLowerCase() === deptName.toLowerCase());

      if (!existing) {
        return {
          name: deptName,
          positions: item.positions,
          status: 'new' as const,
          newPositionsToAdd: item.positions,
          existingPositionsCount: 0
        };
      } else {
        const newPos = item.positions.filter(p => 
          !existing.positions.some(ep => ep.title.toLowerCase() === p.toLowerCase())
        );

        const status = newPos.length > 0 ? ('merge' as const) : ('skip' as const);

        return {
          name: existing.name,
          positions: item.positions,
          status,
          newPositionsToAdd: newPos,
          existingPositionsCount: existing.positions.length
        };
      }
    });

    setParsedData(enriched);
  }, [depts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportText(text);
      analyzeImport(text);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (parsedData.length === 0) return;
    setImportLoading(true);
    try {
      const importPayload = parsedData.map(d => ({
        name: d.name,
        positions: d.positions
      }));
      const res = await api({ action: 'bulk-import-departments', departments: importPayload });
      
      setDepts(prev => {
        const copy = [...prev];
        res.departments.forEach((imported: Department) => {
          const idx = copy.findIndex(d => d.name.toLowerCase() === imported.name.toLowerCase());
          if (idx !== -1) {
            copy[idx] = imported;
          } else {
            copy.push(imported);
          }
        });
        return copy.sort((a, b) => a.name.localeCompare(b.name));
      });

      showToast(`Successfully imported: +${res.importedCount} depts, +${res.positionsCount} positions!`);
      setShowImport(false);
      setImportText('');
      setParsedData([]);
    } catch (err: unknown) {
      showToast(String(err), 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent = 
      "Department,Positions\n" +
      "Faculty of Science,\"Dean; Senior Lecturer; Teaching Assistant\"\n" +
      "Department of Computer Science,\"Head of Department; Lecturer; Lab Technician\"\n" +
      "Registry and Academic Affairs,\"Registrar; Clerk\"\n" +
      "Finance Department,\"Chief Accountant; Accountant\"\n" +
      "Dean of Students,\"Dean; Sports Officer; Counselor\"\n";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "departments_positions_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = useMemo(() =>
    depts.filter(d => d.name.toLowerCase().includes(search.toLowerCase())),
    [depts, search]);

  const openAdd  = () => { setDeptName(''); setEditDept(null); setShowModal(true); };
  const openEdit = (d: Department) => { setDeptName(d.name); setEditDept(d); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editDept) {
        const data = await api({ action: 'edit-department', id: editDept.id, name: deptName });
        setDepts(prev => prev.map(d => d.id === editDept.id ? { ...d, name: data.department.name } : d));
        showToast('Department renamed!');
      } else {
        const data = await api({ action: 'add-department', name: deptName });
        setDepts(prev => [...prev, { ...data.department, positions: [] }]);
        showToast(`"${deptName}" created!`);
      }
      setShowModal(false);
    } catch (err: unknown) { showToast(String(err), 'error'); }
    finally { setLoading(false); }
  };

  const handleAddPos = async (deptId: string) => {
    const title = (posInputs[deptId] || '').trim();
    if (!title) return;
    try {
      const data = await api({ action: 'add-position', title, departmentId: deptId });
      setDepts(prev => prev.map(d => d.id === deptId ? { ...d, positions: [...d.positions, data.position] } : d));
      setPosInputs(prev => ({ ...prev, [deptId]: '' }));
      showToast(`"${title}" added!`);
    } catch (err: unknown) { showToast(String(err), 'error'); }
  };

  const handleConfirmDelete = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      if (confirm.type === 'dept') {
        await api({ action: 'delete-department', id: confirm.id });
        setDepts(prev => prev.filter(d => d.id !== confirm.id));
        showToast('Department deleted.', 'info');
      } else {
        await api({ action: 'delete-position', id: confirm.id });
        setDepts(prev => prev.map(d =>
          d.id === confirm.deptId ? { ...d, positions: d.positions.filter(p => p.id !== confirm.id) } : d
        ));
        showToast('Position removed.', 'info');
      }
      setConfirm(null);
    } catch (err: unknown) { showToast(String(err), 'error'); }
    finally { setConfirmLoading(false); }
  };

  const totalPositions = depts.reduce((a, d) => a + d.positions.length, 0);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white">Departments</h1>
          <p className="text-slate-500 mt-1.5 text-sm dark:text-slate-400">
            Manage faculties, schools, and departments — {depts.length} depts · {totalPositions} positions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setImportText(''); setParsedData([]); setShowImport(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-blue-400 bg-blue-50/20 text-blue-700 hover:bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20 dark:text-blue-400 dark:hover:bg-blue-950/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250">
            <Upload size={15} className="stroke-[3]" /> Bulk Import
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250"
            style={{
              backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
              backgroundColor: '#1e5fb8'
            }}>
            <Plus size={15} className="stroke-[3]" /> Add Department
          </button>
        </div>
      </div>

      {/* Search & Statistics bar */}
      <div className="bg-white/40 dark:bg-slate-900/30 border border-white/60 dark:border-slate-800/60 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search departments…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input" />
        </div>
        <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pr-1">{filtered.length} department{filtered.length !== 1 ? 's' : ''} matched</span>
      </div>

      {filtered.length === 0 ? (
        <Card className="py-20 text-center border-slate-100 dark:border-slate-800">
          <Building2 size={40} className="mx-auto mb-3 text-slate-200 dark:text-slate-800 animate-pulse" />
          <p className="text-sm text-slate-400 font-medium">
            {search ? 'No departments match your search.' : 'No departments yet — click Add Department to start.'}
          </p>
        </Card>
      ) : (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-800/35 border-b border-slate-100 dark:border-slate-800/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Department</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center w-32">Positions</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Classifications</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right pr-8 w-44">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-50 dark:divide-slate-800/35">
              {filtered.map(dept => (
                <TableRow key={dept.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                  <TableCell className="px-6 py-4.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 bg-primary shadow-xs">
                        {dept.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm whitespace-normal max-w-xs sm:max-w-sm lg:max-w-md">{dept.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4.5 text-center">
                    <Badge variant="outline" className="font-black text-xs px-2.5 py-0.5 bg-slate-100/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-800/65">
                      {dept.positions.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4.5">
                    {dept.positions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-w-xl py-1 whitespace-normal">
                        {dept.positions.map(pos => (
                          <Badge key={pos.id} variant="secondary"
                            className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 border border-slate-200/50 group/badge hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/20 dark:hover:text-rose-450 dark:hover:border-rose-900 transition-all duration-200">
                            {pos.title}
                            <button
                              onClick={() => setConfirm({ type: 'pos', id: pos.id, label: pos.title, deptId: dept.id })}
                              className="text-slate-400 hover:text-rose-600 transition ml-0.5 shrink-0" title="Remove position">
                              <XIcon size={9} className="stroke-[3]" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic dark:text-slate-500">No positions registered</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4.5 text-right pr-8">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => { setPosTitle(''); setAddPosDept(dept); }}
                        className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/60 transition" title="Add Position">
                        <Plus size={13.5} className="stroke-[3]" />
                      </button>
                      <button onClick={() => openEdit(dept)}
                        className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/60 transition" title="Rename Department">
                        <Pencil size={13.5} />
                      </button>
                      <button onClick={() => setConfirm({ type: 'dept', id: dept.id, label: dept.name })}
                        className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/60 transition" title="Delete Department">
                        <Trash2 size={13.5} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Bulk Import Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          <DialogHeader className="px-1 pt-1">
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <FileSpreadsheet className="text-blue-600 dark:text-blue-400 w-5.5 h-5.5 shrink-0" />
              Bulk Import Departments & Positions
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-1">
              Add multiple faculties, divisions, and staff roles at once
            </DialogDescription>
          </DialogHeader>

          {/* Tabs Selector */}
          <div className="flex border-b border-slate-100 dark:border-slate-800/80 mt-2 mb-4">
            <button
              onClick={() => setImportTab('text')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                importTab === 'text'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Paste Text (CSV / JSON)
            </button>
            <button
              onClick={() => setImportTab('file')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                importTab === 'file'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Upload CSV / JSON File
            </button>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {importTab === 'text' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Raw Data Content</label>
                  <div className="flex items-center gap-3">
                    <button onClick={downloadCsvTemplate} type="button" className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                      <FileSpreadsheet size={10} /> Download CSV Template
                    </button>
                    <span className="text-[9px] font-bold text-slate-400">|</span>
                    <span className="text-[9px] font-bold text-slate-400">CSV or JSON</span>
                  </div>
                </div>
                <textarea
                  placeholder={
                    "Example CSV:\nDepartment, Positions\nFaculty of Science, Dean; Lecturer; Lab Assistant\nFaculty of Engineering, Dean; Lecturer\n\nOr Example JSON:\n[\n  {\n    \"name\": \"Department of Physics\",\n    \"positions\": [\"Professor\", \"Technician\"]\n  }\n]"
                  }
                  rows={8}
                  className="w-full text-xs font-mono p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 focus:outline-none focus:border-blue-500 transition"
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    analyzeImport(e.target.value);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition rounded-xl p-8 text-center bg-slate-50/30 dark:bg-slate-900/20 relative cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="mx-auto mb-3 text-slate-400 shrink-0" size={32} />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Drag and drop your file here, or <span className="text-blue-600 dark:text-blue-400 underline">browse</span>
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider font-extrabold">
                    Only .csv or .json files under 2MB are supported
                  </p>
                  <div className="mt-3 relative z-10 flex items-center justify-center gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Need a template?</span>
                    <button onClick={downloadCsvTemplate} type="button" className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                      Download CSV Template
                    </button>
                  </div>
                </div>
                {importText && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Loaded File Content Preview</p>
                    <pre className="text-[9px] font-mono text-slate-600 dark:text-slate-400 mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {importText.substring(0, 500)}{importText.length > 500 ? '...' : ''}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* parsedData Preview ledger */}
            {parsedData.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                  <span>Import Preview Delta ({parsedData.length} records)</span>
                  <span className="text-[10px] text-slate-400 font-bold lowercase">analyzed client-side against database</span>
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {parsedData.map((dept, idx) => {
                    const badgeBg =
                      dept.status === 'new'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/60'
                        : dept.status === 'merge'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/60'
                        : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/60';

                    const badgeLabel =
                      dept.status === 'new'
                        ? 'New Department'
                        : dept.status === 'merge'
                        ? 'Merge Positions'
                        : 'No Changes (Skip)';

                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800/85 bg-slate-50/40 dark:bg-slate-950/20 gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-250">{dept.name}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 border rounded-full ${badgeBg}`}>
                              {badgeLabel}
                            </span>
                          </div>
                          {dept.positions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {dept.positions.map((p, pidx) => {
                                const isNew = dept.newPositionsToAdd.includes(p);
                                const pBadgeBg = isNew
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-950'
                                  : 'bg-slate-100 text-slate-400 dark:bg-slate-900/40 dark:text-slate-500';
                                return (
                                  <span key={pidx} className={`text-[9px] px-1.5 py-0.5 rounded border border-transparent font-semibold ${pBadgeBg}`}>
                                    {p} {isNew ? '(new)' : ''}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-right font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                          {dept.status === 'new' && `+${dept.positions.length} positions`}
                          {dept.status === 'merge' && `+${dept.newPositionsToAdd.length} positions`}
                          {dept.status === 'skip' && '0 changes'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
            <button
              type="button"
              onClick={() => setShowImport(false)}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={importLoading || parsedData.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50 disabled:pointer-events-none disabled:transform-none"
              style={{
                backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                backgroundColor: '#1e5fb8'
              }}
            >
              {importLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Importing…
                </>
              ) : (
                <>
                  <Check size={14} className="stroke-[3]" /> Confirm Import
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Department Dialog ────────────────────────────────────── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          <DialogHeader className="px-1 pt-1">
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Building2 className="text-primary w-5 h-5 shrink-0" />
              {editDept ? 'Rename Department' : 'Create New Department'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-1">
              {editDept ? `Currently: ${editDept.name}` : 'Setup a new campus branch or registry division'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Department Name</label>
              <input autoFocus required type="text"
                placeholder="e.g. Department of Computer Science"
                className="input-field text-sm p-3 w-full bg-white/40 dark:bg-slate-900/10 backdrop-blur-xs border border-slate-200/50 dark:border-slate-800/50 focus:ring-4 focus:ring-primary/20 focus:outline-none transition"
                value={deptName} onChange={e => setDeptName(e.target.value)} />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all duration-200">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                  backgroundColor: '#1e5fb8'
                }}>
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : editDept
                    ? <><Check size={14} className="stroke-[3]" /> Save Changes</>
                    : <><Plus size={14} className="stroke-[3]" /> Create Department</>
                }
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Register New Position Dialog ────────────────────────────────────── */}
      <Dialog open={!!addPosDept} onOpenChange={(open) => !open && setAddPosDept(null)}>
        <DialogContent className="sm:max-w-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          <DialogHeader className="px-1 pt-1">
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Plus className="text-primary w-5 h-5 shrink-0" />
              Register New Position
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mt-1">
              Department: {addPosDept?.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!addPosDept) return;
            const title = posTitle.trim();
            if (!title) return;
            setLoading(true);
            try {
              const data = await api({ action: 'add-position', title, departmentId: addPosDept.id });
              setDepts(prev => prev.map(d => d.id === addPosDept.id ? { ...d, positions: [...d.positions, data.position] } : d));
              setPosTitle('');
              setAddPosDept(null);
              showToast(`"${title}" added!`);
            } catch (err: unknown) { showToast(String(err), 'error'); }
            finally { setLoading(false); }
          }} className="space-y-5 py-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Position Title</label>
              <input autoFocus required type="text"
                placeholder="e.g. Senior Lecturer"
                className="input-field text-sm p-3 w-full bg-white/40 dark:bg-slate-900/10 backdrop-blur-xs border border-slate-200/50 dark:border-slate-800/50 focus:ring-4 focus:ring-primary/20 focus:outline-none transition"
                value={posTitle} onChange={e => setPosTitle(e.target.value)} />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
              <button type="button" onClick={() => setAddPosDept(null)}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all duration-200">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all duration-250 focus:ring-4 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 disabled:transform-none"
                style={{
                  backgroundImage: 'linear-gradient(to right, #1e5fb8, #0f3c78)',
                  backgroundColor: '#1e5fb8'
                }}>
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><Plus size={14} className="stroke-[3]" /> Register Position</>
                }
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="max-w-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          <DialogHeader className="px-1 pt-1">
            <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="text-rose-500 w-5 h-5 shrink-0" />
              {confirm?.type === 'dept' ? 'Delete Department Registry?' : 'Remove Position Classification?'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2.5">
              {confirm?.type === 'dept' ? (
                <>
                  This will permanently delete the department <strong className="text-slate-900 dark:text-white font-extrabold">"{confirm.label}"</strong> along with all associated position classifications. Outstanding card applications belonging to staff in this division will remain queryable but will be marked as division-less.
                </>
              ) : (
                <>
                  This will remove the classification <strong className="text-slate-900 dark:text-white font-extrabold">"{confirm?.label}"</strong> from the registry list. Future applications will not be able to select this role.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
            <button onClick={() => setConfirm(null)}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all duration-200">
              Cancel
            </button>
            <button onClick={handleConfirmDelete} disabled={confirmLoading}
              className="px-5 py-2.5 text-white rounded-xl text-sm font-black transition-all hover:shadow-md focus:ring-4 focus:ring-rose-500/30 flex items-center gap-1.5 disabled:opacity-60 hover:-translate-y-0.5 bg-rose-600 hover:bg-rose-700"
              style={{
                backgroundImage: 'linear-gradient(to right, #e11d48, #be123c)',
                backgroundColor: '#e11d48'
              }}>
              {confirmLoading
                ? <><Loader2 size={14} className="animate-spin" /> Deleting…</>
                : confirm?.type === 'dept'
                  ? 'Delete Department'
                  : 'Remove Position'
              }
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
