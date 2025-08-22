import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function KanbanSkeleton() {
  const columns = ['No Iniciado', 'En Progreso', 'Terminado'];

  return (
    <div className="grid h-full w-full grid-cols-1 gap-6 md:grid-cols-3">
      {columns.map((title) => (
        <div key={title} className="flex flex-col rounded-lg bg-secondary/50">
          <h2 className="p-4 text-lg font-semibold font-headline text-foreground sticky top-0 bg-secondary/50 backdrop-blur-sm rounded-t-lg z-10">
            {title}
          </h2>
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-4 p-4 pt-0">
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
