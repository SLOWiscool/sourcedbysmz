import { describe, it, expect, beforeEach, vi } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const discountsMod = await import('../../server/discounts.js');
const watchlistMod = await import('../../server/watchlist.js');

const tmpFile = (name: string) => join(tmpdir(), `sbmz-test-${name}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.json`);

describe('discount codes', () => {
  let file: string;
  beforeEach(() => {
    file = tmpFile('discounts');
    discountsMod.setDiscountsFile(file);
  });

  it('creates, validates and applies a percent code', () => {
    discountsMod.saveDiscount({ code: 'welcome10', type: 'percent', value: 10, active: true });
    const result = discountsMod.applyDiscount('  welcome10 ', 5000);
    expect(result.amount).toBe(500);
    expect(result.code).toBe('WELCOME10');
  });

  it('caps fixed codes at the subtotal and rejects bad codes', () => {
    discountsMod.saveDiscount({ code: 'FIVER', type: 'fixed', value: 500, active: true });
    expect(discountsMod.applyDiscount('FIVER', 300).amount).toBe(300);
    expect(() => discountsMod.applyDiscount('NOPE', 5000)).toThrowError(expect.objectContaining({ status: 400 }));
    expect(() => discountsMod.saveDiscount({ code: 'FIVER', type: 'fixed', value: 100, active: true })).toThrow(/already used/);
    expect(() => discountsMod.saveDiscount({ code: 'BIG', type: 'percent', value: 95, active: true })).toThrow(/90%/);
  });

  it('enforces expiry, usage limits and minimum spend', () => {
    discountsMod.saveDiscount({ code: 'OLD', type: 'percent', value: 10, active: true, expiresAt: '2020-01-01T00:00:00Z' });
    expect(() => discountsMod.applyDiscount('OLD', 5000)).toThrowError(expect.objectContaining({ status: 400 }));
    discountsMod.saveDiscount({ code: 'ONCE', type: 'percent', value: 10, active: true, maxUses: 1 });
    discountsMod.incrementUsage('ONCE');
    expect(() => discountsMod.applyDiscount('ONCE', 5000)).toThrowError(expect.objectContaining({ status: 400 }));
    discountsMod.saveDiscount({ code: 'BIGSPEND', type: 'percent', value: 10, active: true, minSubtotal: 10000 });
    expect(() => discountsMod.applyDiscount('BIGSPEND', 5000)).toThrowError(expect.objectContaining({ status: 400 }));
    discountsMod.saveDiscount({ code: 'PAUSED', type: 'percent', value: 10, active: false });
    expect(() => discountsMod.applyDiscount('PAUSED', 5000)).toThrowError(expect.objectContaining({ status: 400 }));
  });

  it('usage only moves when told to (paid webhook), never on preview', () => {
    discountsMod.saveDiscount({ code: 'ONCE2', type: 'percent', value: 10, active: true, maxUses: 5 });
    discountsMod.applyDiscount('ONCE2', 5000);
    discountsMod.applyDiscount('ONCE2', 5000);
    const [record] = discountsMod.listDiscounts().filter((d: { code: string }) => d.code === 'ONCE2');
    expect(record.usedCount).toBe(0);
    discountsMod.incrementUsage('ONCE2');
    expect(discountsMod.listDiscounts().find((d: { code: string }) => d.code === 'ONCE2').usedCount).toBe(1);
  });
});

