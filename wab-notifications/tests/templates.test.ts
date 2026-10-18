import { TEMPLATE_IDS, escapeHtml, renderEmail } from '../src/templates';
import { MESSAGES } from '../src/templates/messages';

const PARAMS: Record<string, Record<string, string>> = {
  ADMIN_2FA: { code: '123456', minutes: '5' },
  ALERT: { title: 'Payment failures', message: '7 failures in 10 minutes' },
  REPORT_READY: { reportName: 'Daily 2026-10-14' },
};

describe('renderEmail', () => {
  it.each(
    TEMPLATE_IDS.flatMap((id) =>
      (['ar', 'en'] as const).map((language) => [id, language] as const),
    ),
  )('%s in %s fills every placeholder', (template, language) => {
    const rendered = renderEmail({
      template,
      language,
      params: PARAMS[template] ?? {},
      actionUrl: 'https://admin.example.com/x',
    });
    for (const part of [rendered.subject, rendered.text, rendered.html])
      expect(part).not.toMatch(/\{[A-Za-z0-9_]+\}/);
    expect(rendered.html).toContain(`lang="${language}"`);
    expect(rendered.html).toContain(language === 'ar' ? 'dir="rtl"' : 'dir="ltr"');
    expect(rendered.subject).toContain('WAB');
  });

  it('renders the 2FA code in subject-safe text and body', () => {
    const rendered = renderEmail({
      template: 'ADMIN_2FA',
      language: 'en',
      params: PARAMS.ADMIN_2FA ?? {},
    });
    expect(rendered.text).toContain('123456');
    expect(rendered.text).toContain('5 minutes');
    expect(rendered.subject).toBe('WAB: your sign-in code');
  });

  it('uses the supplied brand name and colour', () => {
    const rendered = renderEmail({
      template: 'REPORT_READY',
      language: 'en',
      params: PARAMS.REPORT_READY ?? {},
      brandName: 'Acme',
      brandColor: '#112233',
      actionUrl: 'https://x.example.com/r',
    });
    expect(rendered.subject).toContain('Acme');
    expect(rendered.html).toContain('#112233');
  });

  it('includes a button only when the template has an action and a link is given', () => {
    const withLink = renderEmail({
      template: 'ALERT',
      language: 'en',
      params: PARAMS.ALERT ?? {},
      actionUrl: 'https://a.example.com/p?q=1&r=2',
    });
    expect(withLink.text).toContain('Open in admin panel: https://a.example.com/p?q=1&r=2');
    expect(withLink.html).toContain('href="https://a.example.com/p?q=1&amp;r=2"');
    const withoutLink = renderEmail({
      template: 'ALERT',
      language: 'en',
      params: PARAMS.ALERT ?? {},
    });
    expect(withoutLink.html).not.toContain('<a ');
    const noAction = renderEmail({
      template: 'ADMIN_2FA',
      language: 'en',
      params: PARAMS.ADMIN_2FA ?? {},
      actionUrl: 'https://a.example.com',
    });
    expect(noAction.html).not.toContain('<a ');
    expect(MESSAGES.en.ADMIN_2FA.action).toBeUndefined();
  });

  it('escapes HTML in parameters but keeps plain text readable', () => {
    const rendered = renderEmail({
      template: 'ALERT',
      language: 'en',
      params: { title: 'A & B', message: '<script>alert("x")</script>' },
    });
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;');
    expect(rendered.text).toContain('<script>alert("x")</script>');
  });

  it('keeps the subject on one line', () => {
    const rendered = renderEmail({
      template: 'ALERT',
      language: 'en',
      params: { title: 'a\r\nBcc: x@y.z', message: 'm' },
    });
    expect(rendered.subject).not.toMatch(/[\r\n]/);
  });

  it('rejects a missing parameter', () => {
    expect(() =>
      renderEmail({ template: 'ADMIN_2FA', language: 'en', params: { code: '1' } }),
    ).toThrow('missing template parameter: minutes');
    expect(() => renderEmail({ template: 'ADMIN_2FA', language: 'en' })).toThrow(
      'missing template parameter',
    );
  });

  it.each([
    'http://evil.example.com',
    'javascript:alert(1)',
    'https://a b.example.com',
    'https://x.example.com/"onclick="x',
  ])('rejects an unsafe action url %s', (actionUrl) => {
    expect(() =>
      renderEmail({ template: 'ALERT', language: 'en', params: PARAMS.ALERT ?? {}, actionUrl }),
    ).toThrow('actionUrl must be an https link');
  });

  it('allows plain http on localhost for dev', () => {
    expect(() =>
      renderEmail({
        template: 'ALERT',
        language: 'en',
        params: PARAMS.ALERT ?? {},
        actionUrl: 'http://localhost:3000/alerts',
      }),
    ).not.toThrow();
    expect(() =>
      renderEmail({
        template: 'ALERT',
        language: 'en',
        params: PARAMS.ALERT ?? {},
        actionUrl: 'http://127.0.0.1',
      }),
    ).not.toThrow();
  });

  it('has the same placeholders in both languages', () => {
    const names = (text: string): string[] =>
      [...text.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1] ?? '').sort();
    for (const id of TEMPLATE_IDS) {
      for (const field of ['subject', 'heading', 'body', 'footer'] as const) {
        expect(names(MESSAGES.ar[id][field])).toEqual(names(MESSAGES.en[id][field]));
      }
      expect(MESSAGES.ar[id].action === undefined).toBe(MESSAGES.en[id].action === undefined);
    }
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
});
