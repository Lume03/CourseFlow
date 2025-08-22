'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Task, Course, Group, TaskStatus, FilterType } from '@/lib/types';
import { initialTasks, initialCourses, initialGroups } from '@/lib/data';
import AppHeader from '@/components/app-header';
import KanbanBoard from '@/components/kanban-board';
import KanbanSkeleton from '@/components/kanban-skeleton';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // In a real app, this would be an API call.
    // We keep it in useEffect to ensure it runs only on the client.
    setTasks(initialTasks);
    setCourses(initialCourses);
    setGroups(initialGroups);
    setIsClient(true);
  }, []);


  const handleTaskDrop = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

  const handleAddTask = (newTask: Omit<Task, 'id' | 'status'>) => {
    const taskToAdd: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
      status: 'No Iniciado',
    };
    setTasks((prevTasks) => [...prevTasks, taskToAdd]);
  };
  
  const filteredTasks = useMemo(() => {
    const now = new Date();
    switch (filter) {
      case 'this-week':
        const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
        const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
        return tasks.filter(
          (task) =>
            task.dueDate &&
            task.dueDate >= startOfThisWeek &&
            task.dueDate <= endOfThisWeek
        );
      case 'this-month':
        const startOfThisMonth = startOfMonth(now);
        const endOfThisMonth = endOfMonth(now);
        return tasks.filter(
          (task) =>
            task.dueDate &&
            task.dueDate >= startOfThisMonth &&
            task.dueDate <= endOfThisMonth
        );
      case 'all':
      default:
        return tasks;
    }
  }, [tasks, filter]);

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <AppHeader 
        filter={filter} 
        setFilter={setFilter} 
        onAddTask={handleAddTask}
        courses={courses}
        groups={groups}
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