describe('watchlist subscriptions', () => {
  let file: string;
  const known = new Set(['p-test']);
  beforeEach(() => {
    file = tmpFile('watchlist');
    watchlistMod.setWatchlistFile(file);
  });

  it('subscribes, dedupes silently and unsubscribes by token', () => {
    const first = watchlistMod.subscribe('p-test', 'Fan@Example.com', known);
    expect(first.ok).toBe(true);
    const second = watchlistMod.subscribe('p-test', 'fan@example.com', known);
    expect(second.duplicate).toBe(true);
    expect(watchlistMod.listSubscriptions().length).toBe(1);
    expect(watchlistMod.unsubscribe(first.token).ok).toBe(true);
    expect(watchlistMod.listSubscriptions().length).toBe(0);
  });

  it('rejects bad emails and unknown products', () => {
    expect(() => watchlistMod.subscribe('p-test', 'not-an-email', known)).toThrowError(
      expect.objectContaining({ status: 400 })
    );
    expect(() => watchlistMod.subscribe('p-nope', 'a@b.co', known)).toThrowError(
      expect.objectContaining({ status: 404 })
    );
  });

  it('finds watchers only when a product newly becomes buyable', () => {
    const base = {
      id: 'p-test', status: 'draft', price: 0, stockQuantity: 0, variants: [],
    };
    const live = { ...base, status: 'active', price: 2000, stockQuantity: 3 };
    const subs: Array<{ token: string; productId: string; email: string; notifiedAt: string | null }> = [
      { token: 't1', productId: 'p-test', email: 'a@b.co', notifiedAt: null },
      { token: 't2', productId: 'p-test', email: 'b@b.co', notifiedAt: '2026-01-01T00:00:00Z' },
      { token: 't3', productId: 'p-other', email: 'c@b.co', notifiedAt: null },
    ];
    const tokens = (list: unknown) => (list as typeof subs).map((s) => s.token);
    expect(tokens(watchlistMod.findNewlyAvailableWatchers(base, live, subs))).toEqual(['t1']);
    expect(watchlistMod.findNewlyAvailableWatchers(live, live, subs)).toEqual([]);
    expect(watchlistMod.findNewlyAvailableWatchers(base, base, subs)).toEqual([]);
    expect(tokens(watchlistMod.findNewlyAvailableWatchers(null, live, subs))).toEqual(['t1']);
  });
});

