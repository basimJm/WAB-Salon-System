import type {
  ClientCheckout,
  GatewayCapabilities,
  GatewayCheckoutRequest,
  GatewayRefundRequest,
  GatewayWebhookEvent,
  WebhookInput,
  PaymentGateway,
  PaymentSession,
  PaymentVerification,
  RefundResult,
} from '../types';
import { fetchRefund, refund } from './refunds';
import { parseWebhook } from './webhook';
import { clientCheckout, createCheckout, fetchPayment, type HyperPayContext } from './session';

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

  clientCheckout(sessionId: string, method: string): ClientCheckout {
    return clientCheckout(this.ctx, sessionId, method);
  }

  fetchPayment(sessionId: string): Promise<PaymentVerification> {
    return fetchPayment(this.ctx, sessionId);
  }

  refund(request: GatewayRefundRequest): Promise<RefundResult> {
    return refund(this.ctx, request);
  }

  fetchRefund(refundId: string): Promise<RefundResult> {
    return fetchRefund(this.ctx, refundId);
  }

  parseWebhook(input: WebhookInput): Promise<GatewayWebhookEvent> {
    return parseWebhook(this.ctx, input);
  }
}
