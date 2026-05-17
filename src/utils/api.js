const BASE = '/api';
let _getToken = async () => null;
export function setTokenGetter(fn) { _getToken = fn; }

async function req(method, path, body) {
  const token = await _getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed ${res.status}`);
  return data;
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
};
