import { CreateSportRequest, SportDTO, UpdateSportRequest } from '@alentapp/shared';

// Puerto de salida del dominio.
// Define las operaciones que necesitan los casos de uso sin depender de Prisma.
export interface SportRepository {
    // Crea un nuevo deporte.
    create(sport: CreateSportRequest): Promise<SportDTO>;

    // Busca un deporte activo por nombre.
    findActiveByName(name: string): Promise<SportDTO | null>;

    // Devuelve todos los deportes activos para mostrarlos en el listado.
    findAllActive(): Promise<SportDTO[]>;

    // Busca un deporte por su identificador.
    findById(id: string): Promise<SportDTO | null>;

    // Actualiza parcialmente los campos editables de un deporte.
    update(id: string, data: UpdateSportRequest): Promise<SportDTO>;

    //borrado logico de un deporte
    softDelete(id: string): Promise<void>;
}