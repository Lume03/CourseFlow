export type TaskStatus = 'No Iniciado' | 'En Progreso' | 'Terminado';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  color: string;
  status: TaskStatus;
  courseId: string;
}

export interface Course {
  id: string;
  name: string;
  color: string;
  groupId: string;
}

export interface Group {
    id: string;
    name: string;
}

export type FilterType = 'this-week' | 'this-month' | 'all';
