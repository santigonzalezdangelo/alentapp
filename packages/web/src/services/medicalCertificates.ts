import type { MedicalCertificateListItem, CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest, MedicalCertificateResponseDTO } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const medicalCertificatesService = {
  async getAll(): Promise<MedicalCertificateListItem[]> {
    const response = await fetch(`${API_URL}/medical-certificates`);
    if (!response.ok) {
      throw new Error('Error al obtener los certificados médicos');
    }
    const result = await response.json();
    return result.data;
  },

  async create(data: CreateMedicalCertificateRequest): Promise<MedicalCertificateResponseDTO> {
    const response = await fetch(`${API_URL}/medical-certificates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear el certificado médico');
    }
    const result = await response.json();
    return result.data;
  },

  async update(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificateResponseDTO> {
    const response = await fetch(`${API_URL}/medical-certificates/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al actualizar el certificado médico');
    }
    const result = await response.json();
    return result.data;
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/medical-certificates/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      const errorMessage =
        errorData?.error ||
        errorData?.message ||
        errorData?.details ||
        errorData?.errors?.[0]?.message ||
        'Error al eliminar el certificado médico';

      throw new Error(errorMessage);
    }
  },
};
