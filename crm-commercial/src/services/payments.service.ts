import api from './api';
import type { PaginatedResult } from './users.service';

export type PaymentTargetType = 'invoice' | 'order' | 'quote_deposit';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'expired';

export interface Payment {
  id: string;
  targetType: PaymentTargetType;
  targetId: string;
  projectId: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  description: string | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  customerEmail: string | null;
  receiptUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentLinkResponse {
  payment: Payment;
  payUrl: string;
}

export interface PaymentFilter {
  status?: PaymentStatus;
  targetType?: PaymentTargetType;
  targetId?: string;
  projectId?: string;
}

export const paymentsService = {
  /** Crée (ou réutilise) un lien de paiement Stripe pour une cible. */
  async createLink(
    targetType: PaymentTargetType,
    targetId: string,
    depositPercent?: number
  ): Promise<CreatePaymentLinkResponse> {
    const body: Record<string, unknown> = { targetType, targetId };
    if (depositPercent != null) body.depositPercent = depositPercent;
    const response = await api.post<CreatePaymentLinkResponse>('/api/payments', body);
    return response.data;
  },

  async list(
    filter?: PaymentFilter,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<Payment>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    if (filter?.status) params.append('status', filter.status);
    if (filter?.targetType) params.append('targetType', filter.targetType);
    if (filter?.targetId) params.append('targetId', filter.targetId);
    if (filter?.projectId) params.append('projectId', filter.projectId);
    const response = await api.get<PaginatedResult<Payment>>(
      `/api/payments?${params.toString()}`
    );
    return response.data;
  },

  async get(id: string): Promise<Payment> {
    const response = await api.get<Payment>(`/api/payments/${id}`);
    return response.data;
  },
};

export default paymentsService;
