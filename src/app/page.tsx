'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Task, Course, Group, TaskStatus, FilterType } from '@/lib/types';
import { initialTasks, initialCourses, initialGroups } from '@/lib/data';
import AppHeader from '@/components/app-header';
import KanbanBoard from '@/components/kanban-board';
import KanbanSkeleton from '@/components/kanban-skeleton';
import Confetti from '@/components/confetti';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isBefore, subDays, isAfter } from 'date-fns';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isClient, setIsClient] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // In a real app, this would be an API call.
    // We keep it in useEffect to ensure it runs only on the client.
    setTasks(initialTasks);
    setCourses(initialCourses);
    setGroups(initialGroups);
    setIsClient(true);
  }, []);

  const handleTaskDrop = (taskId: string, newStatus: TaskStatus) => {
    let shouldShowConfetti = false;
    let isOverdueAndCompleted = false;

    setTasks((prevTasks) =>
      prevTasks.map((task) => {
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
      })
    );

    if (shouldShowConfetti) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
        
        if (isOverdueAndCompleted) {
            setTimeout(() => {
                setTasks(prev => prev.filter(t => t.id !== taskId));
            }, 3000); // Remove after confetti
        }
    }
  };
  
  const handleAddTask = (newTask: Omit<Task, 'id' | 'status'>) => {
    const taskToAdd: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
      status: 'No Iniciado',
    };
    setTasks((prevTasks) => [...prevTasks, taskToAdd]);
  };
  
  const handleAddGroup = (name: string) => {
    const newGroup: Group = { id: `group-${Date.now()}`, name };
    setGroups(prev => [...prev, newGroup]);
  };

  const handleDeleteGroup = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    // Also delete associated courses and tasks
    const coursesToDelete = courses.filter(c => c.groupId === id);
    const courseIdsToDelete = coursesToDelete.map(c => c.id);
    setCourses(prev => prev.filter(c => c.groupId !== id));
    setTasks(prev => prev.filter(t => !courseIdsToDelete.includes(t.courseId)));
    // If the active filter was this group, reset to 'all'
    if (filter === id) {
      setFilter('all');
    }
  };

  const handleAddCourse = (name: string, color: string, groupId: string) => {
    const newCourse: Course = { id: `course-${Date.now()}`, name, color, groupId };
    setCourses(prev => [...prev, newCourse]);
  };

  const handleDeleteCourse = (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
    // Also delete associated tasks
    setTasks(prev => prev.filter(t => t.courseId !== id));
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
    // Filter out completed tasks that are past their due date, but give them a moment to be on the board
    const tasksToShow = processedTasks.filter(task => {
        if (task.status === 'Terminado' && task.dueDate && isAfter(new Date(), task.dueDate)) {
            // This is a simple way to handle it. In handleTaskDrop we add a delay
            // before removing, which is a better UX. This filter will clean up on reload.
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
        // This handles group filtering, where filter is a groupId
        const groupCourses = courses.filter(c => c.groupId === filter).map(c => c.id);
        return tasksToShow.filter(task => groupCourses.includes(task.courseId));
    }
  }, [processedTasks, filter, courses]);

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
      />
      <main className="flex-1 overflow-x-auto p-4 md:p-6 lg:p-8">
        {isClient ? (
          <KanbanBoard tasks={filteredTasks} onTaskDrop={handleTaskDrop} />
        ) : (
          <KanbanSkeleton />
        )}
      </main>
    </div>
  );
}
