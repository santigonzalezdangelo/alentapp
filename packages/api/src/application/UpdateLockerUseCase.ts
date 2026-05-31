import {
    LockerDTO,
    UpdateLockerRequest,
} from '@alentapp/shared';

import { LockerRepository } from '../domain/LockerRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';

export class UpdateLockerUseCase {
    constructor(
        private readonly lockerRepo: LockerRepository,
        private readonly memberRepo: MemberRepository,
        private readonly lockerValidator: LockerValidator,
    ) {}

async execute(id: string, data: UpdateLockerRequest): Promise<LockerDTO> {
        const locker = await this.lockerRepo.findById(id);
        if (!locker) {
            throw new Error('El locker no existe');
        }

        this.lockerValidator.validateStatus(data.status);
        this.lockerValidator.validateContractEndDate(data.contract_end_date);

const isRelease = data.member_id === null;
const isAssign = data.member_id !== undefined && data.member_id !== null;
const isMaintenance = data.status === 'MAINTENANCE';

if (isAssign) {
    this.lockerValidator.validateMaintenanceBlock(locker);
    this.lockerValidator.validateAlreadyOccupied(locker, data.member_id);

    const member = await this.memberRepo.findById(data.member_id!);
    if (!member) throw new Error('El socio no existe');
}

const hasMember =
    data.member_id !== undefined
        ? data.member_id
        : locker.member_id;

if (data.contract_end_date && !hasMember) {
    throw new Error('No se puede asignar fecha de contrato sin socio');
}

const updated: any = { ...data };


if (isMaintenance) {
    updated.status = 'MAINTENANCE';
    updated.member_id = locker.member_id;
    return this.lockerRepo.update(id, updated);
}

if (isRelease) {
    updated.member_id = null;
    updated.contract_end_date = null;
        if (locker.status !== 'MAINTENANCE') {
        updated.status = 'AVAILABLE';
    }
    return this.lockerRepo.update(id, updated);
}

if (isAssign) {
    updated.status = 'OCCUPIED';
}

return this.lockerRepo.update(id, updated);
}
}