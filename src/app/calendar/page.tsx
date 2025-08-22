
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Loader2, Calendar as CalendarIcon, ArrowLeft, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, startOfWeek, endOfWeek, addDays, eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks, set } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Task, Course, Group } from '@/lib/types';
import { findOrCreateDataFile, readDataFile } from '@/lib/drive';


interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; date: string };
  end: { dateTime: string; date: string };
  htmlLink: string;
  color?: string;
  isAllDay: boolean;
}

interface CalendarListItem {
    id: string;
    summary: string;
    primary?: boolean;
}

// Helper to get a stable random pastel color based on a string (like calendar ID)
const stringToPastelColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    // Using HSL color space for soft pastel colors
    return `hsl(${h}, 70%, 85%)`; 
};


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
      // 1. Fetch all calendar lists
      const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!listRes.ok) {
        throw new Error('No se pudo obtener la lista de calendarios.');
      }
      const calendarList = await listRes.json();
      const calendars: CalendarListItem[] = calendarList.items;

      const timeMin = startOfWeek(date, { weekStartsOn: 1 }).toISOString();
      const timeMax = endOfWeek(date, { weekStartsOn: 1 }).toISOString();

      // 2. Fetch events for each calendar
      const allEventsPromises = calendars.map(cal => {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`;
        return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(async (res) => {
            if (!res.ok) {
                console.warn(`Error al cargar eventos para el calendario ${cal.summary}`);
                return { items: [] }; // Return empty on error for a specific calendar
            }
            const result = await res.json();
            const color = stringToPastelColor(cal.id);
            // Add color and all-day flag to each event
            return {
              ...result,
              items: result.items.map((event: any) => ({
                ...event,
                color,
                isAllDay: !!event.start.date, // Events with `date` but no `dateTime` are all-day
              })),
            };
        });
      });

      const allEventsResults = await Promise.all(allEventsPromises);
      let allEvents = allEventsResults.flatMap(result => result.items || []);
      
      // Sort all events by start time
      allEvents.sort((a, b) => {
        const aTime = new Date(a.start.dateTime || a.start.date).getTime();
        const bTime = new Date(b.start.dateTime || b.start.date).getTime();
        return aTime - bTime;
      });

      setCalendarEvents(allEvents);

    } catch (err: any) {
      // Check for specific API not enabled error
      if (err.message?.includes('API has not been used')) {
         setCalendarError("La API de Google Calendar no ha sido habilitada en tu proyecto de Google Cloud. Por favor, habilítala y vuelve a intentarlo.");
      } else {
         setCalendarError(err.message || 'Error al cargar los eventos del calendario.');
      }
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
      setCalendarError('No se pudo obtener el token de acceso. Por favor, vuelve a iniciar sesión.');
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

  const getEventsAndTasksForDay = useCallback((day: Date) => {
      const gCalEvents = calendarEvents
          .filter(event => isSameDay(parseISO(event.start.dateTime || event.start.date), day))
          .map(event => ({
              type: 'gcal',
              date: parseISO(event.start.dateTime || event.start.date),
              component: (
                  <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" key={event.id}>
                      <div className="p-2 rounded-lg text-black/80 border-l-4" style={{ backgroundColor: event.color, borderColor: 'rgba(0,0,0,0.2)'}}>
                          <p className="text-xs font-semibold">{getEventTime(event)}</p>
                          <p className="text-sm">{event.summary}</p>
                      </div>
                  </a>
              )
          }));

      const localTasks = tasks
          .filter(task => task.dueDate && isSameDay(task.dueDate, day))
          .map(task => ({
              type: 'task',
              date: task.dueDate!,
              component: (
                  <div key={task.id} className="p-2 rounded-lg bg-card border-l-4" style={{borderColor: task.color}}>
                      <p className="text-xs font-semibold text-muted-foreground">{task.status}</p>
                      <p className="text-sm font-semibold">{task.title}</p>
                  </div>
              )
          }));

      return [...gCalEvents, ...localTasks].sort((a, b) => a.date.getTime() - b.date.getTime());

  }, [calendarEvents, tasks]);

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
              {weekDays.map(day => {
                const dayItems = getEventsAndTasksForDay(day);
                return (
                  <div key={day.toString()} className="flex flex-col h-full">
                    <div className={cn(
                        "p-2 text-center border-b sticky top-0 bg-background/90 backdrop-blur-sm",
                        isToday(day) && "text-primary font-bold"
                      )}>
                        <p className="text-sm uppercase font-semibold">{format(day, 'EEE', { locale: es })}</p>
                        <p className={cn("text-2xl font-headline", isToday(day) && "text-primary rounded-full")}>{format(day, 'd')}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-secondary/10">
                        {dayItems.length > 0 ? (
                           dayItems.map(item => item.component)
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <GripVertical className="h-6 w-6 text-muted-foreground/20"/>
                          </div>
                        )}
                    </div>
                  </div>
                )
              })}
            </div>
           )}
        </main>
      </div>
    </div>
  );
}

    