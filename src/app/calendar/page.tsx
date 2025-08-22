
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Loader2, Calendar as CalendarIcon, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, startOfWeek, addDays, eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks, getHours, getMinutes, differenceInMinutes, areIntervalsOverlapping, endOfWeek } from 'date-fns';
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
  linkedCourseColor?: string;
}

interface PositionedEvent extends CalendarEvent {
  top: number;
  height: number;
  width: number;
  left: number;
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

// Find the corresponding course color by matching event title with course names
const getCourseColorForEvent = (eventSummary: string, courses: Course[]): string | undefined => {
  const matchingCourse = courses.find(course => eventSummary.toLowerCase().includes(course.name.toLowerCase()));
  return matchingCourse?.color;
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

  const fetchCalendarEvents = useCallback(async (token: string, date: Date, localCourses: Course[]) => {
    setIsCalendarLoading(true);
    setCalendarError(null);
    try {
      const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!listRes.ok) throw new Error('No se pudo obtener la lista de calendarios.');
      const calendarList = await listRes.json();
      const calendars: CalendarListItem[] = calendarList.items;

      const timeMin = startOfWeek(date, { weekStartsOn: 1 }).toISOString();
      const timeMax = endOfWeek(addDays(startOfWeek(date, { weekStartsOn: 1 }), 6), { weekStartsOn: 1 }).toISOString();

      const allEventsPromises = calendars.map(cal => {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`;
        return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(async (res) => {
            if (!res.ok) {
                console.warn(`Error al cargar eventos para el calendario ${cal.summary}`);
                return { items: [] };
            }
            const result = await res.json();
            const defaultColor = stringToPastelColor(cal.id);
            return {
              ...result,
              items: result.items.map((event: any) => ({
                ...event,
                color: defaultColor,
                isAllDay: !!event.start.date,
                linkedCourseColor: getCourseColorForEvent(event.summary, localCourses)
              })),
            };
        });
      });

      const allEventsResults = await Promise.all(allEventsPromises);
      let allEvents = allEventsResults.flatMap(result => result.items || []);
      
      allEvents.sort((a, b) => {
        const aTime = new Date(a.start.dateTime || a.start.date).getTime();
        const bTime = new Date(b.start.dateTime || b.start.date).getTime();
        return aTime - bTime;
      });

      setCalendarEvents(allEvents);

    } catch (err: any) {
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

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) {
      setIsCalendarLoading(false);
      setIsTaskDataLoading(false);
      setCalendarError('No se pudo obtener el token de acceso. Por favor, vuelve a iniciar sesión.');
      return;
    }
    
    const loadAllData = async () => {
      await fetchTaskData(accessToken);
    }
    loadAllData();

  }, [accessToken, authLoading, fetchTaskData]);

  // This effect runs once courses are loaded, or when the date changes
  useEffect(() => {
    if (accessToken && courses.length >= 0) { // Check for >=0 to run even if there are no courses
      fetchCalendarEvents(accessToken, currentDate, courses);
    }
  }, [accessToken, currentDate, courses, fetchCalendarEvents]);
  
  const weekDays = useMemo(() => {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
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

  const getEventsForDay = (day: Date) => {
    const gCalTimed = calendarEvents.filter(event => !event.isAllDay && isSameDay(parseISO(event.start.dateTime), day));
    const gCalAllDay = calendarEvents.filter(event => event.isAllDay && (isSameDay(parseISO(event.start.date), day) || (parseISO(event.start.date) < day && parseISO(event.end.date) > day)));
    return { gCalTimed, gCalAllDay };
  };

  const positionEvents = (events: CalendarEvent[]): PositionedEvent[] => {
    if (events.length === 0) return [];
  
    const sortedEvents = events.sort((a, b) => {
      const aStart = parseISO(a.start.dateTime).getTime();
      const bStart = parseISO(b.start.dateTime).getTime();
      return aStart - bStart;
    });
  
    let columns: CalendarEvent[][] = [];
    
    sortedEvents.forEach(event => {
      let placed = false;
      for (const col of columns) {
        const lastEventInCol = col[col.length - 1];
        if (!areIntervalsOverlapping(
          { start: parseISO(event.start.dateTime), end: parseISO(event.end.dateTime) },
          { start: parseISO(lastEventInCol.start.dateTime), end: parseISO(lastEventInCol.end.dateTime) }
        )) {
          col.push(event);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([event]);
      }
    });
  
    const positioned: PositionedEvent[] = [];
    const totalColumns = columns.length;
  
    columns.forEach((col, colIndex) => {
      col.forEach(event => {
        const start = parseISO(event.start.dateTime);
        const end = parseISO(event.end.dateTime);
        const startHour = getHours(start) + getMinutes(start) / 60;
        const durationMinutes = differenceInMinutes(end, start);
        
        positioned.push({
          ...event,
          top: startHour * 4, // 4rem per hour (h-16)
          height: (durationMinutes / 60) * 4,
          width: 100 / totalColumns,
          left: colIndex * (100 / totalColumns),
        });
      });
    });
  
    return positioned;
  };

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const hours = Array.from({ length: 24 }, (_, i) => i);


  if (authLoading || (!user && !calendarError)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="flex h-screen w-full flex-col bg-background">
       <header className="flex h-16 shrink-0 items-center border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-30">
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
        <main className="flex-1 flex flex-col overflow-auto">
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
             <div className="flex-1 flex flex-col">
              <div className="grid grid-cols-[auto,1fr] sticky top-0 bg-background z-20">
                <div className="w-14"></div>
                <div className="grid grid-cols-7 border-l">
                  {weekDays.map(day => (
                    <div key={day.toString()} className="p-2 text-center border-r border-b">
                       <p className="text-xs uppercase font-semibold text-muted-foreground">{format(day, 'EEE', { locale: es })}</p>
                       <p className={cn("text-2xl font-headline", isToday(day) && "text-primary")}>{format(day, 'd')}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* All day section */}
              <div className="grid grid-cols-[auto,1fr] bg-background z-10">
                  <div className="w-14 text-center text-xs py-1.5 text-muted-foreground border-t">Todo el día</div>
                  <div className="grid grid-cols-7 border-l border-t">
                      {weekDays.map((day) => (
                          <div key={`allday-${day.toString()}`} className="border-r border-b p-1 min-h-[34px] space-y-1">
                              {(() => {
                                  const { gCalAllDay } = getEventsForDay(day);
                                  return gCalAllDay.map(event => (
                                      <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" key={event.id}>
                                          <div className="p-1 rounded text-black/80 text-xs font-semibold" style={{ backgroundColor: event.linkedCourseColor || event.color || '#3174ad' }}>{event.summary}</div>
                                      </a>
                                  ));
                              })()}
                          </div>
                      ))}
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-[auto,1fr]">
                  {/* Time Gutter */}
                  <div className="w-14 text-right pr-2">
                    {hours.map(hour => (
                       <div key={hour} className="h-16 -mt-2.5 pt-2.5 relative">
                          {hour > 0 && <span className="text-xs text-muted-foreground">{format(new Date(0,0,0,hour), 'h a')}</span>}
                       </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 border-l relative">
                    {/* Grid lines */}
                    {hours.slice(1).map(hour => (
                      <div key={hour} className="col-span-7 h-16 border-t" style={{gridRowStart: hour + 1}}></div>
                    ))}
                    {weekDays.map((day, dayIndex) => (
                      <div key={day.toString()} className="border-r relative" style={{ gridColumnStart: dayIndex + 1, gridRow: '1 / span 25' }}>
                        
                        {/* Timed Events */}
                        {(() => {
                          const { gCalTimed } = getEventsForDay(day);
                          const positionedEvents = positionEvents(gCalTimed);

                          return positionedEvents.map(event => {
                            const start = parseISO(event.start.dateTime);
                            const end = parseISO(event.end.dateTime);
                            
                            return (
                              <a 
                                href={event.htmlLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                key={event.id}
                                className="absolute p-0.5"
                                style={{ 
                                  top: `${event.top}rem`, 
                                  height: `${event.height}rem`,
                                  left: `${event.left}%`,
                                  width: `${event.width}%`
                                }}
                              >
                                 <div 
                                  className="h-full w-full rounded-md p-1 text-black/80 overflow-hidden" 
                                  style={{ backgroundColor: event.linkedCourseColor || event.color || '#3174ad' }}
                                >
                                  <p className="text-xs font-bold">{event.summary}</p>
                                  <p className="text-[10px]">{format(start, 'h:mm a')} - {format(end, 'h:mm a')}</p>
                                </div>
                              </a>
                            )
                          });
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
             </div>
           )}
        </main>
      </div>
    </div>
  );
}

    