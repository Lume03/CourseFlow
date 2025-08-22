import type { FilterType, Course, Group, Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AddTaskDialog } from './add-task-dialog';
import { ManageDataSheet } from './manage-data-sheet';
import { useSession, signOut } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListFilter, LogOut, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';


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
  isSaving: boolean;
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
  onDeleteCourse,
  isSaving
}: AppHeaderProps) {
  const { data: session } = useSession();

  const timeFilters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'Todas las tareas' },
    { value: 'this-week', label: 'Esta semana' },
    { value: 'this-month', label: 'Este mes' },
  ];

  const getFilterLabel = () => {
    const timeFilter = timeFilters.find(f => f.value === filter);
    if (timeFilter) return timeFilter.label;
    const groupFilter = groups.find(g => g.id === filter);
    if (groupFilter) return groupFilter.name;
    return 'Filtro';
  }

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
        <h1 className="text-lg font-semibold font-headline text-foreground hidden md:block">CourseFlow Kanban</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
         {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="md:w-[180px] justify-start">
              <ListFilter className="mr-0 md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">{getFilterLabel()}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filtros de tiempo</DropdownMenuLabel>
            <DropdownMenuGroup>
              {timeFilters.map((f) => (
                <DropdownMenuItem key={f.value} onSelect={() => setFilter(f.value)}>
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            {groups.length > 0 && <DropdownMenuSeparator />}
            {groups.length > 0 && <DropdownMenuLabel>Filtros de grupo</DropdownMenuLabel>}
             <DropdownMenuGroup>
                {groups.map((g) => (
                  <DropdownMenuItem key={g.id} onSelect={() => setFilter(g.id)}>
                    {g.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <AddTaskDialog onAddTask={onAddTask} courses={courses} groups={groups} />
        <ManageDataSheet
          groups={groups}
          courses={courses}
          onAddGroup={onAddGroup}
          onDeleteGroup={onDeleteGroup}
          onAddCourse={onAddCourse}
          onDeleteCourse={onDeleteCourse}
        />
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={session?.user?.image ?? ''} alt={session?.user?.name ?? ''} />
                        <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email}
                    </p>
                </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar sesión</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
