export type ResponsibleCategory = 'Pai' | 'Mãe' | 'Responsável Legal' | 'Outro';
export type UserRole = 'admin' | 'operator';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  schoolId?: string; // Se for operador, qual escola ele cuida
  name: string;
}

export type LeadStatus = 'Pendente' | 'Contatado' | 'Matriculado' | 'Desistente';

export interface School {
  id: string;
  name: string;
  codFilial: number;
  cnpj: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  uf: string;
  email?: string;
  phone?: string;
  active: boolean;
  courseIds?: string[];
}

export type CourseType = 'Ensino Fundamental – Anos Iniciais' | 'Ensino Fundamental – Anos Finais' | 'Ensino Médio';

export interface Course {
  id: string;
  name: string;
  type: CourseType;
  levels: string[];
  itinerary?: string;
}

export interface Lead {
  id: string;
  name: string;
  category: ResponsibleCategory;
  email: string;
  whatsapp: string;
  schoolId: string;
  courseId: string;
  grade: string;
  createdAt: any; // Firestore Timestamp
  status: LeadStatus;
  notes?: string;
}

export interface AppSettings {
  confirmationEmailTemplate: string;
  confirmationWhatsappTemplate: string;
  emailConfig?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    fromName: string;
    fromEmail: string;
  };
}
