import { ERROR_CODES } from '../constants/codes';
import { PaymentSdkError } from '../errors';
import type {
  GatewayCapabilities,
  GatewayCheckoutRequest,
  GatewayWebhookEvent,
  PaymentGateway,
  PaymentSession,
  PaymentVerification,
  RefundResult,
} from '../types';
import { createCheckout, fetchPayment, type HyperPayContext } from './session';

const notBuilt = (what: string): PaymentSdkError =>
  new PaymentSdkError(ERROR_CODES.UNKNOWN, `${what} is not available yet`);

/** HyperPay (ACI OPP / COPYandPAY) behind the stable gateway port. */
export class HyperPayGateway implements PaymentGateway {
  readonly name = 'hyperpay';
  readonly capabilities: GatewayCapabilities = {
    partialRefunds: true,
    splitPayments: false,
    webhooks: true,
    cancelSession: false,
  };

  constructor(private readonly ctx: HyperPayContext) {}

  createCheckout(request: GatewayCheckoutRequest): Promise<PaymentSession> {
    return createCheckout(this.ctx, request);
  }

  fetchPayment(sessionId: string): Promise<PaymentVerification> {
    return fetchPayment(this.ctx, sessionId);
  }

  refund(): Promise<RefundResult> {
    return Promise.reject(notBuilt('refund'));
  }

  fetchRefund(): Promise<RefundResult> {
    return Promise.reject(notBuilt('refund status'));
  }

  parseWebhook(): Promise<GatewayWebhookEvent> {
    return Promise.reject(notBuilt('webhook handling'));
  }
}