describe('outgoing mail boundary', () => {
  let emailMod: {
    setOutboxFile: (path: string) => void;
    getOutbox: () => Array<Record<string, unknown>>;
    sendStockAlert: (args: { to: string; productSlug: string; productTitle: string; unsubscribeToken: string; transportOverride?: unknown; fetchImpl?: unknown }) => Promise<{ sent: boolean }>;
    verifySendPulseAuth: (fetchImpl?: unknown) => Promise<Record<string, unknown>>;
  };
  beforeEach(async () => {
    emailMod = await import('../../server/email.js');
    emailMod.setOutboxFile(tmpFile('outbox'));
  });

  it('sends through an injected transport and records the outbox', async () => {
    const sent: Array<{ to: string; headers: Record<string, string> }> = [];
    const transport = {
      sendMail: async (msg: { to: string; headers: Record<string, string> }) => {
        sent.push(msg);
        return { accepted: [msg.to], messageId: 'm1' };
      },
    };
    const result = await emailMod.sendStockAlert({
      to: 'fan@example.com',
      productSlug: 'down-vest',
      productTitle: 'Down Vest',
      unsubscribeToken: 'tok123',
      transportOverride: transport,
    });
    expect(result.sent).toBe(true);
    expect(sent.length).toBe(1);
    expect(sent[0]?.to).toBe('fan@example.com');
    expect(sent[0]?.headers['List-Unsubscribe']).toContain('tok123');
    const outbox = emailMod.getOutbox();
    expect(outbox[outbox.length - 1]).toMatchObject({ status: 'sent' });
  });

  it('records failures with the reason instead of dropping mail', async () => {
    const transport = { sendMail: async () => { throw new Error('ECONNREFUSED port 25 blocked'); } };
    await expect(
      emailMod.sendStockAlert({
        to: 'fan@example.com',
        productSlug: 'down-vest',
        productTitle: 'Down Vest',
        unsubscribeToken: 'tok123',
        transportOverride: transport,
      })
    ).rejects.toThrow(/port 25 blocked/);
    const outbox = emailMod.getOutbox();
    expect(outbox[outbox.length - 1]).toMatchObject({ status: 'failed', to: 'fan@example.com' });
  });

  it('sends through SendPulse when the API key is set, with the documented payload shape', async () => {
    const calls: Array<{ url: string; init: { headers: Record<string, string>; body: string } }> = [];
    const stubFetch = async (url: string, init: { headers: Record<string, string>; body: string }) => {
      calls.push({ url, init });
      return { ok: true, json: async () => ({ result: true }) };
    };
    process.env.SENDPULSE_API_KEY = 'sp_test_key';
    try {
      const result = await emailMod.sendStockAlert({
        to: 'fan@example.com',
        productSlug: 'down-vest',
        productTitle: 'Down Vest',
        unsubscribeToken: 'tok123',
        fetchImpl: stubFetch,
      });
      expect(result.sent).toBe(true);
      expect(calls.length).toBe(1);
      expect(calls[0]?.url).toBe('https://api.sendpulse.com/smtp/emails');
      expect(calls[0]?.init.headers.Authorization).toBe('Bearer sp_test_key');
      const body = JSON.parse(calls[0]?.init.body || '{}');
      expect(body.email.subject).toContain('Down Vest');
      expect(body.email.from.email).toBe('sender@sourcedbysmz.co.uk');
      expect(body.email.to).toEqual([{ email: 'fan@example.com' }]);
      expect(typeof body.email.html).toBe('string');
      expect(Buffer.from(body.email.html, 'base64').toString('utf8')).toContain('Down Vest');
    } finally {
      delete process.env.SENDPULSE_API_KEY;
      vi.unstubAllGlobals();
    }
  });

  it('uses a custom verified sender when configured', async () => {
    const calls: Array<{ url: string; init: { body: string } }> = [];
    const stubFetch = async (_url: string, init: { body: string }) => {
      calls.push({ url: _url, init });
      return { ok: true, json: async () => ({ result: true }) };
    };
    process.env.SENDPULSE_API_KEY = 'sp_test_key';
    process.env.SENDPULSE_API_FROM_EMAIL = 'alerts@sourcedbysmz.co.uk';
    try {
      await emailMod.sendStockAlert({
        to: 'fan@example.com',
        productSlug: 'down-vest',
        productTitle: 'Down Vest',
        unsubscribeToken: 'tok123',
        fetchImpl: stubFetch,
      });
      expect(JSON.parse(calls[0]?.init.body || '{}').email.from.email).toBe('alerts@sourcedbysmz.co.uk');
    } finally {
      delete process.env.SENDPULSE_API_KEY;
      delete process.env.SENDPULSE_API_FROM_EMAIL;
    }
  });

  it('verifyAuth hits GET /user/info and surfaces auth failures', async () => {    const stubOk = async (_url: string) => ({
      ok: true,
      json: async () => ({ email: 'owner@example.com' }),
    });
    process.env.SENDPULSE_API_KEY = 'sp_test_key';
    const seen: string[] = [];
    const spy = async (url: string) => { seen.push(url); return stubOk(url); };
    try {
      const me = await emailMod.verifySendPulseAuth(spy);
      expect(seen).toEqual(['https://api.sendpulse.com/user/info']);
      expect(me.email).toBe('owner@example.com');
    } finally {
      delete process.env.SENDPULSE_API_KEY;
    }
    process.env.SENDPULSE_API_KEY = 'sp_test_key';
    try {
      await expect(emailMod.verifySendPulseAuth(async () => ({ ok: false, status: 401, text: async () => 'Unauthorized' }))).rejects.toThrow(/401/);
    } finally {
      delete process.env.SENDPULSE_API_KEY;
    }
  });

  it('listSendPulseSenders hits GET /smtp/from-list', async () => {
    const stubFetch = async (url) => {
      expect(url).toBe('https://api.sendpulse.com/smtp/from-list');
      return { ok: true, json: async () => [{ email: 'devtest@sendpulseemail.com', active: 1 }] };
    };
    process.env.SENDPULSE_API_KEY = 'sp_test_key';
    try {
      const senders = await emailMod.listSendPulseSenders(stubFetch);
      expect(senders).toEqual([{ email: 'devtest@sendpulseemail.com', active: 1 }]);
    } finally {
      delete process.env.SENDPULSE_API_KEY;
    }
  });

  it('surfaces quota exhaustion as a rate-limit error, not a silent failure', async () => {
    process.env.SENDPULSE_API_KEY = 'sp_test_key';
    try {
      await expect(
        emailMod.sendStockAlert({
          to: 'fan@example.com',
          productSlug: 'down-vest',
          productTitle: 'Down Vest',
          unsubscribeToken: 'tok123',
          fetchImpl: stubFetch,
        })
      ).rejects.toThrow(/rate limit/i);
    } finally {
      delete process.env.SENDPULSE_API_KEY;
    }
  });

  it('translates SendPulse sender rejection into an actionable error', async () => {
    const stubFetch = async () => ({
      ok: false,
      status: 422,
      text: async () => '{"message":"Sender is not valid","error_code":422}',
    });
    process.env.SENDPULSE_API_KEY = 'sp_test_key';
    try {
      await expect(
        emailMod.sendStockAlert({
          to: 'fan@example.com',
          productSlug: 'down-vest',
          productTitle: 'Down Vest',
          unsubscribeToken: 'tok123',
          fetchImpl: stubFetch,
        })
      ).rejects.toThrow(/verified sender/);
    } finally {
      delete process.env.SENDPULSE_API_KEY;
    }
  });
