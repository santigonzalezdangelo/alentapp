import type { PaymentDTO, CreatePaymentRequest, UpdatePaymentRequest } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const paymentsService = {
  async getAll(): Promise<PaymentDTO[]> {
    const response = await fetch(`${API_URL}/pagos`);
    if (!response.ok) {
      throw new Error('Error al obtener los pagos');
    }
    const result = await response.json();
    return result.data;
  },

  async create(data: CreatePaymentRequest): Promise<PaymentDTO> {
    const response = await fetch(`${API_URL}/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al crear el pago');
    }
    const result = await response.json();
    return result.data;
  },

  async update(id: string, data: UpdatePaymentRequest): Promise<PaymentDTO> {
    const response = await fetch(`${API_URL}/pagos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al actualizar el pago');
    }
    const result = await response.json();
    return result.data;
  },

  async pay(id: string): Promise<PaymentDTO> {
    const response = await fetch(`${API_URL}/pagos/${id}/pay`, {
      method: 'PATCH',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al procesar el cobro');
    }
    const result = await response.json();
    return result.data;
  },

  async cancel(id: string): Promise<PaymentDTO> {
    const response = await fetch(`${API_URL}/pagos/${id}/cancel`, {
      method: 'PATCH',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al anular el pago');
    }
    const result = await response.json();
    return result.data;
  },
};