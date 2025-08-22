import type { Task } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Calendar, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';


interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('taskId', task.id);
  };
  
  const isCompleted = task.status === 'Terminado';

  return (
    <Card
      draggable={!isCompleted}
      onDragStart={handleDragStart}
      className={cn(
        'shadow-md hover:shadow-lg transition-all duration-300',
        isCompleted 
          ? 'bg-green-100 dark:bg-green-900/40 border-green-500 cursor-default'
          : 'cursor-grab active:cursor-grabbing',
        task.isUrgent && !isCompleted && 'border-red-500 shadow-red-500/30'
      )}
      style={{ borderLeft: `5px solid ${isCompleted ? '#22c55e' : task.isUrgent ? '#ef4444' : task.color}` }}
    >
      <CardHeader className="p-4 pb-2 flex-row items-start justify-between">
        <CardTitle className={cn("text-base font-semibold font-headline", isCompleted && "text-green-900 dark:text-green-100")}>{task.title}</CardTitle>
        <GripVertical className={cn("h-5 w-5 text-muted-foreground", isCompleted && "hidden")} />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {task.description && (
          <CardDescription className={cn("mb-3 text-sm", isCompleted && "text-green-800 dark:text-green-200")}>{task.description}</CardDescription>
        )}
        {task.dueDate && (
          <div className={cn("flex items-center text-xs text-muted-foreground", isCompleted && "text-green-700 dark:text-green-300")}>
            <Calendar className="mr-1.5 h-4 w-4" />
            <span>{format(task.dueDate, 'd MMM, yyyy', { locale: es })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
