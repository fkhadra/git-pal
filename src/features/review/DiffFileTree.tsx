import { cn } from "cn";
import { Search, X } from "lucide-react";
import { useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import type { PullRequestFile } from "~/models";

import { getFileStatusColor, getFileStatusIcon } from "./utils";

interface DiffFileTreeProps {
  files: PullRequestFile[];
  selectedFile: string | null;
  onSelectFile: (filename: string) => void;
  reviewedFiles: Set<string>;
  viewedFiles: Set<string>;
  additions: number;
  deletions: number;
  searchRef?: React.Ref<HTMLInputElement>;
}

export function DiffFileTree({
  files,
  selectedFile,
  onSelectFile,
  reviewedFiles,
  viewedFiles,
  additions,
  deletions,
  searchRef,
}: DiffFileTreeProps) {
  const [filter, setFilter] = useState("");
  const query = filter.trim().toLowerCase();
  const visibleFiles = query
    ? files.filter((f) => f.filename.toLowerCase().includes(query))
    : files;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-4 text-xs font-medium tracking-wide text-muted-foreground">
        <span className="uppercase">Files changed ({files.length})</span>
        <span className="ml-auto font-mono text-success">+{additions}</span>
        <span className="font-mono text-destructive">-{deletions}</span>
      </div>
      <div className="shrink-0 px-2 pt-2">
        <InputGroup className="h-7">
          <InputGroupAddon align="inline-start">
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setFilter("")}
            placeholder="Search files..."
            className="text-xs"
          />
          {filter && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" onClick={() => setFilter("")}>
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>
      <div className="flex flex-1 flex-col gap-px overflow-y-auto p-2">
        {visibleFiles.length === 0 && (
          <p className="p-2 text-center text-xs text-muted-foreground">
            No matching files
          </p>
        )}
        {visibleFiles.map((file) => (
          <button
            key={file.filename}
            onClick={() => onSelectFile(file.filename)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent/60",
              selectedFile === file.filename && "bg-accent hover:bg-accent",
              viewedFiles.has(file.filename) && "opacity-50",
            )}
          >
            <span
              className={cn(
                "shrink-0 font-mono text-[10px] font-bold",
                getFileStatusColor(file.status),
              )}
            >
              {getFileStatusIcon(file.status)}
            </span>
            <span className="min-w-0 truncate" title={file.filename}>
              {file.filename}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[10px]">
              {file.additions > 0 && (
                <span className="text-success">+{file.additions}</span>
              )}
              {file.deletions > 0 && (
                <span className="text-destructive">-{file.deletions}</span>
              )}
            </span>
            {reviewedFiles.has(file.filename) && (
              <span className="shrink-0 text-[10px] text-success">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
