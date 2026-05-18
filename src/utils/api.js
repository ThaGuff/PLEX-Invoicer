const BASE = '/api';
let _getToken = async () => null;
let _onAuthError = null; // callback when 401 received

export function setTokenGetter(fn) { _getToken = fn; }
export function setAuthErrorHandler(fn) { _onAuthError = fn; }

async function req(method, path, body, retries = 1) {
  const token = await _getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));

    // Token expired or invalid — trigger re-auth
    if (res.status === 401) {
      console.warn('[API] 401 on', path, '— triggering auth refresh');
      if (_onAuthError) _onAuthError(path);
      throw new Error('Session expired. Please sign in again.');
    }

    if (!res.ok) throw new Error(data.error || `Request failed ${res.status}`);
    return data;
  } catch (e) {
    // Retry once on network errors (not auth errors)
    if (retries > 0 && !e.message.includes('Session expired')) {
      await new Promise(r => setTimeout(r, 800));
      return req(method, path, body, retries - 1);
    }
    throw e;
  }
}

export const api = {
  auth: {
    me:           ()     => req('GET',  '/auth/me'),
    sessionCheck: ()     => req('GET',  '/auth/session-check'),
    signout:      ()     => req('POST', '/auth/signout'),
  },
  billing: {
    createCheckout: (plan) => req('POST', '/billing/create-checkout', { plan }),
    portal:         ()     => req('POST', '/billing/portal'),
  },
  accounts: {
    list:          ()              => req('GET',    '/accounts'),
    get:           (id)            => req('GET',    `/accounts/${id}`),
    create:        (body)          => req('POST',   '/accounts', body),
    update:        (id, body)      => req('PATCH',  `/accounts/${id}`, body),
    delete:        (id)            => req('DELETE', `/accounts/${id}`),
    addSection:    (id, body)      => req('POST',   `/accounts/${id}/sections`, body),
    updateSection: (id, sid, body) => req('PATCH',  `/accounts/${id}/sections/${sid}`, body),
    deleteSection: (id, sid)       => req('DELETE', `/accounts/${id}/sections/${sid}`),
    addItem:       (id, body)      => req('POST',   `/accounts/${id}/items`, body),
    updateItem:    (id, iid, body) => req('PATCH',  `/accounts/${id}/items/${iid}`, body),
    deleteItem:    (id, iid)       => req('DELETE', `/accounts/${id}/items/${iid}`),
    uploadLogo:    (id, data_url)  => req('POST',   `/accounts/${id}/logo`, { logo_data_url: data_url }),
  },
  contacts: {
    list:   (accountId) => req('GET',    `/contacts?account_id=${accountId}`),
    create: (body)      => req('POST',   '/contacts', body),
    update: (id, body)  => req('PATCH',  `/contacts/${id}`, body),
    delete: (id)        => req('DELETE', `/contacts/${id}`),
  },
  quotes: {
    list:      (accountId) => req('GET',    `/quotes?account_id=${accountId}`),
    get:       (id)        => req('GET',    `/quotes/${id}`),
    getPublic: (token)     => req('GET',    `/quotes/public/${token}`),
    create:    (body)      => req('POST',   '/quotes', body),
    update:    (id, body)  => req('PATCH',  `/quotes/${id}`, body),
    convert:   (id)        => req('POST',   `/quotes/${id}/convert`),
    accept:    (token)     => req('POST',   `/quotes/public/${token}/accept`),
    delete:    (id)        => req('DELETE', `/quotes/${id}`),
  },
  invoices: {
    list:        (accountId) => req('GET',    `/invoices?account_id=${accountId}`),
    get:         (id)        => req('GET',    `/invoices/${id}`),
    getPublic:   (token)     => req('GET',    `/invoices/public/${token}`),
    update:      (id, body)  => req('PATCH',  `/invoices/${id}`, body),
    send:        (id)        => req('POST',   `/invoices/${id}/send`),
    markPaid:    (id, body)  => req('POST',   `/invoices/${id}/mark-paid`, body),
    paymentLink: (id)        => req('POST',   `/invoices/${id}/payment-link`),
    remind:      (id)        => req('POST',   `/invoices/${id}/remind`),
    delete:      (id)        => req('DELETE', `/invoices/${id}`),
    dashboard:   (accountId) => req('GET',    `/invoices/stats/dashboard?account_id=${accountId}`),
  },
  scrape: (url) => req('POST', '/scrape', { url }),

  stripeConnect: {
    status:           (accountId)      => req('GET',  `/stripe-connect/status/${accountId}`),
    oauthLink:        (accountId)      => req('GET',  `/stripe-connect/oauth-link?account_id=${accountId}`),
    disconnect:       (accountId)      => req('POST', '/stripe-connect/disconnect', { account_id: accountId }),
    setPlatformFee:   (accountId, pct) => req('POST', '/stripe-connect/set-platform-fee', { account_id: accountId, fee_pct: pct }),
    createPaymentLink:(invoiceId)      => req('POST', '/stripe-connect/create-payment-link', { invoice_id: invoiceId }),
  },

  tracking: {
    timeline:  (invoiceId) => req('GET', `/track/${invoiceId}/timeline`),
    view:      (token)     => fetch(`/api/track/${token}/view`, { method: 'POST' }),
    heartbeat: (token, s)  => fetch(`/api/track/${token}/heartbeat`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ seconds: s }) }),
    clickPay:  (token)     => fetch(`/api/track/${token}/click-pay`, { method: 'POST' }),
    pixelUrl:  (token)     => `/api/track/${token}/open.gif`,
  },

  ai: {
    parseInvoice: (text, account_id) => req('POST', '/ai/parse-invoice', { text, account_id }),
  },

  analytics: {
    cashflow:         (accountId)           => req('GET',  `/analytics/predictive-cashflow?account_id=${accountId}`),
    scheduleReminder: (invoice_id, account_id) => req('POST', '/analytics/schedule-reminder', { invoice_id, account_id }),
    runReminders:     ()                    => req('POST', '/analytics/run-reminders'),
  },

  webhooks: {
    list:   (accountId) => req('GET',    `/v1/integrations/rules?account_id=${accountId}`),
    create: (body)      => req('POST',   '/v1/integrations/rules', body),
    update: (id, body)  => req('PATCH',  `/v1/integrations/rules/${id}`, body),
    delete: (id)        => req('DELETE', `/v1/integrations/rules/${id}`),
  },

  feeRules: {
    get:  (accountId) => req('GET',  `/v1/integrations/fee-rules/${accountId}`),
    save: (body)      => req('POST', '/v1/integrations/fee-rules', body),
  },

  splitPayment: {
    get:     (token)       => fetch(`/api/v1/integrations/split-payment/${token}`).then(r => r.json()),
    pay:     (token, body) => req('POST', `/v1/integrations/split-payment/${token}/pay`, body),
    confirm: (token, body) => req('POST', `/v1/integrations/split-payment/${token}/confirm`, body),
  },

  versioning: {
    createVersion: (id, body) => req('POST', `/v1/integrations/invoice-version/${id}`, body),
    history:       (id)       => req('GET',  `/v1/integrations/invoice-history/${id}`),
  },

  admin: {
    users:         ()               => req('GET',    '/admin/users'),
    metrics:       ()               => req('GET',    '/admin/metrics'),
    userAccount:   (userId)         => req('GET',    `/admin/user/${userId}/account`),
    extendTrial:   (userId, days)   => req('POST',   `/admin/user/${userId}/extend-trial`, { days }),
    onboard:       (body)           => req('POST',   '/admin/onboard', body),
    broadcast:     (body)           => req('POST',   '/admin/broadcast', body),
    subscriptions: ()               => req('GET',    '/admin/subscriptions'),
    health:        ()               => req('GET',    '/admin/health'),
    suspend:       (id)             => req('POST',   `/admin/user/${id}/suspend`),
    unsuspend:     (id)             => req('POST',   `/admin/user/${id}/unsuspend`),
    resetPassword: (id)             => req('POST',   `/admin/user/${id}/reset-password`),
    confirmEmail:  (id)             => req('POST',   `/admin/user/${id}/resend-confirmation`),
    setPlan:       (id, plan, status) => req('POST', `/admin/user/${id}/set-plan`, { plan, status }),
    deleteUser:    (id)             => req('DELETE', `/admin/user/${id}`),
    magicLink:     (id)             => req('POST',   `/admin/user/${id}/magic-link`),
    activity:      (id)             => req('GET',    `/admin/user/${id}/activity`),
  },
};
