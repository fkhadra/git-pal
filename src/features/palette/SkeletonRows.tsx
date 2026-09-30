import { Skeleton } from "~/components/ui/skeleton";

import { Container } from "./Layout";

export function SkeletonRows({ count = 7, hideRightPart = false }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="ml-2 h-4 w-1/3" />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex min-h-12 items-center gap-2 px-2 py-0">
          <Container>
            <Skeleton className="size-9" />
            <div>
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            {!hideRightPart && <Skeleton className="h-8 w-24" />}
          </Container>
        </div>
      ))}
    </div>
  );
}
