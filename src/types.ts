export type ResponsibleCategory = 'Pai' | 'Mãe' | 'Responsável Legal' | 'Outro';
export type LeadStatus = 'Pendente' | 'Contatado' | 'Matriculado' | 'Desistente';

export interface School {
  id: string;
  name: string;
  city: string;
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
}

export interface AppSettings {
  confirmationEmailTemplate: string;
  confirmationWhatsappTemplate: string;
}
