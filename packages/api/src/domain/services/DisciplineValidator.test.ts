import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisciplineValidator } from './DisciplineValidator.js';
import { MemberRepository } from '../MemberRepository.js';

describe('DisciplineValidator', () => {
    // Creamos un Mock del repositorio para aislar el test de la Base de Datos
    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const validator = new DisciplineValidator(mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateEndDateAfterStartDate', () => {
        it('debe pasar si la fecha de fin es posterior a la fecha de inicio', () => {
            expect(() =>
                validator.validateEndDateAfterStartDate(
                    '2026-05-01T00:00:00.000Z', 
                    '2026-05-10T00:00:00.000Z')
            ).not.toThrow();
        });


        it('debe lanzar error si la fecha de fin es menor a la fecha de inicio', () => {
            expect(() => 
                validator.validateEndDateAfterStartDate(
                    '2026-05-10T00:00:00.000Z', 
                    '2026-05-05T00:00:00.000Z'
                )
            ).toThrow('La fecha de fin debe ser estrictamente posterior a la fecha de inicio');
        });

        it('debe lanzar error si la fecha de fin es igual a la fecha de inicio', () => {
            expect(() =>
                validator.validateEndDateAfterStartDate(
                    '2026-05-10T00:00:00.000Z', 
                    '2026-05-10T00:00:00.000Z'
                )
            ).toThrow('La fecha de fin debe ser estrictamente posterior a la fecha de inicio');
        });
    });

    describe('validateMemberExists', () => {
        it('debe pasar si el socio existe', async () => {
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({ id: 'member-1' } as any);

            await expect(validator.validateMemberExists('member-1')).resolves.not.toThrow();

            expect(mockMemberRepo.findById).toHaveBeenCalledWith('member-1');
        });

        it('debe lanzar error si el socio no existe', async () => {
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

            await expect(validator.validateMemberExists('nonexistent-member')).rejects.toThrow('El socio no existe');

            expect(mockMemberRepo.findById).toHaveBeenCalledWith('nonexistent-member');
        });
    });

    describe('validateHasUpdateFields', () => {
        it('debe pasar si se envía al menos un campo para actualizar', () => {
            expect(() =>
                validator.validateHasUpdateFields({ reason: 'Nueva razón' })
            ).not.toThrow();
        });

        it('debe lanzar error si no se envía ningún campo para actualizar', () => {
            expect(() =>
                validator.validateHasUpdateFields({})
            ).toThrow('Debe enviarse al menos un campo para actualizar');
        });
    });

    describe('validateMemberIdIsNotPresent', () => {
        it('debe pasar si no se incluye member_id en los datos', () => {
            expect(() =>
                validator.validateMemberIdIsNotPresent({ reason: 'Nueva razón' })
            ).not.toThrow();
        });

        it('debe lanzar error si se incluye member_id en los datos', () => { 
            expect(() =>
                validator.validateMemberIdIsNotPresent({ member_id: 'member-1' })
            ).toThrow('No se permite modificar el socio asociado a la sanción');
        });
    });
});


