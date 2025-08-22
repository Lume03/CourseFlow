
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Group, Course } from '@/lib/types';
import { Settings, PlusCircle, Trash2, Palette, RefreshCw } from 'lucide-react';

interface ManageDataSheetProps {
  groups: Group[];
  courses: Course[];
  onAddGroup: (name: string) => void;
  onDeleteGroup: (id: string) => void;
  onAddCourse: (name: string, color: string, groupId: string) => void;
  onDeleteCourse: (id: string) => void;
}

const addGroupSchema = z.object({
  name: z.string().min(1, 'El nombre del grupo es obligatorio.'),
});

const addCourseSchema = z.object({
  name: z.string().min(1, 'El nombre del curso es obligatorio.'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'El color debe ser un hexadecimal válido (ej: #RRGGBB)'),
  groupId: z.string().min(1, 'Debes seleccionar un grupo.'),
});

const PRESET_COLORS = ['#86A8E7', '#5FFBF1', '#F2B880', '#FF6961', '#D4A5A5', '#B2F7EF', '#F7D794', '#F67280'];

export function ManageDataSheet({
  groups,
  courses,
  onAddGroup,
  onDeleteGroup,
  onAddCourse,
  onDeleteCourse,
}: ManageDataSheetProps) {

  const groupForm = useForm<z.infer<typeof addGroupSchema>>({
    resolver: zodResolver(addGroupSchema),
    defaultValues: { name: '' },
  });

  const courseForm = useForm<z.infer<typeof addCourseSchema>>({
    resolver: zodResolver(addCourseSchema),
    defaultValues: { name: '', color: PRESET_COLORS[0], groupId: '' },
  });

  function onGroupSubmit(values: z.infer<typeof addGroupSchema>) {
    onAddGroup(values.name);
    groupForm.reset();
  }

  function onCourseSubmit(values: z.infer<typeof addCourseSchema>) {
    onAddCourse(values.name, values.color, values.groupId);
    courseForm.reset();
    courseForm.setValue('color', PRESET_COLORS[0]);
  }
  
  const generateRandomPastelColor = () => {
    const randomPastel = () => Math.floor(Math.random() * 56 + 200); // from 200 to 255
    const r = randomPastel();
    const g = randomPastel();
    const b = randomPastel();
    const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const handleRandomColor = () => {
    const randomColor = generateRandomPastelColor();
    courseForm.setValue('color', randomColor, { shouldValidate: true });
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Gestionar datos</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Gestionar Grupos y Cursos</SheetTitle>
          <SheetDescription>
            Añade, elimina o edita tus grupos y cursos aquí.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-4 -mr-6">
        <Accordion type="multiple" className="w-full" defaultValue={['item-1', 'item-2']}>
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <h3 className="font-semibold">Grupos</h3>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <ul className="space-y-2">
                  {groups.map((group) => (
                    <li
                      key={group.id}
                      className="flex items-center justify-between rounded-md bg-secondary p-2"
                    >
                      <span>{group.name}</span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará el grupo y todos los cursos y tareas asociados permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteGroup(group.id)} className="bg-destructive hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </li>
                  ))}
                </ul>
                <Form {...groupForm}>
                  <form
                    onSubmit={groupForm.handleSubmit(onGroupSubmit)}
                    className="flex items-end gap-2"
                  >
                    <FormField
                      control={groupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Nuevo Grupo</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre del grupo..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" size="icon">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>
              <h3 className="font-semibold">Cursos</h3>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <ul className="space-y-2">
                  {courses.map((course) => (
                    <li
                      key={course.id}
                      className="flex items-center justify-between rounded-md bg-secondary p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: course.color }} />
                        <span>{course.name}</span>
                        <span className="text-xs text-muted-foreground">({groups.find(g => g.id === course.groupId)?.name})</span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                               Esta acción no se puede deshacer. Se eliminará el curso y todas las tareas asociadas permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteCourse(course.id)} className="bg-destructive hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </li>
                  ))}
                </ul>
                <Form {...courseForm}>
                  <form
                    onSubmit={courseForm.handleSubmit(onCourseSubmit)}
                    className="space-y-4 rounded-md border p-4"
                  >
                     <Label>Nuevo Curso</Label>
                    <div className="flex items-end gap-2">
                      <FormField
                        control={courseForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                             <FormControl>
                              <Input placeholder="Nombre del curso..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={courseForm.control}
                        name="groupId"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Grupo..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {groups.map((group) => (
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
                    </div>
                    <FormField
                      control={courseForm.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                           <div className="flex items-center justify-between">
                            <FormLabel className="flex items-center gap-2"><Palette/> Color</FormLabel>
                            <Button type="button" variant="ghost" size="sm" onClick={handleRandomColor}>
                              <RefreshCw className="h-3 w-3 mr-2"/>
                              Generar
                            </Button>
                          </div>
                          <FormControl>
                             <div>
                               <div className="flex flex-wrap gap-2 mb-2">
                                {PRESET_COLORS.map(color => (
                                  <button
                                    type="button"
                                    key={color}
                                    className="h-6 w-6 rounded-full border-2"
                                    style={{ backgroundColor: color, borderColor: field.value === color ? 'hsl(var(--primary))' : 'transparent' }}
                                    onClick={() => courseForm.setValue('color', color, { shouldValidate: true })}
                                  />
                                ))}
                              </div>
                              <Input placeholder="#RRGGBB" {...field} />
                             </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                     />

                    <Button type="submit" className="w-full">
                      <PlusCircle className="mr-2" /> Añadir Curso
                    </Button>
                  </form>
                </Form>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        </ScrollArea>
        <SheetFooter className="mt-auto">
          <SheetClose asChild>
            <Button type="submit">Hecho</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
