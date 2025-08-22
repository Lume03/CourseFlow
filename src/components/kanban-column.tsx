import type { Task, Course, Group } from '@/lib/types';
import TaskCard from './task-card';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DroppableProvided } from '@hello-pangea/dnd';

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  isDraggedOver: boolean;
  courses: Course[];
  groups: Group[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  provided: DroppableProvided;
}

export default function KanbanColumn({ 
  title, 
  tasks, 
  courses, 
  groups, 
  onEditTask, 
  onDeleteTask, 
  isDraggedOver, 
  provided 
}: KanbanColumnProps) {
  return (
    <div
      {...provided.droppableProps}
      ref={provided.innerRef}
      className={cn(
        'flex flex-col rounded-lg bg-secondary/50 transition-colors duration-300',
        isDraggedOver && 'bg-primary/20'
      )}
    >
      <h2 className="p-4 text-lg font-semibold font-headline text-foreground sticky top-0 bg-secondary/50 backdrop-blur-sm rounded-t-lg z-10">
        {title}
      </h2>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4 pt-0">
          {tasks.map((task, index) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              index={index}
              courses={courses}
              groups={groups}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
            />
          ))}
          {provided.placeholder}
          {tasks.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground">
              <p>Arrastra tareas aquí.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
