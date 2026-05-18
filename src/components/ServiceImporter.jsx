import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../utils/api';

const TEMPLATE_HEADERS = ['Section', 'Service Name', 'Description', 'Setup Price', 'Monthly Price'];

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const data = [
    TEMPLATE_HEADERS,
    ['Pressure Washing', 'Residential Wash', 'Standard home exterior wash', 299, 0],
    ['Pressure Washing', 'Commercial Wash', 'Commercial building wash', 599, 0],
    ['Lawn Care', 'Weekly Mowing', 'Weekly lawn mowing service', 0, 149],
    ['Lawn Care', 'Fertilization', 'Monthly fertilization treatment', 0, 89],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  // Style the header row
  ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 40 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Services');
  XLSX.writeFile(wb, 'plex-services-template.xlsx');
}

export default function ServiceImporter({ accountId, accent = '#13B5EA', onImported }) {
  const [open, setOpen]           = useState(false);
  const [rows, setRows]           = useState([]); // parsed rows
  const [errors, setErrors]       = useState([]);
  const [fileName, setFileName]   = useState('');
  const [importing, setImporting] = useState(false);
  const [done, setDone]           = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef();

  const reset = () => {
    setRows([]); setErrors([]); setFileName(''); setDone(false); setImportedCount(0);
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setErrors([]);
    setRows([]);
    setDone(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Find header row (look for 'Service Name' or 'name')
        let headerIdx = 0;
        for (let i = 0; i < Math.min(5, raw.length); i++) {
          const row = raw[i].map(v => String(v).toLowerCase());
          if (row.some(v => v.includes('service') || v.includes('name'))) {
            headerIdx = i;
            break;
          }
        }

        const headers = raw[headerIdx].map(h => String(h).trim().toLowerCase());
        const data = raw.slice(headerIdx + 1).filter(r => r.some(v => v !== ''));

        const errs = [];
        const parsed = data.map((row, i) => {
          const get = (...keys) => {
            for (const k of keys) {
              const idx = headers.findIndex(h => h.includes(k));
              if (idx >= 0 && row[idx] !== '') return row[idx];
            }
            return '';
          };

          const name = String(get('service name', 'name', 'service') || '').trim();
          const section = String(get('section', 'category', 'group') || '').trim() || 'Services';
          const description = String(get('description', 'desc') || '').trim();
          const setup = parseFloat(String(get('setup', 'one-time', 'onetime', 'setup price') || '0').replace(/[$,]/g, '')) || 0;
          const monthly = parseFloat(String(get('monthly', 'recurring', 'monthly price') || '0').replace(/[$,]/g, '')) || 0;

          if (!name) errs.push(`Row ${headerIdx + i + 2}: missing service name`);
          return { section, name, description, setup_price: setup, monthly_price: monthly, _valid: !!name };
        }).filter(r => r._valid);

        setErrors(errs);
        setRows(parsed);
      } catch (err) {
        setErrors([`Could not parse file: ${err.message}`]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!rows.length || !accountId) return;
    setImporting(true);
    let count = 0;

    try {
      // Group rows by section
      const sectionMap = {};
      rows.forEach(r => {
        if (!sectionMap[r.section]) sectionMap[r.section] = [];
        sectionMap[r.section].push(r);
      });

      for (const [sectionLabel, items] of Object.entries(sectionMap)) {
        // Create section
        const sec = await api.accounts.addSection(accountId, { label: sectionLabel });
        // Add items to section
        for (const item of items) {
          await api.accounts.addItem(accountId, {
            section_id:    sec.id,
            name:          item.name,
            description:   item.description,
            setup_price:   item.setup_price,
            monthly_price: item.monthly_price,
          });
          count++;
        }
      }

      setImportedCount(count);
      setDone(true);
      onImported?.();
    } catch (e) {
      setErrors(prev => [...prev, `Import failed: ${e.message}`]);
    }
    setImporting(false);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
      style={{ borderColor: '#E5E8EB', color: '#7A7E85' }}>
      <FileSpreadsheet size={13} /> Import from spreadsheet
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E8EB' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + '18' }}>
              <FileSpreadsheet size={15} style={{ color: accent }} />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Import services</p>
              <p className="text-xs text-ink-muted">Excel (.xlsx), CSV (.csv)</p>
            </div>
          </div>
          <button onClick={() => { setOpen(false); reset(); }}><X size={16} className="text-ink-muted" /></button>
        </div>

        <div className="p-6 space-y-4">

          {done ? (
            <div className="text-center py-6">
              <CheckCircle size={40} className="mx-auto mb-3 text-green-500" />
              <p className="text-base font-bold text-ink">Import complete!</p>
              <p className="text-sm text-ink-muted mt-1">{importedCount} service{importedCount !== 1 ? 's' : ''} added to your catalog.</p>
              <button onClick={() => { setOpen(false); reset(); }}
                className="mt-4 text-sm font-semibold px-5 py-2 rounded-xl text-white"
                style={{ background: accent }}>Done</button>
            </div>
          ) : (
            <>
              {/* Template download */}
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#F5F7F8' }}>
                <p className="text-xs text-ink-muted">Don't have a file yet?</p>
                <button onClick={downloadTemplate}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                  style={{ background: '#6366f1' }}>
                  <Download size={12} /> Download template
                </button>
              </div>

              {/* Column mapping hint */}
              <div className="text-xs text-ink-muted rounded-xl p-3 border" style={{ borderColor: '#E5E8EB' }}>
                <p className="font-semibold text-ink mb-1">Expected columns (auto-detected):</p>
                <p className="font-mono">Section · Service Name · Description · Setup Price · Monthly Price</p>
                <p className="mt-1 text-ink-muted">Column names are flexible — "Category", "Name", "One-time", "Recurring" etc. all work.</p>
              </div>

              {/* File drop zone */}
              <div
                onClick={() => fileRef.current.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-current"
                style={{ borderColor: fileName ? accent : '#E5E8EB', background: fileName ? accent + '06' : '#FAFAFA' }}>
                <Upload size={24} className="mx-auto mb-2" style={{ color: accent }} />
                {fileName ? (
                  <p className="text-sm font-semibold text-ink">{fileName}</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-ink">Drop file here or click to upload</p>
                    <p className="text-xs text-ink-muted mt-0.5">Supports .xlsx, .xls, .csv</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => handleFile(e.target.files[0])} />
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
                  {errors.map((e, i) => <p key={i} className="flex items-center gap-1.5"><AlertCircle size={11} />{e}</p>)}
                </div>
              )}

              {/* Preview */}
              {rows.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                    Preview — {rows.length} service{rows.length !== 1 ? 's' : ''} found
                  </p>
                  <div className="max-h-48 overflow-y-auto border rounded-xl divide-y" style={{ borderColor: '#E5E8EB' }}>
                    {rows.slice(0, 20).map((r, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-2.5 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ink truncate">{r.name}</p>
                          <p className="text-ink-muted">{r.section}{r.description ? ` · ${r.description.slice(0,50)}` : ''}</p>
                        </div>
                        <div className="shrink-0 text-right text-ink-muted">
                          {r.setup_price > 0 && <p>${r.setup_price} setup</p>}
                          {r.monthly_price > 0 && <p>${r.monthly_price}/mo</p>}
                        </div>
                      </div>
                    ))}
                    {rows.length > 20 && (
                      <p className="px-4 py-2 text-xs text-ink-muted text-center">…and {rows.length - 20} more</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!done && rows.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#E5E8EB', background: '#FAFAFA' }}>
            <button onClick={reset} className="btn-ghost text-sm">Clear</button>
            <button onClick={handleImport} disabled={importing}
              className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-50"
              style={{ background: accent }}>
              {importing ? <><RefreshCw size={14} className="animate-spin" />Importing…</> : <><Upload size={14} />Import {rows.length} services</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
