// ==========================================
// Member
// ==========================================
export type MemberCategory = 'Pleno' | 'Cadete' | 'Honorario';
export type MemberStatus = 'Activo' | 'Moroso' | 'Suspendido';

export interface MemberDTO {
  id: string; // UUID
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
  status: MemberStatus;
  created_at: string; // ISO Date String
}

export interface CreateMemberRequest {
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
}

export interface UpdateMemberRequest {
  dni?: string;
  name?: string;
  email?: string;
  birthdate?: string;
  category?: MemberCategory;
  status?: MemberStatus;
}

// ==========================================
// Locker
// ==========================================

export type LockerLocation = 'MALE' | 'FEMALE' | 'CHILDREN';
export type LockerStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';

export interface LockerDTO {
  id: string;
  number: number;
  location: LockerLocation;
  status: LockerStatus;
  member_id: string | null;
  contract_end_date: string | null; // ISO Date String (YYYY-MM-DD) or null
}

export interface CreateLockerRequest {
  number: number;
  location: LockerLocation;
}

export type UpdateLockerRequest = {
  status?: 'AVAILABLE' | 'MAINTENANCE';
  member_id?: string | null;
  contract_end_date?: string | null;
};

// ==========================================
// Medical Certificate
// ==========================================
export type MedicalCertificateStatus = 'in_review' | 'validated' | 'historical';

export interface MedicalCertificateResponseDTO {
  id: string;
  member_id: string;
  issue_date: string;
  expiry_date: string;
  doctor_license: string;
  institution: string;
  status: MedicalCertificateStatus;
  deleted_at: string | null;
}

export interface MedicalCertificateListItem extends MedicalCertificateResponseDTO {
  member_dni: string;
}

export interface CreateMedicalCertificateRequest {
  issue_date: string;
  expiry_date: string;
  doctor_license: string;
  institution: string;
  member_id: string;
}

export interface UpdateMedicalCertificateRequest {
  issue_date?: string;
  expiry_date?: string;
  doctor_license?: string;
  institution?: string;
  status?: 'in_review' | 'validated';
}

// ==========================================
// Payment
// ==========================================
export type PaymentStatus = 'Pendiente' | 'Pagado' | 'Cancelado';

export interface PaymentDTO {
  id: string;
  member_id: string;
  amount: number;
  month: number;
  year: number;
  status: PaymentStatus;
  due_date: string;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
  canceled_at: string | null;
}

export interface CreatePaymentRequest {
  member_id: string;
  amount: number;
  month: number;
  year: number;
  due_date: string;
}

export interface UpdatePaymentRequest {
  amount?: number;
  due_date?: string;
}

export interface PaymentResponse {
  data: PaymentDTO;
}

export interface PaymentsResponse {
  data: PaymentDTO[];
}

// ==========================================
// Discipline
// ==========================================
export interface DisciplineDTO {
  id: string; // UUID
  reason: string;
  start_date: string; // ISO Date String
  end_date: string; // ISO Date String
  is_total_suspension: boolean;
  deleted_at: string | null; // ISO Date String or null
  member_id: string; // UUID
}

export interface CreateDisciplineRequest {
  reason: string;
  start_date: string; // ISO Date String
  end_date: string; // ISO Date String
  is_total_suspension: boolean;
  member_id: string; // UUID
}

export interface UpdateDisciplineRequest {
  reason?: string;
  start_date?: string;
  end_date?: string;
  is_total_suspension?: boolean;
}

// ==========================================
// Sport
// ==========================================
export interface SportDTO {
  id: string;
  name: string;
  description: string;
  max_capacity: number;
  additional_price: number;
  requires_medical_certificate: boolean;
  deleted_at: string | null;
}

export interface CreateSportRequest {
  name: string;
  description: string;
  max_capacity: number;
  additional_price: number;
  requires_medical_certificate: boolean;
}

export interface UpdateSportRequest {
  description?: string;
  max_capacity?: number;
  additional_price?: number;
  requires_medical_certificate?: boolean;
}