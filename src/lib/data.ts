import type { Course, Group, Task } from './types';

export const initialCourses: Course[] = [
  { id: 'course-1', name: 'Gestión de Proyectos', color: '#86A8E7' },
  { id: 'course-2', name: 'Algorítmica', color: '#5FFBF1' },
  { id: 'course-3', name: 'Diseño UX/UI', color: '#F2B880' },
];

export const initialGroups: Group[] = [
  { id: 'group-1', name: 'Personal', color: '#D4A5A5' },
  { id: 'group-2', name: 'Trabajo Urgente', color: '#FF6961' },
];

export const initialTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Definir el alcance del proyecto final',
    description: 'Crear el documento de alcance y obtener aprobación.',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
    status: 'No Iniciado',
    ownerId: 'course-1',
    ownerType: 'course',
    color: '#86A8E7',
  },
  {
    id: 'task-2',
    title: 'Implementar algoritmo de Dijkstra',
    description: 'Resolver el problema de la ruta más corta en un grafo ponderado.',
    status: 'En Progreso',
    ownerId: 'course-2',
    ownerType: 'course',
    color: '#5FFBF1',
  },
  {
    id: 'task-3',
    title: 'Crear wireframes de la app',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 10)),
    status: 'En Progreso',
    ownerId: 'course-3',
    ownerType: 'course',
    color: '#F2B880',
  },
  {
    id: 'task-4',
    title: 'Completar el sprint planning',
    status: 'Terminado',
    ownerId: 'course-1',
    ownerType: 'course',
    color: '#86A8E7',
  },
  {
    id: 'task-5',
    title: 'Hacer la compra semanal',
    status: 'No Iniciado',
    ownerId: 'group-1',
    ownerType: 'group',
    color: '#D4A5A5',
  },
  {
    id: 'task-6',
    title: 'Preparar informe de ventas Q2',
    description: 'Recopilar datos y generar el informe para la reunión del viernes.',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 2)),
    status: 'En Progreso',
    ownerId: 'group-2',
    ownerType: 'group',
    color: '#FF6961',
  },
  {
    id: 'task-7',
    title: 'Investigar librerías de D&D',
    status: 'Terminado',
    ownerId: 'course-3',
    ownerType: 'course',
    color: '#F2B880',
  },
];
