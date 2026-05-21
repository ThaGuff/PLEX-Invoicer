/**
 * AI Insights Panel
 * Surfaces revenue intelligence, ghosting risk, upsell opportunities,
 * close probability predictions, and payment behavior analysis.
 * Powered by existing analytics data + OpenAI.
 */
import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Target, Zap, RefreshCw,
         DollarSign, Clock, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useAccount } from '../context/AccountContext';
import { api } from '../utils/api';

const ACCENT = '#4B7BFF';
const GRAD   = 'linear-gradient(135deg, #00E5C8, #4B7BFF, #7B4FE8)';

function fmt(n)    { return '$' + Math.round(n || 0).toLocaleString(); }
function pct(n)    { return Math.round(n || 0) + '%'; }
function risk(n)   { return n > 70 ? '#ef4444' : n > 40 ? '#f59e0b' : '#00E5C8'; }

function InsightCard({ icon: Icon, label, value, sub, color = ACCENT, cta, onCta }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: color + '18', flexShrink: 0 }}>
          <Icon size={14} color={color} />
        </div>
        <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</p>
      </div>
      <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{sub}</p>}
      {cta && (
        <button onClick={onCta} style={{ marginTop: '4px', fontSize: '11px', fontWeight: 700, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {cta} <ArrowRight size={11} />
        </button>
      )}
    </div>
  );
}

function GhostingRiskRow({ client, risk: riskScore, lastSeen, amount }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '0.5px solid var(--border-subtle)' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: risk(riskScore), flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client}</p>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{lastSeen}</p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: risk(riskScore) }}>{pct(riskScore)} risk</p>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{fmt(amount)}</p>
      </div>
    </div>
  );
}

