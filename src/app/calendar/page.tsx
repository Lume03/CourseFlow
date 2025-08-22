
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Loader2, Calendar as CalendarIcon, ArrowLeft, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, startOfWeek, endOfWeek, addDays, eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Task, Course, Group, AppData } from '@/lib/types';
import { findOrCreateDataFile, readDataFile } from '@/lib/drive';


interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; date: string };
  end: { dateTime: string; date: string };
  htmlLink: string;
}

export default function CalendarPage() {
  const { user, accessToken, loading: authLoading } = useAuth();

  // State for Google Calendar data
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  
  // State for local Task data from Drive
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isTaskDataLoading, setIsTaskDataLoading] = useState(true);
  const [taskDataError, setTaskDataError] = useState<string | null>(null);

  // State for UI
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  const isLoading = authLoading || isCalendarLoading || isTaskDataLoading;

  const fetchCalendarEvents = useCallback(async (token: string, date: Date) => {
    setIsCalendarLoading(true);
    setCalendarError(null);
    try {
      const timeMin = startOfWeek(date, { weekStartsOn: 1 }).toISOString();
      const timeMax = endOfWeek(date, { weekStartsOn: 1 }).toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Error al cargar los eventos del calendario.');
      }
      const data = await response.json();
      setCalendarEvents(data.items || []);
    } catch (err: any) {
      setCalendarError(err.message);
      console.error(err);
    } finally {
      setIsCalendarLoading(false);
    }
  }, []);

  const fetchTaskData = useCallback(async (token: string) => {
    setIsTaskDataLoading(true);
    setTaskDataError(null);
    try {
      const fileId = await findOrCreateDataFile(token);
      const data = await readDataFile(token, fileId);
      if (data && data.tasks && data.courses && data.groups) {
        setTasks(data.tasks.map(t => ({ ...t, dueDate: t.dueDate ? new Date(t.dueDate) : undefined })));
        setCourses(data.courses);
        setGroups(data.groups);
      }
    } catch (error) {
      console.error("Error loading task data from Drive:", error);
      setTaskDataError("No se pudieron cargar las tareas desde Google Drive.");
    } finally {
      setIsTaskDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) {
      setIsCalendarLoading(false);
      setIsTaskDataLoading(false);
      setCalendarError('No se pudo obtener el token de acceso.');
      return;
    }
    
    fetchCalendarEvents(accessToken, currentDate);
    fetchTaskData(accessToken);

  }, [accessToken, authLoading, currentDate, fetchCalendarEvents, fetchTaskData]);
  
  const weekDays = useMemo(() => {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => !!task.dueDate);
    if (selectedGroup !== 'all') {
      const groupCourseIds = courses.filter(c => c.groupId === selectedGroup).map(c => c.id);
      filtered = filtered.filter(t => groupCourseIds.includes(t.courseId));
    }
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(t => t.courseId === selectedCourse);
    }
    return filtered.sort((a, b) => (a.dueDate as Date).getTime() - (b.dueDate as Date).getTime());
  }, [tasks, courses, selectedGroup, selectedCourse]);

  const getEventTime = (event: CalendarEvent) => {
    if (event.start.dateTime) {
      return format(parseISO(event.start.dateTime), 'h:mm a', { locale: es });
    }
    return 'Todo el día';
  };

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());


  if (authLoading || (!user && !calendarError)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="flex h-screen w-full flex-col bg-background">
       <header className="flex h-16 shrink-0 items-center border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-20">
          <Button asChild variant="outline" size="icon" className="mr-4">
           <Link href="/">
              <ArrowLeft className="h-4 w-4" />
           </Link>
         </Button>
         <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 text-primary"/>
            <h1 className="text-lg font-semibold font-headline text-foreground">Mi Calendario</h1>
         </div>
         <div className="ml-auto flex items-center gap-2">
            <span className="text-sm font-medium text-foreground hidden md:inline">{format(currentDate, "MMMM yyyy", { locale: es })}</span>
            <Button variant="outline" size="icon" onClick={handlePrevWeek}><ChevronLeft className="h-4 w-4"/></Button>
            <Button variant="outline" onClick={handleToday}>Hoy</Button>
            <Button variant="outline" size="icon" onClick={handleNextWeek}><ChevronRight className="h-4 w-4"/></Button>
         </div>
       </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full max-w-xs border-r flex flex-col p-4 space-y-4 bg-secondary/30 overflow-y-auto">
            <h2 className="text-lg font-semibold font-headline">Eventos Clave (Tareas)</h2>
            <div className="grid grid-cols-2 gap-2">
              <Select onValueChange={setSelectedGroup} defaultValue="all">
                <SelectTrigger><SelectValue placeholder="Grupo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Grupos</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
               <Select onValueChange={setSelectedCourse} defaultValue="all">
                <SelectTrigger><SelectValue placeholder="Curso..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Cursos</SelectItem>
                  {courses.filter(c => selectedGroup === 'all' || c.groupId === selectedGroup).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {isTaskDataLoading ? (
               <div className="flex items-center justify-center pt-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : taskDataError ? (
              <p className="text-destructive text-sm">{taskDataError}</p>
            ) : filteredTasks.length === 0 ? (
               <p className="text-muted-foreground text-sm text-center pt-8">No hay tareas con fecha de entrega.</p>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map(task => (
                  <div key={task.id} className="p-3 rounded-lg bg-card border-l-4" style={{borderColor: task.color}}>
                    <p className="font-semibold text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{format(task.dueDate!, "d 'de' MMMM, yyyy", { locale: es })}</p>
                  </div>
                ))}
              </div>
            )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-x-auto">
           {isLoading ? (
             <div className="flex h-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
           ) : calendarError ? (
             <div className="p-6">
                <Card className="m-auto mt-8 max-w-lg border-destructive bg-destructive/10">
                  <CardHeader><CardTitle className="text-destructive-foreground">Error al Cargar Calendario</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-destructive-foreground/80">{calendarError}</p>
                    <p className="mt-4 text-xs text-destructive-foreground/60">Asegúrate de haber habilitado la API de Google Calendar en tu proyecto de Google Cloud y concedido los permisos necesarios.</p>
                  </CardContent>
                </Card>
             </div>
           ) : (
            <div className="grid grid-cols-7 h-full divide-x">
              {weekDays.map(day => (
                <div key={day.toString()} className="flex flex-col h-full">
                   <div className={cn(
                      "p-2 text-center border-b sticky top-0 bg-background/90 backdrop-blur-sm",
                       isToday(day) && "text-primary font-bold"
                     )}>
                       <p className="text-sm uppercase font-semibold">{format(day, 'EEE', { locale: es })}</p>
                       <p className={cn("text-2xl font-headline", isToday(day) && "text-primary rounded-full")}>{format(day, 'd')}</p>
                   </div>
                   <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-secondary/10">
                      {/* Google Calendar Events */}
                      {calendarEvents.filter(event => isSameDay(parseISO(event.start.dateTime || event.start.date), day)).map(event => (
                        <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" key={event.id}>
                           <div className="p-2 rounded-lg bg-accent/50 text-accent-foreground border-l-4 border-accent">
                            <p className="text-xs font-semibold">{getEventTime(event)}</p>
                            <p className="text-sm">{event.summary}</p>
                          </div>
                        </a>
                      ))}
                      {/* Local Tasks */}
                      {tasks.filter(task => task.dueDate && isSameDay(task.dueDate, day)).map(task => (
                        <div key={task.id} className="p-2 rounded-lg bg-card border-l-4" style={{borderColor: task.color}}>
                          <p className="text-xs font-semibold text-muted-foreground">{task.status}</p>
                           <p className="text-sm font-semibold">{task.title}</p>
                        </div>
                      ))}

                      {calendarEvents.filter(event => isSameDay(parseISO(event.start.dateTime || event.start.date), day)).length === 0 && 
                       tasks.filter(task => task.dueDate && isSameDay(task.dueDate, day)).length === 0 && (
                        <div className="h-full flex items-center justify-center">
                           <GripVertical className="h-6 w-6 text-muted-foreground/20"/>
                        </div>
                       )
                      }
                   </div>
                </div>
              ))}
            </div>
           )}
        </main>
      </div>
    </div>
  );
}
