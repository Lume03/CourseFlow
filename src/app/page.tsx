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

  const filteredTasks = useMemo(() => {
    const now = new Date();
    let filtered = tasks;

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
        return tasks;
      default:
        // This handles group filtering, where filter is a groupId
        const groupCourses = courses.filter(c => c.groupId === filter).map(c => c.id);
        return tasks.filter(task => groupCourses.includes(task.courseId));
    }
  }, [tasks, filter, courses]);

  return (
    <div className="flex h-screen w-full flex-col bg-background">
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
