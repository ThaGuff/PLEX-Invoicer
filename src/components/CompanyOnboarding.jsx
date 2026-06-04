/**
 * CompanyOnboarding — First-time company setup wizard
 * Modeled after HousecallPro's company/customer info sheet
 * Shows on first login when onboarding_complete = 0
 * Fields: Company Name, Address, City/State/Zip, Phone, Website,
 *         Email, Logo, Technician Name, License #, Tagline, Business Type
 */
import React, { useState, useRef } from 'react';
import { Building2, MapPin, Phone, Globe, Mail, User, Award, Tag, Camera, ChevronRight, CheckCircle, Briefcase } from 'lucide-react';
import { useAccount } from '../context/AccountContext';

const TEMPLATE_OPTIONS = [
  { id: 'hvac',              icon: '❄️', label: 'HVAC' },
  { id: 'electrical',        icon: '⚡', label: 'Electrical' },
  { id: 'plumbing',          icon: '🔧', label: 'Plumbing' },
  { id: 'handyman',          icon: '🔨', label: 'Handyman' },
  { id: 'construction',      icon: '🏗️', label: 'Construction' },
  { id: 'generalContractor', icon: '📋', label: 'General Contractor' },
  { id: 'insurance',         icon: '🏠', label: 'Insurance Restoration' },
  { id: 'flooring',          icon: '🏡', label: 'Flooring' },
  { id: 'pressureWashing',   icon: '💧', label: 'Pressure Washing' },
  { id: 'junkRemoval',       icon: '🚛', label: 'Junk Removal' },
  { id: 'treeService',       icon: '🌳', label: 'Tree Service' },
  { id: 'painting',          icon: '🎨', label: 'Painting' },
  { id: 'concrete',          icon: '🧱', label: 'Concrete & Masonry' },
  { id: 'farming',           icon: '🐄', label: 'Cattle & Farming' },
  { id: 'it',                icon: '💻', label: 'IT Services' },
  { id: 'other',             icon: '🏢', label: 'Other' },
];

// Field must be defined OUTSIDE the parent component to avoid remount on every keystroke
function Field({ icon: Icon, label, k, placeholder, type = 'text', required = false, form, setForm, accent }) {
  const inputStyle = {
    width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10,
    border: '1.5px solid var(--border)', background: 'var(--bg-page)',
    color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
    outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: 'border-color 0.15s',
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: 6,
  };
  return (
    <div>
      <label style={labelStyle}>{label}{required && <span style={{ color: accent }}> *</span>}</label>
      <div style={{ position: 'relative' }}>
        <Icon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: accent, opacity: 0.7 }} />
        <input
          type={type}
          value={form[k]}
          onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
          placeholder={placeholder}
          style={inputStyle}
          autoComplete="off"
        />
      </div>
    </div>
  );
}

