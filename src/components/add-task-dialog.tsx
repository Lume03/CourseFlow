'use client';

import { useState } from 'react';
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
  DialogTrigger,
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
import type { Course, Group, Task } from '@/lib/types';
import { Calendar as CalendarIcon, Wand2, PlusCircle, Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio.'),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  owner: z.string().min(1, 'Debes seleccionar un curso o grupo.'),
});

interface AddTaskDialogProps {
  onAddTask: (newTask: Omit<Task, 'id' | 'status'>) => void;
  courses: Course[];
  groups: Group[];
}

export function AddTaskDialog({ onAddTask, courses, groups }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const owners = [
    { label: 'Cursos', options: courses },
    { label: 'Grupos', options: groups },
  ];

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
    const [ownerType, ownerId] = values.owner.split(':');
    const ownerList = ownerType === 'course' ? courses : groups;
    const ownerDetails = ownerList.find(o => o.id === ownerId);

    if (!ownerDetails) {
        toast({ variant: 'destructive', title: 'Error', description: 'Curso o grupo no válido.'});
        return;
    }

    onAddTask({
      title: values.title,
      description: values.description,
      dueDate: values.dueDate,
      ownerId: ownerDetails.id,
      ownerType: ownerType as 'course' | 'group',
      color: ownerDetails.color,
    });

    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Tarea
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Nueva Tarea</DialogTitle>
          <DialogDescription>
            Añade los detalles de tu nueva tarea. Puedes usar la IA para estimar la fecha de entrega.
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
              <Switch id="ai-mode" checked={useAi} onCheckedChange={setUseAi} />
              <Label htmlFor="ai-mode" className="flex items-center gap-2">
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

            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
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
              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Curso/Grupo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {owners.map(ownerGroup => (
                            <div key={ownerGroup.label}>
                                <Label className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">{ownerGroup.label}</Label>
                                {ownerGroup.options.map(option => (
                                    <SelectItem key={`${ownerGroup.label === 'Cursos' ? 'course' : 'group'}:${option.id}`} value={`${ownerGroup.label === 'Cursos' ? 'course' : 'group'}:${option.id}`}>
                                        <div className="flex items-center">
                                            <span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: option.color }}></span>
                                            {option.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </div>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="submit">Crear Tarea</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
