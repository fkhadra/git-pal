import { FolderGit2, X } from "lucide-react";
import { useId, useState } from "react";

import commands from "~/commands";
import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useAppContext } from "~/features/shared";
import { digitsOnly, nil } from "~/libs/utils";
import type { RepositoryFilter } from "~/models/settings";

import { Section } from "./Section";

const ENTRY_PATTERN = /^[\w.-]+(\/[\w.-]+)?$/;
// GitHub caps search queries at 256 characters, the base query takes the rest
const QUERY_BUDGET_CHARS = 150;
// each entry becomes `repo:`/`user:` plus a separating space
const QUALIFIER_OVERHEAD_CHARS = 6;
const MIN_PULL_REQUEST_LIMIT = 1;
// GitHub's largest search page
const MAX_PULL_REQUEST_LIMIT = 100;

/** A bare owner matches all of its repositories, a common mistake worth showing. */
function entryKindLabel(entry: string) {
  return entry.includes("/") ? "repo" : "owner";
}

function queryLength(filter: RepositoryFilter) {
  return [...filter.include, ...filter.exclude].reduce(
    (total, entry) => total + entry.length + QUALIFIER_OVERHEAD_CHARS,
    0,
  );
}

function EntryList({
  title,
  description,
  entries,
  suggestionsId,
  onChange,
}: {
  title: string;
  description: string;
  entries: string[];
  suggestionsId: string;
  onChange: (entries: string[]) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [isChecking, setIsChecking] = useState(false);

  // typos would silently match nothing, GitHub confirms the entry exists
  const add = async () => {
    const entry = value.trim();
    if (!entry) return;

    if (!ENTRY_PATTERN.test(entry)) {
      setError("Use owner or owner/repo");
      return;
    }

    const isDuplicate = entries.some(
      (e) => e.toLowerCase() === entry.toLowerCase(),
    );
    if (isDuplicate) {
      setValue("");
      return;
    }

    setIsChecking(true);
    try {
      await commands.checkScopeEntry(entry);
      onChange([...entries, entry]);
      setValue("");
      setError(undefined);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <span className="text-sm">{title}</span>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2">
        <Input
          list={suggestionsId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;

            e.preventDefault();
            add();
          }}
          placeholder="owner or owner/repo"
          className="h-8"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={isChecking}
          onClick={add}
        >
          {isChecking ? <Spinner className="size-4" /> : "Add"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entries.map((entry) => (
            <span
              key={entry}
              className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
            >
              <span className="text-muted-foreground">
                {entryKindLabel(entry)}
              </span>
              <span className="font-mono">{entry}</span>
              <button
                type="button"
                title={`Remove ${entry}`}
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onChange(entries.filter((e) => e !== entry))}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function RepositoriesSection() {
  const { userProfile, settings } = useAppContext();
  // the context hands read-only settings
  const [filter, setFilter] = useState<RepositoryFilter>(() => ({
    include: [...settings.repositoryFilter.include],
    exclude: [...settings.repositoryFilter.exclude],
  }));
  // text so the field can be cleared while typing
  const [limit, setLimit] = useState(String(settings.pullRequestLimit));
  const suggestionsId = useId();
  const limitId = useId();

  const owners = [
    userProfile.login,
    ...(userProfile.organizations.nodes ?? []).filter(nil).map((o) => o.login),
  ];

  const save = (next: RepositoryFilter) => {
    setFilter(next);
    commands.updateSetting({ repositoryFilter: next });
  };

  const saveLimit = () => {
    const next = Math.max(
      MIN_PULL_REQUEST_LIMIT,
      Math.min(MAX_PULL_REQUEST_LIMIT, Number(limit)),
    );
    setLimit(String(next));
    commands.updateSetting({ pullRequestLimit: next });
  };

  return (
    <Section icon={FolderGit2} title="Repositories">
      <p className="mb-4 text-xs text-muted-foreground">
        Applies to Review Requested, Mentioned, notifications and repository
        lists. Your own pull requests always show. Entries are checked on GitHub
        when added.
      </p>
      <datalist id={suggestionsId}>
        {owners.map((owner) => (
          <option key={owner} value={owner} />
        ))}
      </datalist>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor={limitId} className="flex-1">
            Pull requests per list
            <span className="block text-xs text-muted-foreground">
              Across every repository, {MAX_PULL_REQUEST_LIMIT} at most.
            </span>
          </label>
          <Input
            id={limitId}
            inputMode="numeric"
            value={limit}
            onChange={(e) => setLimit(digitsOnly(e.target.value))}
            onBlur={saveLimit}
            className="h-8 w-20"
          />
        </div>
        <EntryList
          title="Include"
          description="Only these repositories, all of them when empty."
          entries={filter.include}
          suggestionsId={suggestionsId}
          onChange={(include) => save({ ...filter, include })}
        />
        <EntryList
          title="Exclude"
          description="Never these repositories, even when included."
          entries={filter.exclude}
          suggestionsId={suggestionsId}
          onChange={(exclude) => save({ ...filter, exclude })}
        />
      </div>
      {queryLength(filter) > QUERY_BUDGET_CHARS && (
        <p className="mt-4 text-xs text-warning">
          Too many entries for GitHub&apos;s search. The app filters the first{" "}
          {limit} results itself, some pull requests may be missing.
        </p>
      )}
    </Section>
  );
}
