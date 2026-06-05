/**
 * SettingsPage — Full System Settings Menu
 * Sections: Profile, Appearance, Notifications, Invoice Templates,
 *           Quote Defaults, Email, Integrations, Security, Plan & Billing
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useAccount } from '../context/AccountContext';
import PageHeader from '../components/PageHeader';
import {
  User, Palette, Bell, FileText, Mail, Shield, CreditCard,
  Zap, Globe, Clock, ChevronRight, Check, Sun, Moon,
  Save, RefreshCw, Eye, Download, Printer, Layout, X
} from 'lucide-react';

// ─── Invoice/Quote Theme Previews ─────────────────────────────────
const THEMES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Clean professional layout with accent header bar',
    preview: (accent) => (
      <div style={{ width: '100%', aspectRatio: '8.5/11', background: '#fff', borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0', fontSize: 5 }}>
        <div style={{ height: 18, background: accent, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
          <div style={{ width: 20, height: 8, background: 'rgba(255,255,255,0.9)', borderRadius: 2 }} />
          <div style={{ marginLeft: 'auto', color: '#fff', fontWeight: 700, fontSize: 6 }}>QUOTE</div>
        </div>
        <div style={{ padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ height: 4, width: 40, background: '#1e293b', borderRadius: 2, marginBottom: 2 }} />
              <div style={{ height: 3, width: 30, background: '#94a3b8', borderRadius: 2 }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ height: 3, width: 20, background: '#94a3b8', borderRadius: 2, marginBottom: 2 }} />
              <div style={{ height: 3, width: 25, background: '#94a3b8', borderRadius: 2 }} />
            </div>
          </div>
          {[1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '0.5px solid #f1f5f9' }}>
              <div style={{ height: 3, width: 50, background: i===1?'#1e293b':'#94a3b8', borderRadius: 2 }} />
              <div style={{ height: 3, width: 15, background: accent, borderRadius: 2 }} />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <div style={{ padding: '3px 8px', background: accent, borderRadius: 2 }}>
              <div style={{ height: 3, width: 20, background: '#fff', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Bold typography with gradient accents and card layout',
    preview: (accent) => (
      <div style={{ width: '100%', aspectRatio: '8.5/11', background: '#f8fafc', borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0', fontSize: 5 }}>
        <div style={{ padding: '10px', background: '#fff', borderBottom: '2px solid ' + accent, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ height: 5, width: 35, background: accent, borderRadius: 2, marginBottom: 2 }} />
            <div style={{ height: 3, width: 25, background: '#94a3b8', borderRadius: 2 }} />
          </div>
          <div style={{ height: 14, width: 14, background: accent, borderRadius: 3, opacity: 0.2 }} />
        </div>
        <div style={{ padding: '8px 10px' }}>
          <div style={{ background: '#fff', borderRadius: 4, padding: '6px 8px', marginBottom: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ height: 3, width: 30, background: '#94a3b8', borderRadius: 2, marginBottom: 4 }} />
            <div style={{ height: 4, width: 45, background: '#1e293b', borderRadius: 2 }} />
          </div>
          {[1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, background: '#fff', borderRadius: 3, padding: '3px 6px', border: '1px solid #f1f5f9' }}>
              <div style={{ height: 3, width: 40, background: i===1?'#1e293b':'#94a3b8', borderRadius: 2 }} />
              <div style={{ height: 3, width: 15, background: accent, borderRadius: 2 }} />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ultra-clean design with maximum white space',
    preview: (accent) => (
      <div style={{ width: '100%', aspectRatio: '8.5/11', background: '#fff', borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0', fontSize: 5 }}>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ width: 4, height: 20, background: accent, borderRadius: 2, marginRight: 6 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 5, width: 35, background: '#1e293b', borderRadius: 2, marginBottom: 2 }} />
              <div style={{ height: 3, width: 25, background: '#94a3b8', borderRadius: 2 }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ height: 3, width: 20, background: '#94a3b8', borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ borderTop: '0.5px solid #e2e8f0', paddingTop: 8 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <div style={{ height: 3, width: 50, background: i===1?'#1e293b':'#94a3b8', borderRadius: 2 }} />
                <div style={{ height: 3, width: 15, background: i===1?accent:'#94a3b8', borderRadius: 2 }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, textAlign: 'right' }}>
            <div style={{ height: 4, width: 25, background: accent, borderRadius: 2, display: 'inline-block' }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'High-contrast dark header with striking layout',
    preview: (accent) => (
      <div style={{ width: '100%', aspectRatio: '8.5/11', background: '#fff', borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0', fontSize: 5 }}>
        <div style={{ background: '#0f172a', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ height: 5, width: 30, background: '#fff', borderRadius: 2, marginBottom: 2 }} />
            <div style={{ height: 3, width: 20, background: 'rgba(255,255,255,0.4)', borderRadius: 2 }} />
          </div>
          <div style={{ padding: '2px 6px', background: accent, borderRadius: 3 }}>
            <div style={{ height: 3, width: 12, background: '#fff', borderRadius: 2 }} />
          </div>
        </div>
        <div style={{ padding: '8px 10px' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <div style={{ flex: 1, padding: '4px 6px', background: accent + '15', borderRadius: 3, border: '1px solid ' + accent + '30' }}>
              <div style={{ height: 3, width: '80%', background: '#94a3b8', borderRadius: 2, marginBottom: 2 }} />
              <div style={{ height: 4, width: '60%', background: '#1e293b', borderRadius: 2 }} />
            </div>
            <div style={{ flex: 1, padding: '4px 6px', background: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <div style={{ height: 3, width: '80%', background: '#94a3b8', borderRadius: 2, marginBottom: 2 }} />
              <div style={{ height: 4, width: '60%', background: '#1e293b', borderRadius: 2 }} />
            </div>
          </div>
          {[1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '0.5px solid #f1f5f9' }}>
              <div style={{ height: 3, width: 50, background: i===1?'#0f172a':'#94a3b8', borderRadius: 2 }} />
              <div style={{ height: 3, width: 15, background: accent, borderRadius: 2 }} />
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

// ─── Section Nav ──────────────────────────────────────────────────
const SECTIONS = [
  { id: 'profile',       icon: User,       label: 'Profile & Business' },
  { id: 'appearance',   icon: Palette,    label: 'Appearance' },
  { id: 'templates',    icon: Layout,     label: 'Invoice & Quote Themes' },
  { id: 'notifications',icon: Bell,       label: 'Notifications' },
  { id: 'email',        icon: Mail,       label: 'Email & Communications' },
  { id: 'defaults',     icon: FileText,   label: 'Quote & Invoice Defaults' },
  { id: 'integrations', icon: Zap,        label: 'Integrations' },
  { id: 'security',     icon: Shield,     label: 'Security & Sessions' },
  { id: 'billing',      icon: CreditCard, label: 'Plan & Billing' },
];

export default function SettingsPage() {
  const { account, updateAccount, activeId } = useAccount();
  const accent = account?.primary_color || '#2563EB';
  const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState(() => ({
    name: account?.name || '',
    email: account?.email || '',
    phone: account?.phone || '',
    website: account?.website || '',
    address: account?.business_address || '',
    tagline: account?.company_tagline || '',
    primary_color: account?.primary_color || '#2563EB',
    invoice_theme: account?.default_template || 'classic',
    notif_invoice_viewed: account?.notif_invoice_viewed !== 0,
    notif_invoice_paid: account?.notif_invoice_paid !== 0,
    notif_quote_accepted: account?.notif_quote_accepted !== 0,
    notif_overdue: account?.notif_overdue !== 0,
    notif_email: true,
    email_from_name: account?.email_from_name || account?.name || '',
    email_signature: account?.email_signature || '',
    email_bcc: account?.email_bcc || '',
    default_payment_terms: account?.default_payment_terms || '30',
    default_tax_rate: account?.default_tax_rate || '0',
    default_notes: account?.default_notes || '',
    invoice_prefix: account?.invoice_prefix || 'INV',
    quote_prefix: account?.quote_prefix || 'Q',
    auto_send_reminders: account?.auto_send_reminders !== 0,
    reminder_days: String(account?.reminder_days || '3'),
  }));

  // Sync when account loads
  React.useEffect(() => {
    if (!account) return;
    setSettings(prev => ({
      ...prev,
      name: account.name || prev.name,
      email: account.email || prev.email,
      phone: account.phone || prev.phone,
      website: account.website || prev.website,
      address: account.business_address || prev.address,
      tagline: account.company_tagline || prev.tagline,
      primary_color: account.primary_color || prev.primary_color,
      invoice_theme: account.default_template || prev.invoice_theme,
      email_from_name: account.email_from_name || account.name || prev.email_from_name,
      email_signature: account.email_signature || prev.email_signature,
      email_bcc: account.email_bcc || prev.email_bcc,
      default_payment_terms: account.default_payment_terms || prev.default_payment_terms,
      default_tax_rate: account.default_tax_rate || prev.default_tax_rate,
      default_notes: account.default_notes || prev.default_notes,
      invoice_prefix: account.invoice_prefix || prev.invoice_prefix,
      quote_prefix: account.quote_prefix || prev.quote_prefix,
      auto_send_reminders: account.auto_send_reminders !== 0,
      reminder_days: String(account.reminder_days || prev.reminder_days),
    }));
  }, [account?.id]);

  const set = (k, v) => setSettings(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAccount(activeId, {
        name: settings.name,
        email: settings.email,
        phone: settings.phone,
        website: settings.website,
        business_address: settings.address,
        company_tagline: settings.tagline,
        primary_color: settings.primary_color,
        default_template: settings.invoice_theme,
        default_tax_rate: parseFloat(settings.default_tax_rate) || 0,
        email_from_name: settings.email_from_name,
        email_signature: settings.email_signature,
        email_bcc: settings.email_bcc,
        invoice_prefix: settings.invoice_prefix,
        quote_prefix: settings.quote_prefix,
        default_payment_terms: settings.default_payment_terms,
        default_notes: settings.default_notes,
        auto_send_reminders: settings.auto_send_reminders ? 1 : 0,
        reminder_days: parseInt(settings.reminder_days) || 3,
        notif_invoice_paid: settings.notif_invoice_paid ? 1 : 0,
        notif_invoice_viewed: settings.notif_invoice_viewed ? 1 : 0,
        notif_quote_accepted: settings.notif_quote_accepted ? 1 : 0,
        notif_overdue: settings.notif_overdue ? 1 : 0,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch(e) { alert('Save failed: ' + e.message); }
    setSaving(false);
  };

  const COLORS = ['#2563EB','#0D9488','#7C3AED','#D97706','#DC2626','#059669','#0891B2','#DB2777','#EA580C','#1e293b'];

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: 'calc(100vh - 64px)' }}>
      {/* ── Sidebar ── */}
      <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border)', padding: '20px 0', background: 'var(--bg-surface)', overflowY: 'auto' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '0 16px', marginBottom: 8 }}>Settings</p>
        {SECTIONS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveSection(id)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', border: 'none', background: activeSection === id ? `${accent}12` : 'transparent', color: activeSection === id ? accent : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: activeSection === id ? 700 : 500, textAlign: 'left', fontFamily: 'inherit', borderLeft: activeSection === id ? `3px solid ${accent}` : '3px solid transparent', transition: 'all 0.15s' }}>
            <Icon size={14} style={{ flexShrink: 0 }} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
        {/* Save bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
              {SECTIONS.find(s => s.id === activeSection)?.label}
            </h2>
          </div>
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, border: 'none', background: saved ? '#059669' : accent, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'background 0.2s' }}>
            {saving ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : saved ? <Check size={13} /> : <Save size={13} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {/* ── PROFILE ── */}
        {activeSection === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Section title="Business Information">
              <Grid2>
                <Field label="Business Name *" value={settings.name} onChange={v => set('name', v)} placeholder="Ridge Top Services" />
                <Field label="Tagline" value={settings.tagline} onChange={v => set('tagline', v)} placeholder="Professional Service You Can Trust" />
                <Field label="Email" value={settings.email} onChange={v => set('email', v)} type="email" placeholder="hello@yourcompany.com" />
                <Field label="Phone" value={settings.phone} onChange={v => set('phone', v)} type="tel" placeholder="(256) 555-0100" />
                <Field label="Website" value={settings.website} onChange={v => set('website', v)} type="url" placeholder="https://yourcompany.com" />
                <Field label="Business Address" value={settings.address} onChange={v => set('address', v)} placeholder="123 Main St, Birmingham AL 35203" />
              </Grid2>
            </Section>
            <Section title="Logo">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>Your logo appears on quotes, invoices, and the client portal. Upload via <strong>Business Settings</strong> in the sidebar.</p>
              {account?.logo_url && (
                <img src={account.logo_url + '?t=' + Date.now()} alt="Logo" style={{ height: 60, maxWidth: 200, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)', padding: 8, background: 'var(--bg-raised)' }} />
              )}
            </Section>
          </div>
        )}

        {/* ── APPEARANCE ── */}
        {activeSection === 'appearance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Section title="Brand Color">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>Used on quotes, invoices, emails, and the app accent color.</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => set('primary_color', c)}
                    style={{ width: 36, height: 36, borderRadius: 10, background: c, border: settings.primary_color === c ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {settings.primary_color === c && <Check size={14} style={{ color: '#fff' }} />}
                  </button>
                ))}
                <input type="color" value={settings.primary_color} onChange={e => set('primary_color', e.target.value)}
                  style={{ width: 36, height: 36, borderRadius: 10, border: '2px solid var(--border)', cursor: 'pointer', padding: 2 }} title="Custom color" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: settings.primary_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 900 }}>
                  {(settings.name || 'R').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{settings.name || 'Your Business'}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Preview with selected color</p>
                </div>
              </div>
            </Section>
            <Section title="Logo Initial">
              <Field label="Logo Letter (1 char)" value={account?.logo_initial || ''} onChange={() => {}} placeholder="P" />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Shown when no logo image is uploaded. Edit in Business Settings.</p>
            </Section>
          </div>
        )}

        {/* ── INVOICE & QUOTE THEMES ── */}
        {activeSection === 'templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Section title="Select Your Theme">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>Your theme controls how quotes and invoices look when sent to clients as PDFs or viewed in the portal.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {THEMES.map(theme => (
                  <div key={theme.id}
                    onClick={() => set('invoice_theme', theme.id)}
                    style={{ cursor: 'pointer', borderRadius: 14, border: `2px solid ${settings.invoice_theme === theme.id ? accent : 'var(--border)'}`, overflow: 'hidden', transition: 'all 0.2s', boxShadow: settings.invoice_theme === theme.id ? `0 4px 20px ${accent}30` : 'none', background: 'var(--bg-surface)' }}>
                    {/* Preview */}
                    <div style={{ padding: 12, background: 'var(--bg-raised)' }}>
                      {theme.preview(settings.primary_color)}
                    </div>
                    {/* Label */}
                    <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{theme.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{theme.description}</p>
                      </div>
                      {settings.invoice_theme === theme.id && (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={12} style={{ color: '#fff' }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="PDF Options">
              <Grid2>
                <ToggleField label="Show 'Powered by Revanew'" desc="Show Revanew branding in PDF footer" checked={account?.plan !== 'agency'} disabled={account?.plan === 'agency'} onChange={() => {}} />
                <ToggleField label="Include company logo" desc="Print your logo on every PDF" checked={true} onChange={() => {}} />
                <ToggleField label="Show payment terms" desc="Display payment due date and terms" checked={true} onChange={() => {}} />
                <ToggleField label="Show tax breakdown" desc="Show tax rate and amount separately" checked={true} onChange={() => {}} />
              </Grid2>
            </Section>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {activeSection === 'notifications' && (
          <Section title="Notification Preferences">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { k: 'notif_invoice_paid', label: 'Invoice paid', desc: 'Alert when a client pays an invoice' },
                { k: 'notif_invoice_viewed', label: 'Invoice viewed', desc: 'Alert when a client opens your invoice portal' },
                { k: 'notif_quote_accepted', label: 'Quote accepted', desc: 'Alert when a client signs and accepts a quote' },
                { k: 'notif_overdue', label: 'Invoice overdue', desc: 'Alert when an invoice passes its due date' },
                { k: 'notif_email', label: 'Email notifications', desc: 'Receive all alerts at your account email address' },
              ].map(({ k, label, desc }) => (
                <ToggleField key={k} label={label} desc={desc} checked={settings[k]} onChange={v => set(k, v)} />
              ))}
            </div>
          </Section>
        )}

        {/* ── EMAIL ── */}
        {activeSection === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Section title="Email Settings">
              <Grid2>
                <Field label="From Name" value={settings.email_from_name} onChange={v => set('email_from_name', v)} placeholder="Ridge Top Services" />
                <Field label="BCC Address (optional)" value={settings.email_bcc} onChange={v => set('email_bcc', v)} placeholder="records@yourcompany.com" type="email" />
              </Grid2>
            </Section>
            <Section title="Email Signature">
              <textarea value={settings.email_signature} onChange={e => set('email_signature', e.target.value)}
                rows={4} placeholder="Best regards,&#10;Alex Johnson&#10;Ridge Top Services&#10;(256) 555-0100"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Added to the bottom of all outgoing emails.</p>
            </Section>
          </div>
        )}

        {/* ── QUOTE & INVOICE DEFAULTS ── */}
        {activeSection === 'defaults' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Section title="Numbering">
              <Grid2>
                <Field label="Invoice Number Prefix" value={settings.invoice_prefix} onChange={v => set('invoice_prefix', v)} placeholder="INV" />
                <Field label="Quote Number Prefix" value={settings.quote_prefix} onChange={v => set('quote_prefix', v)} placeholder="Q" />
              </Grid2>
            </Section>
            <Section title="Payment Defaults">
              <Grid2>
                <div>
                  <label style={labelStyle}>Default Payment Terms (days)</label>
                  <select value={settings.default_payment_terms} onChange={e => set('default_payment_terms', e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit' }}>
                    {['0 (Due on receipt)','7','14','15','30','45','60','90'].map(d => <option key={d} value={d.split(' ')[0]}>{d}</option>)}
                  </select>
                </div>
                <Field label="Default Tax Rate (%)" value={settings.default_tax_rate} onChange={v => set('default_tax_rate', v)} type="number" placeholder="0" />
              </Grid2>
            </Section>
            <Section title="Reminders">
              <ToggleField label="Auto-send overdue reminders" desc="Automatically email clients when invoices are past due" checked={settings.auto_send_reminders} onChange={v => set('auto_send_reminders', v)} />
              {settings.auto_send_reminders && (
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Send reminder after (days overdue)</label>
                  <input type="number" value={settings.reminder_days} onChange={e => set('reminder_days', e.target.value)} min="1" max="30"
                    style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', width: 120, outline: 'none' }} />
                </div>
              )}
            </Section>
            <Section title="Default Notes">
              <textarea value={settings.default_notes} onChange={e => set('default_notes', e.target.value)}
                rows={3} placeholder="Payment is due within 30 days of invoice date. Late payments subject to 1.5% monthly interest."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
            </Section>
          </div>
        )}

        {/* ── INTEGRATIONS ── */}
        {activeSection === 'integrations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: 'Stripe', icon: '💳', desc: 'Accept card payments, ACH, Apple Pay & Google Pay', status: 'Connect in Business Settings', color: '#635BFF' },
              { name: 'Google Calendar', icon: '📅', desc: 'Sync jobs and appointments with your Google Calendar', status: 'Connect in Schedule', color: '#4285F4' },
              { name: 'QuickBooks', icon: '📊', desc: 'Export invoices and expenses to QuickBooks Online', status: 'Coming Soon', color: '#2CA01C' },
              { name: 'Zapier', icon: '⚡', desc: 'Connect Revanew to 5,000+ apps via Zapier automation', status: 'Coming Soon', color: '#FF4A00' },
              { name: 'Twilio SMS', icon: '📱', desc: 'Send automated SMS reminders to clients', status: 'Coming Soon', color: '#F22F46' },
            ].map(({ name, icon, desc, status, color }) => (
              <div key={name} style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{desc}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: status.includes('Soon') ? '#6B728015' : `${color}15`, color: status.includes('Soon') ? '#6B7280' : color, whiteSpace: 'nowrap' }}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── SECURITY ── */}
        {activeSection === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Section title="Account Security">
              <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Password</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Signed in via Google OAuth — password managed by Google</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: '#05966915', color: '#059669' }}>Secure ✓</span>
              </div>
              <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Data Encryption</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>All data encrypted in transit (TLS) and at rest</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: '#05966915', color: '#059669' }}>Active ✓</span>
              </div>
            </Section>
            <Section title="Data & Privacy">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>Your data is stored securely on Supabase PostgreSQL. We never sell or share your client data.</p>
              <button style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                Download My Data
              </button>
            </Section>
          </div>
        )}

        {/* ── PLAN & BILLING ── */}
        {activeSection === 'billing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Section title="Current Plan">
              <div style={{ padding: '18px', borderRadius: 14, border: `2px solid ${accent}30`, background: `${accent}08` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: accent, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {account?.plan || 'starter'}
                    </span>
                    <p style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {account?.plan === 'starter' ? '$19/mo' : account?.plan === 'pro' ? '$49/mo' : '$99/mo'}
                    </p>
                  </div>
                  <a href="/billing" style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: accent, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                    Manage Plan
                  </a>
                </div>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${accent}20`, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {account?.plan === 'agency' && [
                    '🏷️ White-label active',
                    '🔑 API access active',
                    '👥 Unlimited team members',
                  ].map(f => <span key={f} style={{ fontSize: 12, color: accent, fontWeight: 600 }}>{f}</span>)}
                  {account?.plan === 'pro' && [
                    '✅ Unlimited quotes & invoices',
                    '🤖 AI tools active',
                    '👥 5 team members',
                  ].map(f => <span key={f} style={{ fontSize: 12, color: accent, fontWeight: 600 }}>{f}</span>)}
                </div>
              </div>
            </Section>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Helper Components ─────────────────────────────────────────────
const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 };

function Section({ title, children }) {
  return (
    <div style={{ padding: '20px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
      <p style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{title}</p>
      {children}
    </div>
  );
}

function Grid2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>{children}</div>;
}

function Field({ label, value, onChange, type = 'text', placeholder, disabled }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: disabled ? 'var(--bg-raised)' : 'var(--bg-page)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', opacity: disabled ? 0.6 : 1 }} />
    </div>
  );
}

function ToggleField({ label, desc, checked, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
        {desc && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{desc}</p>}
      </div>
      <button onClick={() => !disabled && onChange(!checked)} disabled={disabled}
        style={{ width: 44, height: 24, borderRadius: 12, background: checked ? '#2563EB' : '#CBD5E1', border: 'none', cursor: disabled ? 'default' : 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, opacity: disabled ? 0.5 : 1 }}>
        <div style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );
}
