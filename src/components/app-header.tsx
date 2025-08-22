import type { FilterType, Course, Group, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AddTaskDialog } from './add-task-dialog';
import { ManageDataSheet } from './manage-data-sheet';
import { Separator } from './ui/separator';

interface AppHeaderProps {
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  onAddTask: (newTask: Omit<Task, 'id' | 'status'>) => void;
  courses: Course[];
  groups: Group[];
  onAddGroup: (name: string) => void;
  onDeleteGroup: (id: string) => void;
  onAddCourse: (name: string, color: string, groupId: string) => void;
  onDeleteCourse: (id: string) => void;
}

export default function AppHeader({ 
  filter, 
  setFilter, 
  onAddTask, 
  courses, 
  groups,
  onAddGroup,
  onDeleteGroup,
  onAddCourse,
  onDeleteCourse
}: AppHeaderProps) {
  const timeFilters: { value: FilterType; label: string }[] = [
    { value: 'this-week', label: 'Esta semana' },
    { value: 'this-month', label: 'Este mes' },
    { value: 'all', label: 'Todas las tareas' },
  ];

  return (
    <header className="flex h-16 shrink-0 items-center border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-primary"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
        <h1 className="text-lg font-semibold font-headline text-foreground">CourseFlow Kanban</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 rounded-lg bg-muted p-1">
          {timeFilters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f.value)}
              className={filter === f.value ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'}
            >
              {f.label}
            </Button>
          ))}
          <Separator orientation="vertical" className="h-6 mx-1" />
           {groups.map((g) => (
            <Button
              key={g.id}
              variant={filter === g.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(g.id)}
              className={filter === g.id ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'}
            >
              {g.name}
            </Button>
          ))}
        </div>
        <AddTaskDialog onAddTask={onAddTask} courses={courses} groups={groups} />
        <ManageDataSheet
          groups={groups}
          courses={courses}
          onAddGroup={onAddGroup}
          onDeleteGroup={onDeleteGroup}
          onAddCourse={onAddCourse}
          onDeleteCourse={onDeleteCourse}
        />
      </div>
    </header>
  );
}
