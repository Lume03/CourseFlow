export type TaskStatus = 'No Iniciado' | 'En Progreso' | 'Terminado';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  color: string;
  status: TaskStatus;
  ownerId: string;
  ownerType: 'course' | 'group';
}

export interface Course {
  id: string;
  name: string;
  color: string;
}

export interface Group {
    id: string;
    name: string;
    color: string;
}

export type FilterType = 'this-week' | 'this-month' | 'all';
