import type { DisciplineDTO, CreateDisciplineRequest, UpdateDisciplineRequest } from '@alentapp/shared';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const disciplinesService = {
    async getAll(): Promise<DisciplineDTO[]> {
        const response = await fetch(`${API_URL}/disciplines`);
        if (!response.ok) {
            throw new Error('Error al obtener las sanciones');
        }
        const result = await response.json();
        return result.data;
    },

    async create(data: CreateDisciplineRequest): Promise<DisciplineDTO> {
        const response = await fetch(`${API_URL}/disciplines`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);

            const errorMessage =
                errorData?.error ||
                errorData?.message ||
                errorData?.details ||
                errorData?.errors?.[0]?.message ||
                "Error al crear la sanción";

            throw new Error(errorMessage);
        }

        const result = await response.json();
        return result.data;
    },

    async update(id: string, data: UpdateDisciplineRequest): Promise<DisciplineDTO> {
        const response = await fetch(`${API_URL}/disciplines/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);

            const errorMessage =
                errorData?.error ||
                errorData?.message ||
                errorData?.details ||
                errorData?.errors?.[0]?.message ||
                "Error al actualizar la sanción";

            throw new Error(errorMessage);
        }

        const result = await response.json();
        return result.data;
    },

    async delete(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/disciplines/${id}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);

            const errorMessage =
                errorData?.error ||
                errorData?.message ||
                errorData?.details ||
                errorData?.errors?.[0]?.message ||
                "Error al eliminar la sanción";

            throw new Error(errorMessage);
        }
    }
};