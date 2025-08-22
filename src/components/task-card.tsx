import type { Task, Course, Group } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Calendar, GripVertical, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { EditTaskDialog } from './edit-task-dialog';
import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';

interface TaskCardProps {
  task: Task;
  index: number;
  courses: Course[];
  groups: Group[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TaskCard({ task, index, courses, groups, onEditTask, onDeleteTask }: TaskCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const isCompleted = task.status === 'Terminado';

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isCompleted}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'shadow-md hover:shadow-lg transition-all duration-300 group',
            snapshot.isDragging && 'shadow-xl scale-105',
            isCompleted 
              ? 'bg-green-100 dark:bg-green-900/40 border-green-500 cursor-default'
              : 'cursor-grab active:cursor-grabbing',
            task.isUrgent && !isCompleted && 'bg-red-100 dark:bg-red-900/40 border-red-500'
          )}
          style={{ 
            borderLeft: `5px solid ${isCompleted ? '#22c55e' : task.isUrgent ? '#ef4444' : task.color}`,
            ...provided.draggableProps.style 
          }}
        >
          <CardHeader className="p-4 pb-2 flex-row items-start justify-between">
            <CardTitle className={cn(
                "text-base font-semibold font-headline", 
                isCompleted && "text-green-900 dark:text-green-100",
                task.isUrgent && !isCompleted && "text-red-900 dark:text-red-100"
                )}>{task.title}</CardTitle>
            
            {isCompleted ? (
               <div className="h-5 w-5" />
            ) : (
              <div className="relative">
                 <div className="h-5 w-5 flex items-center justify-center">
                    <GripVertical className="h-5 w-5 text-muted-foreground opacity-50 transition-opacity group-hover:opacity-0" />
                 </div>
                <div className="absolute top-0 right-0 transition-opacity opacity-0 group-hover:opacity-100">
                   <EditTaskDialog
                    task={task}
                    onEditTask={onEditTask}
                    courses={courses}
                    groups={groups}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                  >
                    <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="focus:outline-none focus:ring-2 focus:ring-ring rounded-full p-1">
                               <MoreVertical className="h-5 w-5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Eliminar</span>
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará la tarea permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteTask(task.id)} className="bg-destructive hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </EditTaskDialog>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {task.description && (
              <CardDescription className={cn(
                  "mb-3 text-sm", 
                  isCompleted && "text-green-800 dark:text-green-200",
                  task.isUrgent && !isCompleted && "text-red-800 dark:text-red-200"
                  )}>{task.description}</CardDescription>
            )}
            {task.dueDate && (
              <div className={cn(
                  "flex items-center text-xs text-muted-foreground", 
                  isCompleted && "text-green-700 dark:text-green-300",
                  task.isUrgent && !isCompleted && "text-red-700 dark:text-red-300"
                  )}>
                <Calendar className="mr-1.5 h-4 w-4" />
                <span>{format(task.dueDate, 'd MMM, yyyy', { locale: es })}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
