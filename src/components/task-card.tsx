import type { Task } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Calendar, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      className="cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-shadow"
      style={{ borderLeft: `5px solid ${task.color}` }}
    >
      <CardHeader className="p-4 pb-2 flex-row items-start justify-between">
        <CardTitle className="text-base font-semibold font-headline">{task.title}</CardTitle>
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {task.description && (
          <CardDescription className="mb-3 text-sm">{task.description}</CardDescription>
        )}
        {task.dueDate && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="mr-1.5 h-4 w-4" />
            <span>{format(task.dueDate, 'd MMM, yyyy', { locale: es })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
