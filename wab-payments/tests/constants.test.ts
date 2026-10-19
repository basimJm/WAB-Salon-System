import { HYPERPAY_PATHS } from '../src/constants/hyperpay';

describe('hyperpay paths', () => {
  it('encodes identifiers', () => {
    expect(HYPERPAY_PATHS.checkoutPayment('a/b c')).toBe('/v1/checkouts/a%2Fb%20c/payment');
    expect(HYPERPAY_PATHS.payment('p1')).toBe('/v1/payments/p1');
    expect(HYPERPAY_PATHS.queryById('q1')).toBe('/v1/query/q1');
    expect(HYPERPAY_PATHS.widgetScript('c&1')).toBe('/v1/paymentWidgets.js?checkoutId=c%261');
  });
});
