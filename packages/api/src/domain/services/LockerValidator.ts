import { CreateLockerRequest } from '@alentapp/shared';
import { LockerRepository } from '../LockerRepository.js';

export class LockerValidator {
    constructor(private readonly repo: LockerRepository) {}

    validateRequiredFields(data: CreateLockerRequest): void {
        if (
            data.number === undefined ||
            data.number === null ||
            data.location === undefined ||
            data.location === null
        ) {
            throw new Error('Todos los campos son requeridos');
        }
    }

    validateNumber(number: number): void {
        if (!Number.isInteger(number)) {
            throw new Error('El número de locker debe ser un entero válido');
        }

        if (number <= 0) {
            throw new Error('El número de locker debe ser mayor a cero');
        }
    }

    validateLocation(location: string): void {
        const valid = ['MALE', 'FEMALE', 'CHILDREN'];

        if (!valid.includes(location)) {
            throw new Error('La ubicación seleccionada no es válida');
        }
    }

    async validateUniqueNumber(number: number): Promise<void> {
        const exists = await this.repo.findByNumber(number);

        if (exists) {
            throw new Error('Ya existe un locker con ese número');
        }
    }

    async validateExists(id: string) {
    const locker = await this.repo.findById(id);
    if (!locker) throw new Error('El locker no existe');
}

    validateStatus(status?: string) {
    const valid = ['AVAILABLE', 'MAINTENANCE'];
    if (status && !valid.includes(status)) {
    throw new Error('Estado inválido');
    }
}

validateContractEndDate(date?: string | null): void {
    if (!date) return;

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error('Formato de fecha inválido');
    }

    const year = parsedDate.getUTCFullYear();

    if (year > 9999) {
        throw new Error('Formato de fecha inválido');
    }

    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    if (parsedDate < todayUTC) {
        throw new Error('La fecha de fin de contrato no puede ser anterior a hoy');
    }
}

validateMaintenanceBlock(locker: any) {
    if (locker.status === 'MAINTENANCE') {
    throw new Error('El locker está en mantenimiento');
    }
}

validateAlreadyOccupied(locker: any, member_id?: string | null) {
    if (member_id && locker.member_id && locker.member_id !== member_id) {
    throw new Error('El locker ya se encuentra asignado');
    }
}
}