'use client';
import { useState } from 'react';
import type { Task, TaskStatus, Course, Group } from '@/lib/types';
import KanbanColumn from './kanban-column';

const STATUSES: TaskStatus[] = ['No Iniciado', 'En Progreso', 'Terminado'];

interface KanbanBoardProps {
  tasks: Task[];
  onTaskDrop: (taskId: string, newStatus: TaskStatus) => void;
  courses: Course[];
  groups: Group[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function KanbanBoard({ tasks, onTaskDrop, courses, groups, onEditTask, onDeleteTask }: KanbanBoardProps) {
  const [draggedOverColumn, setDraggedOverColumn] = useState<TaskStatus | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    setDraggedOverColumn(status);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    const taskId = e.dataTransfer.getData('taskId');
    onTaskDrop(taskId, status);
    setDraggedOverColumn(null);
  };

  return (
    <div className="grid h-full w-full grid-cols-1 gap-6 md:grid-cols-3">
      {STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          title={status}
          tasks={tasks.filter((task) => task.status === status)}
          onDragOver={(e) => handleDragOver(e, status)}
          onDrop={(e) => handleDrop(e, status)}
          onDragLeave={handleDragLeave}
          isDraggedOver={draggedOverColumn === status}
          courses={courses}
          groups={groups}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  );
}
