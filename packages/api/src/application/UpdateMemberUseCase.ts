import { MemberRepository } from '../domain/MemberRepository.js';
import { MemberValidator } from '../domain/services/MemberValidator.js';
import { MemberDTO, UpdateMemberRequest } from '@alentapp/shared';

export class UpdateMemberUseCase {
    constructor(
        private readonly memberRepo: MemberRepository,
        private readonly memberValidator: MemberValidator
    ) {}

    async execute(id: string, data: UpdateMemberRequest): Promise<MemberDTO> {
    const existingMember = await this.memberRepo.findById(id);
    if (!existingMember) {
        throw new Error('El miembro no existe');
    }

    if (data.email) {
        this.memberValidator.validateEmail(data.email);
    }
    if (data.dni && data.dni !== existingMember.dni) {
        await this.memberValidator.validateDniIsUnique(data.dni, id);
    }
    if (data.birthdate) {
        this.memberValidator.validateBirthdate(data.birthdate); // 👈
    }

    let finalData = { ...data };
    const birthdateStr = data.birthdate || existingMember.birthdate;
    if (birthdateStr) {
        if (this.memberValidator.isMinor(birthdateStr)) {
            finalData.category = 'Cadete';
        }
    }
    return this.memberRepo.update(id, finalData);
}

}
