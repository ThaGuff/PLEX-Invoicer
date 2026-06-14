/**
 * TermsPage.jsx — Invoice King Terms of Service
 * Required for Google Play Store listing.
 * Hosted at invoiceking.app/terms
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

const font = "'Inter', sans-serif";
const C = {
  dark:   '#1A1A1A',
  green:  '#C6E404',
  lime:   '#C6E404',
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
            <svg width="32" height="40" viewBox="0 0 80 100" fill="none">
              <rect x="2" y="36" width="76" height="8" rx="2" fill="#C6E404"/>
              <polygon points="12,18 22,36 2,36" fill="#C6E404"/>
              <polygon points="68,18 78,36 58,36" fill="#C6E404"/>
              <rect x="28" y="22" width="24" height="14" fill="#C6E404"/>
              <polygon points="22,36 28,30 25,36" fill="#F5F6F7"/>
              <polygon points="52,36 58,30 55,36" fill="#F5F6F7"/>
              <polygon points="40,7 47,15 40,23 33,15" fill="#C6E404"/>
              <polygon points="40,11 44,15 40,19 36,15" fill="#A8C200"/>
              <path d="M4,44 L4,92 Q4,96 8,96 L56,96 Q60,96 60,92 L60,58 L46,44 Z" fill="#0A0F13"/>
              <polygon points="46,44 60,58 46,58" fill="#C6E404"/>
              <rect x="10" y="62" width="28" height="26" rx="1.5" fill="white"/>
              <rect x="14" y="68" width="20" height="3.5" rx="1.5" fill="#0A0F13"/>
              <rect x="14" y="75" width="14" height="3.5" rx="1.5" fill="#0A0F13"/>
              <rect x="14" y="82" width="18" height="3.5" rx="1.5" fill="#C6E404"/>
            </svg>
          </div>
          <span style={{ fontSize:16, fontWeight:800, color:C.dark, letterSpacing:'-0.02em' }}>Invoice King</span>
        </button>
        <div style={{ display:'flex', gap:16 }}>
          <button onClick={() => navigate('/privacy')} style={{ fontSize:13, fontWeight:600, color:C.muted, background:'none', border:'none', cursor:'pointer', fontFamily:font }}>Privacy</button>
          <button onClick={() => navigate('/login')} style={{ fontSize:13, fontWeight:700, color:C.dark, background:'none', border:'none', cursor:'pointer', fontFamily:font }}>Sign in →</button>
        </div>
      </div>
    </nav>
  );
}

export default function TermsPage() {
  const updated = 'June 9, 2026';

  const sections = [
    {
      title: '1. Acceptance of Terms',
      body: `By accessing or using Invoice King ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.

These Terms apply to all users of the Service, including businesses and individuals who create accounts, send quotes, process payments, or otherwise interact with the platform.`
    },
    {
      title: '2. Description of Service',
      body: `Invoice King is a cloud-based business management platform for service businesses. The Service includes tools for creating and sending quotes and invoices, processing payments via Stripe, managing client contacts, tracking time, and related features.

The Service is operated by PLEX Automation. We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time with reasonable notice.`
    },
    {
      title: '3. Account Registration',
      body: `To use most features of Invoice King, you must create an account. You agree to:
- Provide accurate, current, and complete information during registration
- Maintain the security of your account credentials
- Notify us immediately of any unauthorized access or breach
- Accept responsibility for all activity that occurs under your account

You must be at least 18 years old to create an account and use the Service.`
    },
    {
      title: '4. Subscription Plans and Payment',
      body: `Invoice King offers free and paid subscription plans. Paid plans are billed on a monthly or annual basis. By subscribing to a paid plan, you authorize us to charge your payment method on a recurring basis.

Free trials: where offered, free trials automatically convert to paid subscriptions at the end of the trial period unless cancelled.

Refunds: monthly subscriptions may be cancelled at any time; no partial-month refunds are issued. Annual subscriptions cancelled within 14 days of renewal are eligible for a prorated refund.

Pricing may change with 30 days' advance notice to active subscribers.`
    },
    {
      title: '5. Acceptable Use',
      body: `You agree not to use the Service to:
- Violate any applicable law or regulation
- Infringe the intellectual property rights of others
- Transmit spam, unsolicited messages, or fraudulent content
- Impersonate any person or entity
- Process payments for illegal goods or services
- Interfere with or disrupt the Service or its infrastructure
- Attempt unauthorized access to any part of the Service

We reserve the right to suspend or terminate accounts that violate these standards.`
    },
    {
      title: '6. Payment Processing',
      body: `Payment processing is provided by Stripe, Inc. By using payment features in Invoice King, you agree to Stripe's Terms of Service (stripe.com/legal) and Privacy Policy (stripe.com/privacy).

Invoice King does not store credit card numbers. All payment data is handled directly by Stripe using PCI-DSS compliant infrastructure.

You are responsible for ensuring that your use of Stripe through Invoice King complies with applicable laws and Stripe's own acceptable use policy.`
    },
    {
      title: '7. Intellectual Property',
      body: `The Invoice King application, including its design, code, branding, and content, is owned by PLEX Automation and protected by copyright, trademark, and other intellectual property laws.

You retain ownership of the content you create using the Service (quotes, invoices, client data). By using the Service, you grant us a limited license to store, process, and display your content solely to provide the Service to you.`
    },
    {
      title: '8. Limitation of Liability',
      body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, INVOICEKING AND PLEX AUTOMATION SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE.

OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM YOUR USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM.`
    },
    {
      title: '9. Disclaimer of Warranties',
      body: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.

We do not provide legal, financial, tax, or accounting advice. Consult qualified professionals for advice specific to your situation.`
    },
    {
      title: '10. Termination',
      body: `You may cancel your account at any time from the billing settings in the app. Upon cancellation, your access to paid features will continue until the end of the current billing period.

We may suspend or terminate your account if you violate these Terms, with or without notice depending on the severity of the violation. Upon termination, your right to use the Service ceases immediately.`
    },
    {
      title: '11. Governing Law',
      body: `These Terms are governed by the laws of the State of Alabama, United States, without regard to its conflict-of-law provisions. Any disputes shall be resolved in the courts located in Madison County, Alabama.`
    },
    {
      title: '12. Changes to Terms',
      body: `We reserve the right to update these Terms at any time. We will notify you of material changes by email or through a prominent in-app notice at least 14 days before the changes take effect. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.`
    },
    {
      title: '13. Contact',
      body: `For questions about these Terms, contact us:

Invoice King / PLEX Automation
Email: legal@invoiceking.app
Support: support@invoiceking.app
Website: https://invoiceking.app`
    },
  ];

  return (
    <div style={{ fontFamily:font, background:'#fff', minHeight:'100vh' }}>
      <LegalNav />

      <div style={{ maxWidth:800, margin:'0 auto', padding:'56px 24px 96px' }}>
        <div style={{ marginBottom:48 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.green, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:12 }}>Legal</div>
          <h1 style={{ fontSize:'clamp(32px,5vw,48px)', fontWeight:900, color:C.dark, letterSpacing:'-0.03em', margin:'0 0 16px' }}>Terms of Service</h1>
          <p style={{ fontSize:15, color:C.muted, margin:0 }}>Last updated: {updated}</p>
        </div>

        <div style={{ background:C.cream, borderRadius:14, padding:'24px 28px', marginBottom:40, border:`1px solid ${C.border}` }}>
          <p style={{ fontSize:15, color:C.dark, lineHeight:1.7, margin:0, fontWeight:500 }}>
            Please read these Terms of Service carefully before using Invoice King. These Terms constitute a legally binding agreement between you and PLEX Automation regarding your use of the Invoice King platform.
          </p>
        </div>

        {sections.map(({ title, body }) => (
          <div key={title} style={{ marginBottom:40 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:C.dark, letterSpacing:'-0.02em', margin:'0 0 12px', paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>{title}</h2>
            {body.split('\n\n').map((para, i) => (
              <p key={i} style={{ fontSize:15, color:C.muted, lineHeight:1.75, margin:'0 0 14px', whiteSpace:'pre-line' }}>{para}</p>
            ))}
          </div>
        ))}

        <div style={{ marginTop:56, paddingTop:24, borderTop:`1px solid ${C.border}`, display:'flex', gap:24, flexWrap:'wrap' }}>
          <a href="/privacy" style={{ fontSize:13, fontWeight:600, color:C.green, textDecoration:'none' }}>Privacy Policy</a>
          <a href="mailto:legal@invoiceking.app" style={{ fontSize:13, fontWeight:600, color:C.green, textDecoration:'none' }}>legal@invoiceking.app</a>
        </div>
      </div>
    </div>
  );
}
