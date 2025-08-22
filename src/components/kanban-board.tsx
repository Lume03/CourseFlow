'use client';
import type { Task, TaskStatus, Course, Group } from '@/lib/types';
import KanbanColumn from './kanban-column';
import { DragDropContext, Droppable, OnDragEndResponder } from '@hello-pangea/dnd';

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

  const onDragEnd: OnDragEndResponder = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    
    const newStatus = destination.droppableId as TaskStatus;
    onTaskDrop(draggableId, newStatus);
  };
  
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid h-full w-full grid-cols-1 gap-6 md:grid-cols-3">
        {STATUSES.map((status) => (
            <Droppable key={status} droppableId={status}>
              {(provided, snapshot) => (
                <KanbanColumn
                  title={status}
                  tasks={tasks.filter((task) => task.status === status)}
                  courses={courses}
                  groups={groups}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  provided={provided}
                  isDraggedOver={snapshot.isDraggingOver}
                />
              )}
            </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
