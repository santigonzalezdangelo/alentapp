import { LockerRepository } from '../domain/LockerRepository.js';

export class DeleteLockerUseCase {
    constructor(
    private readonly lockerRepo: LockerRepository
) {}

    async execute(id: string): Promise<void> {
    const locker = await this.lockerRepo.findById(id);

    if (!locker) {
    throw new Error('El locker no existe');
    }

    if (locker.status === 'OCCUPIED') {
    throw new Error('No se puede eliminar un locker ocupado');
    }

    await this.lockerRepo.delete(id);
}
}