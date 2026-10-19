const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => `&#${String(char.codePointAt(0))};`);

/** Hosted pay page of the local mock gateway: one button per outcome (dev only, no card data). */
export const checkoutPage = (input: {
  readonly checkoutId: string;
  readonly amount: string;
  readonly currency: string;
}): string => {
  const id = encodeURIComponent(input.checkoutId);
  const button = (outcome: string, label: string): string =>
    `<form method="post" action="/checkout/${id}/${outcome}"><button type="submit">${label}</button></form>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mock gateway</title></head><body style="font-family:sans-serif;max-width:24rem;margin:2rem auto;padding:0 1rem"><h1>Mock payment</h1><p>Pay ${escapeHtml(input.amount)} ${escapeHtml(input.currency)}</p><p>Development gateway: no real money moves.</p>${button('success', 'Pay (success)')}${button('fail', 'Decline')}${button('pending', 'Leave pending')}${button('cancel', 'Cancel')}</body></html>`;
};
