import { MemberRepository } from '../domain/MemberRepository.js';
import { LockerRepository } from '../domain/LockerRepository.js';

export class DeleteMemberUseCase {
    constructor(private readonly memberRepo: MemberRepository, private readonly lockerRepo: LockerRepository,) {}

    async execute(id: string): Promise<void> {
        // Validar existencia del miembro
        const existingMember = await this.memberRepo.findById(id);
        if (!existingMember) {
            throw new Error('El miembro no existe');
        }

        await this.lockerRepo.releaseByMemberId(id);

        // Ejecutar eliminación
        await this.memberRepo.delete(id);
    }
}
