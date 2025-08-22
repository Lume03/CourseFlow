
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Task, Course, Group, TaskStatus, FilterType, AppData } from '@/lib/types';
import { useAuth } from '@/components/auth-provider';
import { initialTasks, initialCourses, initialGroups } from '@/lib/data';
import AppHeader from '@/components/app-header';
import KanbanBoard from '@/components/kanban-board';
import KanbanSkeleton from '@/components/kanban-skeleton';
import Confetti from '@/components/confetti';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isBefore, subDays, isAfter } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { findOrCreateDataFile, readDataFile, writeDataFile } from '@/lib/drive';

export default function Home() {
  const { user, accessToken, loading: authLoading, signIn } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [isClient, setIsClient] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dataFileId, setDataFileId] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [driveError, setDriveError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const loadInitialLocalData = useCallback(() => {
    setTasks(initialTasks);
    setCourses(initialCourses);
    setGroups(initialGroups);
  }, []);

  const loadDataFromDrive = useCallback(async (token: string) => {
    setIsDataLoading(true);
    setDriveError(null);
    try {
      const fileId = await findOrCreateDataFile(token);
      setDataFileId(fileId);
      const data = await readDataFile(token, fileId);

      if (data && data.tasks && data.courses && data.groups) {
        setTasks(data.tasks.map(t => ({ ...t, dueDate: t.dueDate ? new Date(t.dueDate) : undefined })));
        setCourses(data.courses);
        setGroups(data.groups);
      } else {
        const initialData = { tasks: initialTasks, courses: initialCourses, groups: initialGroups };
        setTasks(initialData.tasks);
        setCourses(initialData.courses);
        setGroups(initialData.groups);
        await writeDataFile(token, fileId, initialData);
      }
    } catch (error) {
      console.error("Error during data loading from Drive:", error);
      setDriveError("No se pudieron cargar los datos de Google Drive. Usando datos de ejemplo locales.");
      loadInitialLocalData();
    } finally {
      setIsDataLoading(false);
    }
  }, [loadInitialLocalData]);

  useEffect(() => {
    if (authLoading) {
      // Still waiting for Firebase to tell us if user is logged in
      return;
    }
    if (user && accessToken) {
      // User is logged in and we have the Google token, load data
      loadDataFromDrive(accessToken);
    } else if (!user) {
      // User is not logged in, load local data and finish loading
      loadInitialLocalData();
      setIsDataLoading(false);
    }
    // The case where user exists but accessToken is null is handled by AuthProvider
    // which will fetch the token and trigger a re-render.
  }, [user, accessToken, authLoading, loadDataFromDrive, loadInitialLocalData]);


  const saveDataToDrive = useCallback(async (dataToSave: AppData) => {
    if (!dataFileId || !accessToken) {
      console.warn("Attempted to save without dataFileId or accessToken. Aborting save.");
      return;
    }

    setIsSaving(true);
    setDriveError(null);
    
    try {
        await writeDataFile(accessToken, dataFileId, dataToSave);
    } catch (error) {
        console.error("Error saving data to Drive:", error);
        setDriveError("No se pudieron guardar los cambios en Google Drive.");
    } finally {
        setTimeout(() => setIsSaving(false), 500);
    }
  }, [dataFileId, accessToken]);
  
  useEffect(() => {
    if (isDataLoading || !dataFileId || !user) {
      // Don't save while loading, if there's no fileId, or if logged out.
      return;
    }
    const dataToSave = { tasks, courses, groups };
    saveDataToDrive(dataToSave);
  }, [tasks, courses, groups, dataFileId, isDataLoading, saveDataToDrive, user]);


  const handleTaskDrop = (taskId: string, newStatus: TaskStatus) => {
    let shouldShowConfetti = false;
    let taskToRemoveId: string | null = null;
  
    setTasks(currentTasks => {
      const updatedTasks = currentTasks.map(task => {
        if (task.id === taskId) {
          if (newStatus === 'Terminado' && task.status !== 'Terminado') {
            shouldShowConfetti = true;
            // Check if task is overdue OR has no due date to remove it
            if ((task.dueDate && isBefore(new Date(task.dueDate), new Date())) || !task.dueDate) {
              taskToRemoveId = taskId;
            }
          }
          return { ...task, status: newStatus };
        }
        return task;
      });
  
      if (shouldShowConfetti) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
        
        if (taskToRemoveId) {
          setTimeout(() => {
            setTasks(prevTasks => prevTasks.filter(t => t.id !== taskToRemoveId));
          }, 3000);
        }
      }
  
      return updatedTasks;
    });
  };
  
  const handleAddTask = (newTask: Omit<Task, 'id' | 'status'>) => {
    const taskToAdd: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
      status: 'No Iniciado',
    };
    setTasks(currentTasks => [...currentTasks, taskToAdd]);
  };

  const handleEditTask = (updatedTask: Task) => {
    setTasks(currentTasks => 
      currentTasks.map(task => (task.id === updatedTask.id ? updatedTask : task))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
  };
  
  const handleAddGroup = (name: string) => {
    const newGroup: Group = { id: `group-${Date.now()}`, name };
    setGroups(currentGroups => [...currentGroups, newGroup]);
  };

  const handleDeleteGroup = (id: string) => {
    setGroups(currentGroups => {
        const coursesToDelete = courses.filter(c => c.groupId === id);
        const courseIdsToDelete = coursesToDelete.map(c => c.id);
        
        setCourses(currentCourses => currentCourses.filter(c => c.groupId !== id));
        setTasks(currentTasks => currentTasks.filter(t => !courseIdsToDelete.includes(t.courseId)));

        if (filter === id) {
          setFilter('all');
        }
        return currentGroups.filter(g => g.id !== id);
    });
  };

  const handleAddCourse = (name: string, color: string, groupId: string) => {
    const newCourse: Course = { id: `course-${Date.now()}`, name, color, groupId };
    setCourses(currentCourses => [...currentCourses, newCourse]);
  };

  const handleDeleteCourse = (id: string) => {
    setCourses(currentCourses => {
        setTasks(currentTasks => currentTasks.filter(t => t.courseId !== id));
        return currentCourses.filter(c => c.id !== id)
    });
  };
  
  const processedTasks = useMemo(() => {
    const now = new Date();
    const oneDayFromNow = subDays(now, -1);
    
    return tasks.map(task => {
        const isUrgent = task.dueDate 
          && task.status !== 'Terminado' 
          && (isBefore(task.dueDate, oneDayFromNow));
        return { ...task, isUrgent: !!isUrgent };
    });
  }, [tasks]);


  const filteredTasks = useMemo(() => {
    const now = new Date();
    // This logic to hide completed & overdue tasks is now handled by the auto-removal
    // in handleTaskDrop, so we can simplify this part.
    const tasksToShow = processedTasks;

    switch (filter) {
      case 'this-week':
        const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
        const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
        return tasksToShow.filter(
          (task) =>
            task.dueDate &&
            task.dueDate >= startOfThisWeek &&
            task.dueDate <= endOfThisWeek
        );
      case 'this-month':
        const startOfThisMonth = startOfMonth(now);
        const endOfThisMonth = endOfMonth(now);
        return tasksToShow.filter(
          (task) =>
            task.dueDate &&
            task.dueDate >= startOfThisMonth &&
            task.dueDate <= endOfThisMonth
        );
      case 'all':
        return tasksToShow;
      default:
        const groupCourses = courses.filter(c => c.groupId === filter).map(c => c.id);
        return tasksToShow.filter(task => groupCourses.includes(task.courseId));
    }
  }, [processedTasks, filter, courses]);

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Autenticando...</p>
        </div>
      </div>
    );
  }
  
  if (!user && !isDataLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
         <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            <h1 className="text-3xl font-bold font-headline text-foreground">CourseFlow Kanban</h1>
        </div>
        <p className="max-w-md mb-8 text-muted-foreground">
          Organiza tus cursos, gestiona tus tareas y sincroniza tu progreso en todos tus dispositivos. Inicia sesión para empezar.
        </p>
        <Button onClick={signIn}>
          <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 172.9 56.5l-63.7 61.9C331.4 99.2 292.1 82 248 82c-73.3 0-133.4 58.9-133.4 131.5s60.1 131.5 133.4 131.5c82.3 0 114.3-55 119.5-83.3H248v-61.4h235.2c2.4 12.3 3.8 24.7 3.8 37.8z"></path></svg>
          Iniciar Sesión con Google
        </Button>
         {driveError && (
          <div className="mt-4 max-w-md rounded-md border border-destructive bg-destructive/10 p-4 text-center text-sm text-destructive-foreground">
              {driveError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background relative">
      {showConfetti && <Confetti />}
      <AppHeader 
        filter={filter} 
        setFilter={setFilter} 
        onAddTask={handleAddTask}
        courses={courses}
        groups={groups}
        onAddGroup={handleAddGroup}
        onDeleteGroup={handleDeleteGroup}
        onAddCourse={handleAddCourse}
        onDeleteCourse={handleDeleteCourse}
        isSaving={isSaving}
      />
      <main className="flex-1 overflow-x-auto p-4 md:p-6 lg:p-8">
        {isDataLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Cargando tus datos de Drive...</p>
              </div>
            </div>
          ) : (
            <>
            {driveError && (
              <div className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-center text-sm text-destructive-foreground">
                  {driveError}
              </div>
            )}
            {isClient ? (
              <KanbanBoard 
                tasks={filteredTasks} 
                onTaskDrop={handleTaskDrop}
                courses={courses}
                groups={groups}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ) : (
              <KanbanSkeleton />
            )}
            </>
          )}
      </main>
    </div>
  );
}
