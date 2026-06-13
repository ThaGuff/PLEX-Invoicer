/**
 * AI Assistant — powered by Claude claude-sonnet-4-20250514 via Anthropic API
 * Floating chat bubble on all pages; answers questions about using the app
 */
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, ChevronDown } from 'lucide-react';

const SYSTEM_PROMPT = `You are the Invoice King AI Assistant — a friendly, concise helper built into the Invoice King app.

Invoice King is a SaaS quoting and invoicing platform for service businesses (contractors, agencies, freelancers).

KEY FEATURES YOU KNOW ABOUT:
- Quotes: Create professional quotes with line items, tax rates, and e-signature. Send a client portal link.
- Invoices: Convert quotes to invoices. Send via built-in email, copy link, or Gmail. Track viewed/paid status.
- Clients: Auto-saved from quotes. View full history per client.
- Calendar: Schedule jobs. Connect Google Calendar to import events.
- Documents: Upload and store job-site documents (PDF, images). Requires Pro plan.
- Photos: Capture and tag job-site photos. Requires Pro plan.
- Team Workspace: Slack-like channels, direct messages, team invites. Requires Pro plan.
- Automations: Set up follow-up email sequences for quotes and overdue invoices. Requires Pro plan.
- Analytics: Revenue charts, payment behavior analysis. Requires Pro plan.
- Billing: Starter ($19/mo), Pro ($49/mo), Agency ($99/mo). All plans start with a 7-day free trial.
- Admin: Owner-only panel to manage users, subscriptions, and system settings.

ANSWERING STYLE:
- Be concise — 1-3 sentences max unless a step-by-step walkthrough is needed.
- Use numbered steps for walkthroughs.
- If a feature requires an upgrade, mention which plan includes it.
- Never make up features that don't exist.
- If unsure, say "I'm not sure — check the Help section or contact support."`;

const SUGGESTIONS = [
  'How do I create a quote?',
  'How do I send an invoice?',
  'How do I connect Google Calendar?',
  'What\'s included in Pro?',
  'How do automations work?',
  'How do I invite a team member?',
];

export default function AIAssistant() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { role:'assistant', content:'Hi! I\'m your Invoice King assistant. Ask me anything about using the app — quotes, invoices, billing, team features, and more.' }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showSugg, setShowSugg] = useState(true);
  const bottomRef = useRef();
  const inputRef  = useRef();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setShowSugg(false);
    const newMessages = [...messages, { role:'user', content:msg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Route through our server to keep API key secure
      const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI unavailable');
      const reply = data.content || 'Sorry, I couldn\'t get a response. Please try again.';
      setMessages(m => [...m, { role:'assistant', content:reply }]);
    } catch (e) {
      setMessages(m => [...m, { role:'assistant', content:'Sorry, I\'m having trouble connecting. Please check your connection and try again.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating AI button — shows on both mobile and desktop */}
      <button onClick={() => setOpen(v => !v)}
        style={{
          position:'fixed',
          // On mobile: sit above the bottom nav (68px nav + 8px gap)
          bottom: window.innerWidth < 768 ? 84 : 24,
          right: 16,
          width:48, height:48, borderRadius:'50%',
          background:'#1A1A1A',
          border:'none', cursor:'pointer', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 8px 24px rgba(124,58,237,0.4)',
          transition:'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform='scale(1.1)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(124,58,237,0.5)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(124,58,237,0.4)'; }}
        title="AI Assistant">
        {open ? <X size={22} color="#fff"/> : <Sparkles size={22} color="#fff"/>}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position:'fixed',
          bottom: window.innerWidth < 768 ? 144 : 88,
          right: 8,
          width: Math.min(380, window.innerWidth - 32),
          height: 480,
          background:'var(--bg-surface)',
          borderRadius:20,
          boxShadow:'0 24px 80px rgba(11,18,32,0.25), 0 4px 16px rgba(11,18,32,0.1)',
          border:'1px solid var(--border)',
          display:'flex', flexDirection:'column',
          zIndex:199,
          fontFamily:"'Inter',sans-serif",
          overflow:'hidden',
          animation:'fadeUp 0.2s ease both',
        }}>
          {/* Header */}
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, background:'var(--bg-raised)' }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'#1A1A1A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Sparkles size={16} color="#fff"/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, fontWeight:800, color:'var(--text-primary)', margin:0 }}>Invoice King Assistant</p>
              <p style={{ fontSize:11, color:'#C6E404', margin:0, fontWeight:600 }}>● Online — powered by Claude AI</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}>
              <ChevronDown size={18}/>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth:'82%', padding:'10px 13px', borderRadius: m.role==='user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                  background: m.role==='user' ? '#1A1A1A' : 'var(--bg-raised)',
                  border: m.role==='user' ? 'none' : '1px solid var(--border)',
                  fontSize:13, color: m.role==='user' ? '#fff' : 'var(--text-secondary)',
                  lineHeight:1.6, whiteSpace:'pre-wrap',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:'flex', justifyContent:'flex-start' }}>
                <div style={{ padding:'10px 14px', borderRadius:'4px 14px 14px 14px', background:'var(--bg-raised)', border:'1px solid var(--border)', display:'flex', gap:4, alignItems:'center' }}>
                  {[0,150,300].map(d => (
                    <div key={d} style={{ width:6, height:6, borderRadius:'50%', background:'var(--text-muted)', animation:'bounce 1s ease infinite', animationDelay:d+'ms' }}/>
                  ))}
                </div>
              </div>
            )}
            {/* Suggestions */}
            {showSugg && messages.length === 1 && (
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.6px' }}>Suggestions</p>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    style={{ padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-page)', cursor:'pointer', textAlign:'left', fontSize:12, color:'var(--text-secondary)', fontFamily:"'Inter',sans-serif", transition:'all 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='var(--bg-raised)'; e.currentTarget.style.color='var(--text-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='var(--bg-page)'; e.currentTarget.style.color='var(--text-secondary)'; }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', background:'var(--bg-surface)' }}>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end', background:'var(--bg-raised)', borderRadius:13, border:'1px solid var(--border)', padding:'8px 10px' }}>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask anything about Invoice King…" rows={1} disabled={loading}
                style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--text-primary)', fontSize:13, resize:'none', fontFamily:"'Inter',sans-serif", lineHeight:1.6, maxHeight:80 }}/>
              <button onClick={() => send()} disabled={!input.trim() || loading}
                style={{ width:32, height:32, borderRadius:9, background:input.trim()?'#1A1A1A':'var(--border)', border:'none', cursor:input.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Send size={13} color={input.trim()?"#fff":"var(--text-muted)"}/>
              </button>
            </div>
            <p style={{ fontSize:10, color:'var(--text-muted)', textAlign:'center', marginTop:6, marginBottom:0 }}>Powered by Claude AI · Invoice King</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
      `}</style>
    </>
  );
}
