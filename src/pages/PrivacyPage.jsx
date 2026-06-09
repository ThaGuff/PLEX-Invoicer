/**
 * PrivacyPage.jsx — Invoice King Privacy Policy
 * Required for Google Play Store listing.
 * Hosted at invoiceking.app/privacy
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

const font = "'Inter', sans-serif";
const C = {
  dark:   '#1A1A1A',
  green:  '#C8E20A',
  lime:   '#C8E20A',
  cream:  '#F5F5F5',
  muted:  '#5A7060',
  border: '#E2E8E2',
};

function LegalNav() {
  const navigate = useNavigate();
  return (
    <nav style={{ position:'sticky', top:0, background:'rgba(255,255,255,0.96)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${C.border}`, zIndex:100, padding:'0 24px', fontFamily:font }}>
      <div style={{ maxWidth:800, margin:'0 auto', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:0 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:C.dark, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="14" height="16" viewBox="0 0 18 20" fill="none">
              <rect x="2" y="1" width="3.2" height="18" rx="1.6" fill={C.green}/>
              <rect x="5" y="1" width="7.5" height="2.8" rx="1.4" fill={C.green}/>
              <rect x="5" y="8.6" width="6.5" height="2.8" rx="1.4" fill={C.green}/>
              <rect x="10.5" y="1" width="2.8" height="10.5" rx="1.4" fill={C.green}/>
              <line x1="6.5" y1="12" x2="16" y2="19.5" stroke={C.green} strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize:16, fontWeight:800, color:C.dark, letterSpacing:'-0.02em' }}>Invoice King</span>
        </button>
        <div style={{ display:'flex', gap:16 }}>
          <button onClick={() => navigate('/terms')} style={{ fontSize:13, fontWeight:600, color:C.muted, background:'none', border:'none', cursor:'pointer', fontFamily:font }}>Terms</button>
          <button onClick={() => navigate('/login')} style={{ fontSize:13, fontWeight:700, color:C.dark, background:'none', border:'none', cursor:'pointer', fontFamily:font }}>Sign in →</button>
        </div>
      </div>
    </nav>
  );
}

export default function PrivacyPage() {
  const updated = 'June 9, 2026';

  const sections = [
    {
      title: '1. Information We Collect',
      body: `We collect information you provide directly to us when you create an account, build a quote, send an invoice, or contact us for support. This includes your name, email address, business name, and billing information.

We also collect usage data automatically — including pages visited, features used, device type, IP address, and browser type — to improve the service and diagnose issues.

When you connect a payment method through Stripe, payment card data is processed and stored by Stripe, Inc. Invoice King does not store raw card numbers.`
    },
    {
      title: '2. How We Use Your Information',
      body: `We use the information we collect to:
- Provide, maintain, and improve the Invoice King service
- Process transactions and send related confirmations
- Send you technical notices, updates, and support messages
- Respond to your comments and questions
- Monitor and analyze usage patterns to improve the app
- Detect, investigate, and prevent fraudulent or abusive activity
- Comply with legal obligations

We do not sell, rent, or share your personal information with third parties for their marketing purposes.`
    },
    {
      title: '3. Data Storage and Security',
      body: `Your data is stored on secure servers hosted by Railway and Supabase. We use industry-standard encryption (TLS 1.2+) for data in transit and AES-256 encryption for data at rest.

We implement access controls, audit logs, and regular security reviews. Our authentication is managed by Supabase Auth, which follows SOC 2 Type II compliance standards.

Despite these measures, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.`
    },
    {
      title: '4. Third-Party Services',
      body: `Invoice King integrates with the following third-party services:

- Stripe (payment processing) — stripe.com/privacy
- Supabase (authentication and database) — supabase.com/privacy
- Railway (infrastructure hosting) — railway.app/legal/privacy
- Anthropic Claude API (AI assistant features) — anthropic.com/privacy
- Google Calendar (optional integration) — policies.google.com/privacy

Each third party has its own privacy policy governing their handling of your data.`
    },
    {
      title: '5. Data Retention',
      body: `We retain your account data for as long as your account is active or as needed to provide the service. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it by law (e.g., financial records required for tax compliance).

You may export your data at any time from your account settings before deletion.`
    },
    {
      title: '6. Your Rights',
      body: `Depending on your location, you may have the right to:
- Access the personal information we hold about you
- Correct inaccurate or incomplete information
- Request deletion of your personal information
- Object to or restrict certain processing
- Receive your data in a portable format
- Withdraw consent at any time

To exercise these rights, contact us at privacy@invoiceking.app. We will respond within 30 days.`
    },
    {
      title: '7. Cookies',
      body: `Invoice King uses cookies and similar tracking technologies to maintain your session, remember your preferences, and analyze usage. We use only essential session cookies — we do not use advertising cookies or cross-site tracking.

You can control cookie settings in your browser, though disabling essential cookies may impact app functionality.`
    },
    {
      title: '8. Children\'s Privacy',
      body: `Invoice King is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately at privacy@invoiceking.app.`
    },
    {
      title: '9. Changes to This Policy',
      body: `We may update this Privacy Policy from time to time. We will notify you of material changes by email or through a prominent notice in the app. Continued use of Invoice King after changes become effective constitutes your acceptance of the revised policy.`
    },
    {
      title: '10. Contact Us',
      body: `If you have questions or concerns about this Privacy Policy, please contact us:

Invoice King / PLEX Automation
Email: privacy@invoiceking.app
Support: support@invoiceking.app
Website: https://invoiceking.app`
    },
  ];

  return (
    <div style={{ fontFamily:font, background:'#fff', minHeight:'100vh' }}>
      <LegalNav />

      <div style={{ maxWidth:800, margin:'0 auto', padding:'56px 24px 96px' }}>
        {/* Header */}
        <div style={{ marginBottom:48 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.green, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:12 }}>Legal</div>
          <h1 style={{ fontSize:'clamp(32px,5vw,48px)', fontWeight:900, color:C.dark, letterSpacing:'-0.03em', margin:'0 0 16px' }}>Privacy Policy</h1>
          <p style={{ fontSize:15, color:C.muted, margin:0 }}>Last updated: {updated}</p>
        </div>

        {/* Intro */}
        <div style={{ background:C.cream, borderRadius:14, padding:'24px 28px', marginBottom:40, border:`1px solid ${C.border}` }}>
          <p style={{ fontSize:15, color:C.dark, lineHeight:1.7, margin:0, fontWeight:500 }}>
            Invoice King ("we," "our," or "us") is operated by PLEX Automation. This Privacy Policy explains how we collect, use, and protect your information when you use the Invoice King application at invoiceking.app, including our mobile PWA and any related services.
          </p>
        </div>

        {/* Sections */}
        {sections.map(({ title, body }) => (
          <div key={title} style={{ marginBottom:40 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:C.dark, letterSpacing:'-0.02em', margin:'0 0 12px', paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>{title}</h2>
            {body.split('\n\n').map((para, i) => (
              <p key={i} style={{ fontSize:15, color:C.muted, lineHeight:1.75, margin:'0 0 14px', whiteSpace:'pre-line' }}>{para}</p>
            ))}
          </div>
        ))}

        {/* Footer links */}
        <div style={{ marginTop:56, paddingTop:24, borderTop:`1px solid ${C.border}`, display:'flex', gap:24, flexWrap:'wrap' }}>
          <a href="/terms" style={{ fontSize:13, fontWeight:600, color:C.green, textDecoration:'none' }}>Terms of Service</a>
          <a href="mailto:privacy@invoiceking.app" style={{ fontSize:13, fontWeight:600, color:C.green, textDecoration:'none' }}>privacy@invoiceking.app</a>
        </div>
      </div>
    </div>
  );
}