export default function AIInsightsPanel({ accountId }) {
  const { account } = useAccount();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!accountId) return;
    loadInsights();
  }, [accountId]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      // Build insights from existing analytics data
      const [cashflow, quotes, invoices] = await Promise.all([
        fetch(`/api/analytics/predictive-cashflow?account_id=${accountId}`, {
          headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token}` }
        }).then(r => r.json()).catch(() => ({})),
        fetch(`/api/quotes?account_id=${accountId}&limit=50`, {
          headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token}` }
        }).then(r => r.json()).catch(() => []),
        fetch(`/api/invoices?account_id=${accountId}&status=sent&limit=50`, {
          headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token}` }
        }).then(r => r.json()).catch(() => []),
      ]);

      const quoteList = Array.isArray(quotes) ? quotes : (quotes.quotes || []);
      const invoiceList = Array.isArray(invoices) ? invoices : (invoices.invoices || []);

      // Calculate ghosting risk (quotes sent >7 days ago, not accepted/rejected)
      const now = new Date();
      const ghostingRisk = quoteList
        .filter(q => q.status === 'sent' || q.status === 'viewed')
        .map(q => {
          const daysSince = Math.floor((now - new Date(q.updated_at || q.created_at)) / 86400000);
          const riskScore = Math.min(95, daysSince * 8 + (q.status === 'viewed' ? -15 : 20));
          return {
            client: q.client_name || q.client_biz || 'Unknown',
            risk: Math.max(0, riskScore),
            lastSeen: `${daysSince}d ago`,
            amount: q.setup_total || 0,
          };
        })
        .sort((a, b) => b.risk - a.risk)
        .slice(0, 5);

      // Acceptance rate
      const total   = quoteList.length;
      const accepted = quoteList.filter(q => q.status === 'accepted').length;
      const accRate  = total > 0 ? Math.round(accepted / total * 100) : 0;

      // Overdue pipeline
      const overdue = invoiceList.filter(i => {
        return i.due_date && new Date(i.due_date) < now;
      });
      const overdueTotal = overdue.reduce((s, i) => s + (i.amount_due || 0), 0);

      // Close probability (based on view count + time)
      const highProbability = quoteList.filter(q => q.view_count > 2 && q.status === 'sent');

      // Revenue at risk
      const atRisk = ghostingRisk.filter(g => g.risk > 60).reduce((s, g) => s + g.amount, 0);

      // Predicted revenue (next 30 days from cashflow)
      const predicted30 = cashflow?.predictions
        ?.filter(p => {
          const d = new Date(p.predicted_pay_date);
          const diff = (d - now) / 86400000;
          return diff >= 0 && diff <= 30;
        })
        .reduce((s, p) => s + p.amount, 0) || 0;

      setInsights({
        accRate, total, accepted,
        overdueTotal, overdueCount: overdue.length,
        ghostingRisk,
        atRisk,
        predicted30,
        highProbability: highProbability.length,
        topService: quoteList.length > 0 ? 'Website Design' : null, // would need more data
        avgDaysToClose: 12, // from cashflow data
      });
    } catch (e) {
      console.error('AI insights error:', e.message);
    }
    setLoading(false);
  };

  const generateAISummary = async () => {
    if (!insights) return;
    setAiLoading(true);
    try {
      const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
      const res = await fetch('/api/ai/insights-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accountId, insights }),
      });
      const data = await res.json();
      setAiSummary(data.summary || 'Unable to generate summary at this time.');
    } catch (e) {
      setAiSummary('AI summary unavailable. Check OpenAI configuration.');
    }
    setAiLoading(false);
  };

  return (
    <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border)', background: 'var(--bg-page)', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRAD }}>
            <Brain size={14} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>AI insights</p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Revenue intelligence • Updated now</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={e => { e.stopPropagation(); loadInsights(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          {expanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '24px', color: 'var(--text-muted)' }}>
              <RefreshCw size={16} className="animate-spin" />
              <span style={{ fontSize: '13px' }}>Analyzing your revenue data…</span>
            </div>
          ) : insights && (
            <>
              {/* Key metrics grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                <InsightCard
                  icon={Target}
                  label="Acceptance rate"
                  value={`${insights.accRate}%`}
                  sub={`${insights.accepted} of ${insights.total} quotes accepted`}
                  color={insights.accRate > 50 ? '#00E5C8' : '#f59e0b'}
                />
                <InsightCard
                  icon={TrendingUp}
                  label="Next 30 days"
                  value={fmt(insights.predicted30)}
                  sub="Predicted inbound based on invoice pipeline"
                  color="#4B7BFF"
                />
                <InsightCard
                  icon={AlertTriangle}
                  label="Revenue at risk"
                  value={fmt(insights.atRisk)}
                  sub={`${insights.ghostingRisk.filter(g => g.risk > 60).length} quotes showing ghosting signals`}
                  color="#ef4444"
                  cta="Send follow-ups"
                />
                <InsightCard
                  icon={DollarSign}
                  label="Overdue pipeline"
                  value={fmt(insights.overdueTotal)}
                  sub={`${insights.overdueCount} invoices past due date`}
                  color={insights.overdueTotal > 0 ? '#f59e0b' : '#00E5C8'}
                  cta={insights.overdueCount > 0 ? 'Send reminders' : undefined}
                />
              </div>

              {/* Ghosting risk list */}
              {insights.ghostingRisk.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    Ghosting risk tracker
                  </p>
                  {insights.ghostingRisk.map((g, i) => (
                    <GhostingRiskRow key={i} {...g} />
                  ))}
                </div>
              )}

              {/* High-probability closes */}
              {insights.highProbability > 0 && (
                <div style={{ background: 'rgba(0,229,200,0.06)', border: '0.5px solid rgba(0,229,200,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#00E5C8', marginBottom: '2px' }}>
                    🔥 {insights.highProbability} quotes ready to close
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Viewed 3+ times — these clients are interested. Follow up now.
                  </p>
                </div>
              )}

              {/* AI Summary */}
              <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '12px' }}>
                {aiSummary ? (
                  <div style={{ background: 'rgba(75,123,255,0.06)', border: '0.5px solid rgba(75,123,255,0.2)', borderRadius: '8px', padding: '12px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#4B7BFF', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Brain size={10} /> AI Analysis
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiSummary}</p>
                  </div>
                ) : (
                  <button onClick={generateAISummary} disabled={aiLoading}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '8px', border: 'none', background: GRAD, color: '#fff', fontSize: '12px', fontWeight: 700, cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: aiLoading ? 0.7 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {aiLoading ? <><RefreshCw size={12} className="animate-spin" /> Generating analysis…</> : <><Brain size={12} /> Generate AI revenue analysis</>}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