export default function CompanyOnboarding({ onComplete }) {
  const { account, activeId, updateAccount } = useAccount();
  const token = JSON.parse(localStorage.getItem('plex_auth_session') || '{}')?.access_token;
  const accent = account?.primary_color || '#2563EB';

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(account?.logo_url || null);
  const fileRef = useRef();

  const [form, setForm] = useState({
    name:             account?.name || '',
    business_address: account?.business_address || '',
    city_state_zip:   account?.city_state_zip || '',
    phone:            account?.phone || '',
    website:          account?.website || '',
    email:            account?.email || '',
    technician_name:  account?.technician_name || '',
    license_number:   account?.license_number || '',
    company_tagline:  account?.company_tagline || '',
    business_type:    account?.business_type || '',
    default_template: account?.default_template || '',
    tax_number:       account?.tax_number || '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload logo if changed (logoPreview is a local data: URL for preview only)
      let logoUrl = account?.logo_url || null; // default to existing
      if (logoPreview && logoPreview !== account?.logo_url) {
        const r = await fetch(`/api/accounts/${activeId}/logo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ logo_data_url: logoPreview }),
        });
        if (r.ok) {
          const d = await r.json();
          // Server returns a clean URL (/api/accounts/:id/logo-img), not the data: URL
          logoUrl = d.logo_url || null;
        }
      }

      await updateAccount(activeId, {
        ...form,
        logo_url: logoUrl,
        onboarding_complete: 1,
      });
      onComplete?.();
    } catch (e) {
      alert('Save failed: ' + e.message);
    }
    setSaving(false);
  };

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,18,32,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(11,18,32,0.3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Set Up Your Business</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Step {step} of {totalSteps} — {step === 1 ? 'Company Details' : step === 2 ? 'Branding & Identity' : 'Business Type'}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 4 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)`, borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* ── STEP 1: Company Details ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: `${accent}10`, border: `1px solid ${accent}20`, fontSize: 13, color: 'var(--text-muted)' }}>
                📋 This information appears on every quote and invoice you send — make it accurate and professional.
              </div>

              <Field form={form} setForm={setForm} accent={accent} icon={Building2} label="Company Name" k="name" placeholder="Hot/Cold HVAC Service & Repair" required />
              <Field form={form} setForm={setForm} accent={accent} icon={MapPin}    label="Company Address" k="business_address" placeholder="420 Blaine Street" />
              <Field form={form} setForm={setForm} accent={accent} icon={MapPin}    label="City, State, ZIP" k="city_state_zip" placeholder="Birmingham, AL 35201" />
              <Field form={form} setForm={setForm} accent={accent} icon={Phone}     label="Company Phone Number" k="phone" placeholder="(256) 000-0000" type="tel" />
              <Field form={form} setForm={setForm} accent={accent} icon={Globe}     label="Website" k="website" placeholder="www.yourbusiness.com" />
              <Field form={form} setForm={setForm} accent={accent} icon={Mail}      label="Company Email" k="email" placeholder="office@yourbusiness.com" type="email" />
              <Field form={form} setForm={setForm} accent={accent} icon={User}      label="Technician / Rep Name" k="technician_name" placeholder="Joe Smith" />
              <Field form={form} setForm={setForm} accent={accent} icon={Award}     label="License Number" k="license_number" placeholder="HVAC-2024-001 (optional)" />
              <Field form={form} setForm={setForm} accent={accent} icon={Tag}       label="Company Tagline" k="company_tagline" placeholder="Quality You Can Count On" />
              <Field form={form} setForm={setForm} accent={accent} icon={Briefcase} label="Tax / EIN Number" k="tax_number" placeholder="XX-XXXXXXX (optional)" />
            </div>
          )}

          {/* ── STEP 2: Logo & Branding ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Company Logo</label>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Your logo appears on every quote, invoice, and email sent to clients. Upload a PNG, JPG, or SVG.
                </p>

                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${logoPreview ? accent : 'var(--border)'}`,
                    borderRadius: 14, padding: 24, cursor: 'pointer',
                    textAlign: 'center', transition: 'all 0.2s',
                    background: logoPreview ? `${accent}05` : 'var(--bg-raised)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  }}
                >
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Company logo" style={{ maxHeight: 80, maxWidth: 240, objectFit: 'contain', borderRadius: 8 }} />
                      <p style={{ fontSize: 12, color: accent, fontWeight: 600 }}>✓ Logo uploaded — click to change</p>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Camera size={24} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Click to upload logo</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PNG, JPG, or SVG · Recommended: 400×200px</p>
                      </div>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              </div>

              {/* Preview of how it looks on a quote */}
              <div>
                <label style={labelStyle}>Preview — Quote / Invoice Header</label>
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                  {/* Simulated PDF header */}
                  <div style={{ position: 'relative', background: '#fff', padding: '16px 20px', borderBottom: '3px solid', borderColor: accent }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {logoPreview ? (
                        <img src={logoPreview} alt="" style={{ height: 44, maxWidth: 110, objectFit: 'contain', borderRadius: 6 }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 8, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 800 }}>
                          {(form.name || 'B').charAt(0)}
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>{form.name || 'Your Company Name'}</p>
                        <p style={{ fontSize: 11, color: '#666', margin: '3px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {[form.phone, form.email, form.website].filter(Boolean).map((v, i) => (
                            <span key={i}>{v}</span>
                          ))}
                        </p>
                        {form.company_tagline && <p style={{ fontSize: 10, color: accent, margin: '2px 0 0', fontStyle: 'italic' }}>{form.company_tagline}</p>}
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>QUOTE</p>
                        <p style={{ fontSize: 11, color: '#999', margin: '2px 0 0' }}>{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '10px 20px', background: `${accent}08`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {form.business_address && <span>📍 {form.business_address}{form.city_state_zip ? `, ${form.city_state_zip}` : ''}</span>}
                      {form.license_number && <span style={{ marginLeft: 12 }}>🏆 Lic# {form.license_number}</span>}
                    </div>
                    <span style={{ fontSize: 10, color: accent, fontWeight: 600 }}>Powered by Revanew.io</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Business Type ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: `${accent}10`, border: `1px solid ${accent}20`, fontSize: 13, color: 'var(--text-muted)' }}>
                🎯 Select your trade — we'll pre-load all your services automatically whenever you create a new quote.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                {TEMPLATE_OPTIONS.map(opt => {
                  const selected = form.business_type === opt.id;
                  return (
                    <button key={opt.id}
                      onClick={() => { set('business_type', opt.id); set('default_template', opt.id); }}
                      style={{
                        padding: '12px 10px', borderRadius: 12, border: selected ? `2px solid ${accent}` : '1.5px solid var(--border)',
                        background: selected ? `${accent}12` : 'var(--bg-raised)',
                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      }}>
                      <span style={{ fontSize: 24 }}>{opt.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: selected ? 700 : 500, color: selected ? accent : 'var(--text-primary)', lineHeight: 1.2 }}>{opt.label}</span>
                      {selected && <CheckCircle size={12} style={{ color: accent }} />}
                    </button>
                  );
                })}
              </div>

              {form.business_type && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: '#22c55e10', border: '1px solid #22c55e30', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', margin: 0 }}>
                      {TEMPLATE_OPTIONS.find(t => t.id === form.business_type)?.icon} {TEMPLATE_OPTIONS.find(t => t.id === form.business_type)?.label} selected
                    </p>
                    <p style={{ fontSize: 11, color: '#16a34a', margin: '2px 0 0', opacity: 0.8 }}>
                      Services will auto-load on every new quote — no manual setup needed
                    </p>
                  </div>
                </div>
              )}

              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 4px' }}>You can change this anytime</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Go to Account Settings → Business Type to switch your template or select "Other" for a blank quote.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--bg-surface)' }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)}
              style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              ← Back
            </button>
          ) : (
            <button onClick={() => onComplete?.()}
              style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Skip for now
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[1,2,3].map(s => (
              <div key={s} style={{ width: s === step ? 20 : 6, height: 6, borderRadius: 3, background: s === step ? accent : 'var(--border)', transition: 'all 0.2s' }} />
            ))}
          </div>

          {step < totalSteps ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!form.name.trim()}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: '#fff', cursor: form.name.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: form.name.trim() ? 1 : 0.5 }}>
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {saving ? '⏳ Saving…' : <><CheckCircle size={14} /> Save & Get Started</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
