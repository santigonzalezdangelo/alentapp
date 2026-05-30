import { LockerDTO } from '@alentapp/shared';

export interface LockerRepository {
create(locker: Omit<LockerDTO, 'id'>): Promise<LockerDTO>;
findByNumber(number: number): Promise<LockerDTO | null>;
findAll(): Promise<LockerDTO[]>;
findById(id: string): Promise<LockerDTO | null>;
update(id: string, data: Partial<LockerDTO>): Promise<LockerDTO>;
delete(id: string): Promise<void>;
releaseByMemberId(memberId: string): Promise<void>;
}