'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Loader2, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; date: string };
  end: { dateTime: string; date: string };
  htmlLink: string;
}

export default function CalendarPage() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!accessToken) {
      setIsLoading(false);
      setError('No se pudo obtener el token de acceso para cargar el calendario.');
      return;
    }

    const fetchEvents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const now = new Date();
        const timeMin = now.toISOString();
        const timeMax = new Date(now.setDate(now.getDate() + 30)).toISOString(); // 30 days from now

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=50`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error.message || 'Error al cargar los eventos del calendario.');
        }

        const data = await response.json();
        setEvents(data.items || []);
      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [accessToken, authLoading]);

  const formatEventDate = (event: CalendarEvent) => {
    const start = event.start.dateTime ? parseISO(event.start.dateTime) : parseISO(event.start.date);
    
    if (event.start.dateTime) {
      return format(start, "d 'de' MMMM 'de' yyyy, h:mm a", { locale: es });
    }
    // All-day event
    return format(start, "d 'de' MMMM 'de' yyyy", { locale: es });
  };


  if (authLoading || (!user && !error)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="flex h-screen w-full flex-col bg-background">
       <header className="flex h-16 shrink-0 items-center border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-10">
         <Button asChild variant="outline" size="icon">
           <Link href="/">
              <ArrowLeft className="h-4 w-4" />
           </Link>
         </Button>
         <div className="flex items-center gap-3 ml-4">
            <CalendarIcon className="h-6 w-6 text-primary"/>
            <h1 className="text-lg font-semibold font-headline text-foreground">Mi Calendario</h1>
         </div>
       </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {isLoading ? (
           <div className="flex flex-col items-center gap-4 pt-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Cargando tus eventos...</p>
          </div>
        ) : error ? (
          <Card className="m-auto mt-8 max-w-lg border-destructive bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive-foreground">Error al Cargar el Calendario</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive-foreground/80">{error}</p>
              <p className="mt-4 text-xs text-destructive-foreground/60">
                Asegúrate de haber concedido permiso de acceso al calendario. Puede que necesites cerrar sesión y volver a iniciarla.
              </p>
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <div className="text-center pt-16">
            <p className="text-muted-foreground">No tienes eventos próximos en los siguientes 30 días.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {events.map((event) => (
               <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" key={event.id} className="block">
                <Card className="hover:border-primary hover:bg-secondary/50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center p-2 rounded-md bg-secondary text-secondary-foreground w-20 text-center">
                         <span className="text-2xl font-bold font-headline">
                            {formatEventDate(event).split(' ')[0]}
                         </span>
                         <span className="text-sm uppercase font-semibold">
                            {format(event.start.dateTime ? parseISO(event.start.dateTime) : parseISO(event.start.date), 'MMM', { locale: es })}
                         </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{event.summary}</h3>
                        <p className="text-sm text-muted-foreground">{formatEventDate(event)}</p>
                      </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
