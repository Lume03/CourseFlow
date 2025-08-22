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

  const loadInitialLocalData = () => {
    setTasks(initialTasks);
    setCourses(initialCourses);
    setGroups(initialGroups);
  }

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
        // This case handles a completely new user or if readDataFile returns null
        const initialData = { tasks: initialTasks, courses: initialCourses, groups: initialGroups };
        loadInitialLocalData();
        // Save the initial data to Drive for the first time
        if (fileId) {
          await saveDataToDrive(initialData, fileId, token);
        }
      }
    } catch (error) {
      console.error("Error loading data from Drive:", error);
      setDriveError("No se pudieron cargar los datos de Google Drive. Usando datos de ejemplo. Por favor, recarga la página.");
      loadInitialLocalData();
    } finally {
        setIsDataLoading(false);
    }
  }, []); // useCallback dependencies are minimal, functions are stable

  useEffect(() => {
    // Show loading screen if Firebase auth is in progress
    if (authLoading) {
      setIsDataLoading(true);
      return;
    }
    
    // If we have a user and a valid token, load data from Drive
    if (user && accessToken) {
      loadDataFromDrive(accessToken);
    } else {
      // If there's no user or no token (e.g., after logout or on initial visit)
      // stop loading and show the login page with local data.
      setIsDataLoading(false);
      loadInitialLocalData();
    }
  }, [user, accessToken, authLoading, loadDataFromDrive]);


  const saveDataToDrive = useCallback(async (data: AppData, fileIdToSave?: string | null, tokenToSave?: string | null) => {
    const finalFileId = fileIdToSave || dataFileId;
    const finalToken = tokenToSave || accessToken;

    if (!finalFileId || !finalToken) return;
    setIsSaving(true);
    setDriveError(null);
    try {
      await writeDataFile(finalToken, finalFileId, data);
    } catch (error) {
      console.error("Error saving data to Drive:", error);
       setDriveError("No se pudieron guardar los cambios en Google Drive.");
    } finally {
      setIsSaving(false);
    }
  }, [dataFileId, accessToken]);
  
  const handleTaskDrop = (taskId: string, newStatus: TaskStatus) => {
    let shouldShowConfetti = false;
    let isOverdueAndCompleted = false;
    let updatedTasks: Task[] = [];

    setTasks((prevTasks) => {
      updatedTasks = prevTasks.map((task) => {
        if (task.id === taskId) {
          if (newStatus === 'Terminado' && task.status !== 'Terminado') {
            shouldShowConfetti = true;
            if (task.dueDate && isBefore(task.dueDate, new Date())) {
                isOverdueAndCompleted = true;
            }
          }
          return { ...task, status: newStatus };
        }
        return task;
      });
      saveDataToDrive({tasks: updatedTasks, courses, groups});
      return updatedTasks;
    });

    if (shouldShowConfetti) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
        
        if (isOverdueAndCompleted) {
            setTimeout(() => {
              setTasks(prev => {
                const finalTasks = prev.filter(t => t.id !== taskId);
                saveDataToDrive({tasks: finalTasks, courses, groups});
                return finalTasks;
              });
            }, 3000);
        }
    }
  };
  
  const handleAddTask = (newTask: Omit<Task, 'id' | 'status'>) => {
    const taskToAdd: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
      status: 'No Iniciado',
    };
    const updatedTasks = [...tasks, taskToAdd];
    setTasks(updatedTasks);
    saveDataToDrive({tasks: updatedTasks, courses, groups});
  };

  const handleEditTask = (updatedTask: Task) => {
    const updatedTasks = tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    );
    setTasks(updatedTasks);
    saveDataToDrive({tasks: updatedTasks, courses, groups});
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
    saveDataToDrive({tasks: updatedTasks, courses, groups});
  };
  
  const handleAddGroup = (name: string) => {
    const newGroup: Group = { id: `group-${Date.now()}`, name };
    const updatedGroups = [...groups, newGroup];
    setGroups(updatedGroups);
    saveDataToDrive({tasks, courses, groups: updatedGroups});
  };

  const handleDeleteGroup = (id: string) => {
    const updatedGroups = groups.filter(g => g.id !== id);
    const coursesToDelete = courses.filter(c => c.groupId === id);
    const courseIdsToDelete = coursesToDelete.map(c => c.id);
    const updatedCourses = courses.filter(c => c.groupId !== id);
    const updatedTasks = tasks.filter(t => !courseIdsToDelete.includes(t.courseId));
    
    setGroups(updatedGroups);
    setCourses(updatedCourses);
    setTasks(updatedTasks);
    saveDataToDrive({tasks: updatedTasks, courses: updatedCourses, groups: updatedGroups});

    if (filter === id) {
      setFilter('all');
    }
  };

  const handleAddCourse = (name: string, color: string, groupId: string) => {
    const newCourse: Course = { id: `course-${Date.now()}`, name, color, groupId };
    const updatedCourses = [...courses, newCourse];
    setCourses(updatedCourses);
    saveDataToDrive({tasks, courses: updatedCourses, groups});
  };

  const handleDeleteCourse = (id: string) => {
    const updatedCourses = courses.filter(c => c.id !== id);
    const updatedTasks = tasks.filter(t => t.courseId !== id);
    setCourses(updatedCourses);
    setTasks(updatedTasks);
    saveDataToDrive({tasks: updatedTasks, courses: updatedCourses, groups});
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
    const tasksToShow = processedTasks.filter(task => {
        if (task.status === 'Terminado' && task.dueDate && isAfter(new Date(), task.dueDate)) {
            return false;
        }
        return true;
    });

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

  if (authLoading || isDataLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando tus datos...</p>
        </div>
      </div>
    );
  }

  if (!user) {
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
      </main>
    </div>
  );
}
