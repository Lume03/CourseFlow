
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { estimateTaskEffort } from '@/ai/flows/estimate-task-effort';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Course, Group, Task, TaskStatus } from '@/lib/types';
import { Calendar as CalendarIcon, Wand2, Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio.'),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  groupId: z.string().min(1, 'Debes seleccionar un grupo.'),
  courseId: z.string().min(1, 'Debes seleccionar un curso.'),
  status: z.enum(['No Iniciado', 'En Progreso', 'Terminado']),
});

interface EditTaskDialogProps {
  task: Task;
  onEditTask: (updatedTask: Task) => void;
  courses: Course[];
  groups: Group[];
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskDialog({ task, onEditTask, courses, groups, children, open, onOpenChange }: EditTaskDialogProps) {
  const [useAi, setUseAi] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  // Effect to reset form when the task prop changes
  useEffect(() => {
    if (task) {
        const course = courses.find(c => c.id === task.courseId);
        form.reset({
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            groupId: course?.groupId || '',
            courseId: task.courseId,
            status: task.status,
        });
    }
  }, [task, form, courses]);


  const selectedGroupId = form.watch('groupId');

  const availableCourses = useMemo(() => {
    return courses.filter(course => course.groupId === selectedGroupId);
  }, [courses, selectedGroupId]);

  const handleEstimate = async () => {
    const description = form.getValues('description');
    if (!description || description.trim() === '') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor, introduce una descripción para la estimación.',
      });
      return;
    }
    setIsEstimating(true);
    try {
      const result = await estimateTaskEffort({ taskDescription: description });
      if (result.suggestedDeadline) {
        form.setValue('dueDate', new Date(result.suggestedDeadline), { shouldValidate: true });
      }
      toast({
        title: 'Estimación de IA Completa',
        description: `Esfuerzo: ${result.estimatedEffort}. ${result.reasoning}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error de IA',
        description: 'No se pudo estimar la tarea. Inténtalo de nuevo.',
      });
    } finally {
      setIsEstimating(false);
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedCourse = courses.find(c => c.id === values.courseId);

    if (!selectedCourse) {
        toast({ variant: 'destructive', title: 'Error', description: 'Curso no válido.'});
        return;
    }

    onEditTask({
      ...task,
      title: values.title,
      description: values.description,
      dueDate: values.dueDate,
      courseId: selectedCourse.id,
      color: selectedCourse.color,
      status: values.status,
    });

    onOpenChange(false);
  }
  
  const handleGroupChange = (groupId: string) => {
    form.setValue('groupId', groupId);
    form.resetField('courseId');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Editar Tarea</DialogTitle>
          <DialogDescription>
            Modifica los detalles de tu tarea. También puedes cambiar su estado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Implementar autenticación" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe la tarea..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center space-x-2 rounded-md border p-3 bg-background">
              <Switch id="ai-mode-edit" checked={useAi} onCheckedChange={setUseAi} />
              <Label htmlFor="ai-mode-edit" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" /> Estimador IA
              </Label>
            </div>
            
            {useAi && (
              <div className="space-y-2 p-3 border rounded-md bg-secondary/30">
                 <p className="text-sm text-muted-foreground">La IA usará la descripción para sugerir una fecha de entrega.</p>
                 <Button type="button" size="sm" onClick={handleEstimate} disabled={isEstimating}>
                  {isEstimating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Estimar con IA
                </Button>
              </div>
            )}
            
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha Límite</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: es })
                          ) : (
                            <span>Elige una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="groupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grupo</FormLabel>
                      <Select onValueChange={handleGroupChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groups.map(group => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Curso</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedGroupId}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={!selectedGroupId ? "Elige un grupo" : "Selecciona..."} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {availableCourses.map(course => (
                              <SelectItem key={course.id} value={course.id}>
                                  <div className="flex items-center">
                                      <span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: course.color }}></span>
                                      {course.name}
                                  </div>
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(['No Iniciado', 'En Progreso', 'Terminado'] as TaskStatus[]).map((status) => (
                           <SelectItem key={status} value={status}>
                             {status}
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
            <DialogFooter>
              <Button type="submit">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
