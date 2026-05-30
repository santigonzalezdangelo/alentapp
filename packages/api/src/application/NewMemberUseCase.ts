import { MemberRepository } from '../domain/MemberRepository.js';
import { MemberValidator } from '../domain/services/MemberValidator.js';
import { MemberDTO, CreateMemberRequest } from '@alentapp/shared';

export class CreateMemberUseCase {
    constructor(
        private readonly memberRepository: MemberRepository,
        private readonly memberValidator: MemberValidator
    ) {}

 async execute(data: CreateMemberRequest): Promise<MemberDTO> {
    this.memberValidator.validateEmail(data.email);
    this.memberValidator.validateBirthdate(data.birthdate); // 👈
    await this.memberValidator.validateDniIsUnique(data.dni);

    const isMinor = this.memberValidator.isMinor(data.birthdate);
    const finalCategory = isMinor ? 'Cadete' : data.category;

    const nuevoSocio = await this.memberRepository.create({
        ...data,
        category: finalCategory,
        status: 'Activo',
        created_at: new Date().toISOString(),
    });
    return nuevoSocio;
}
}
