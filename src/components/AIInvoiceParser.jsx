import React, { useState } from 'react';
import { Zap, X, RefreshCw, CheckCircle, AlertCircle, Mic, FileText } from 'lucide-react';
import { api } from '../utils/api';

// Voice-to-quote: uses Web Speech API (Chrome/Edge)
const startVoiceInput = (onResult, onEnd) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.onresult = (e) => { onResult(e.results[0][0].transcript); };
  recognition.onend = onEnd;
  recognition.start();
  return recognition;
};

const EXAMPLES = [
  'Billed John Smith at Acme Co 5 hours for website design at $85/hr plus a $200 flat fee for stock photos',
  'Monthly retainer for Sarah Jones — $750/month for social media management starting June',
  'Charged Mike 3 hours troubleshooting at $120 per hour, and parts cost $340',
];

export default function AIInvoiceParser({ accountId, onApply, accent = '#C6E404' }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [isListening, setIsListening] = useState(false);
  const [voiceSupported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const recognitionRef = React.useRef(null);

  const handleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = startVoiceInput(
      (transcript) => { setText(t => t + (t ? ' ' : '') + transcript); },
      () => setIsListening(false)
    );
    if (rec) { recognitionRef.current = rec; setIsListening(true); }
  };

  const parse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setError('');
    setResult(null);
    try {
      const r = await api.ai.parseInvoice(text.trim(), accountId);
      if (r.success) {
        setResult(r.invoice);
      } else {
        setError(r.error || 'Parsing failed');
      }
    } catch (e) {
      setError(e.message);
    }
    setParsing(false);
  };

  const apply = () => {
    if (result && onApply) {
      onApply(result);
      setOpen(false);
      setText('');
      setResult(null);
    }
  };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
      style={{ borderColor: '#E5E8EB', color: accent }}>
      <Zap size={12} /> AI parse
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E8EB' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + '15' }}>
              <Zap size={15} style={{ color: accent }} />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">AI invoice parser</p>
              <p className="text-xs text-ink-muted">Paste any text or transcript — AI builds the invoice</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)}><X size={16} className="text-ink-muted" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Text input */}
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1.5">
              Describe the work in plain language
            </label>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setResult(null); setError(''); }}
              rows={4}
              className="field text-sm resize-none"
              placeholder="e.g. Billed John 5 hours for design work at $80/hr plus $150 for hosting setup..."
            />
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => { setText(ex); setResult(null); }}
                  className="text-xs px-2 py-1 rounded border transition-colors hover:bg-gray-50"
                  style={{ borderColor: '#E5E8EB', color: '#7A7E85' }}>
                  Example {i + 1}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Result preview */}
          {result && (
            <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#E5E8EB' }}>
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#f0fdf4', borderBottom: '0.5px solid #E5E8EB' }}>
                <CheckCircle size={13} className="text-green-600" />
                <span className="text-xs font-semibold text-green-700">Parsed successfully</span>
                {result.parsing_notes && (
                  <span className="text-xs text-green-600 ml-1">· {result.parsing_notes}</span>
                )}
              </div>
              <div className="p-4 space-y-3">
                {/* Client info */}
                {(result.client_name || result.client_biz || result.client_email) && (
                  <div>
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Client</p>
                    <p className="text-sm text-ink">
                      {[result.client_name, result.client_biz, result.client_email].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                )}
                {/* Line items */}
                {result.items?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Line items</p>
                    <div className="space-y-1.5">
                      {result.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 py-1.5 border-b last:border-0 text-sm" style={{ borderColor: '#F5F7F8' }}>
                          <div className="flex-1 min-w-0">
                            {item.section_label && (
                              <p className="text-xs text-ink-muted">{item.section_label}</p>
                            )}
                            <p className="font-medium text-ink">{item.name}</p>
                            {item.description && <p className="text-xs text-ink-muted">{item.description}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            {item.setup_price > 0 && <p className="text-sm font-semibold text-ink">${item.setup_price.toLocaleString()}</p>}
                            {item.monthly_price > 0 && <p className="text-xs text-ink-muted">${item.monthly_price}/mo</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Total */}
                    <div className="flex justify-between pt-2 text-sm font-bold text-ink">
                      <span>Total</span>
                      <span>${result.items.reduce((s, i) => s + (i.setup_price || 0), 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#E5E8EB', background: '#FAFAFA' }}>
          <button onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
          <div className="flex gap-2">
            {result ? (
              <button onClick={apply}
                className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white"
                style={{ background: '#C6E404' }}>
                <CheckCircle size={14} /> Apply to quote
              </button>
            ) : (
              <button onClick={parse} disabled={!text.trim() || parsing}
                className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white disabled:opacity-50"
                style={{ background: accent }}>
                {parsing ? <><RefreshCw size={14} className="animate-spin" />Parsing…</> : <><Zap size={14} />Parse text</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
