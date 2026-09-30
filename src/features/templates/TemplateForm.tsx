import { Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { ErrorMessage, FormControl, Input, Label } from "~/components/form";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import type { ReviewTemplate } from "~/models/code-review";

import { useSaveTemplateMutation } from "./data-loader";
import { SkillsField } from "./SkillsField";

interface FormValues {
  name: string;
  matcher: string;
  content: string;
  isDefault: boolean;
  skills: string[];
}

interface Props {
  template?: ReviewTemplate;
  initialContent?: string;
  onSaved: (template: ReviewTemplate) => void;
  onDelete?: () => void;
}

export function TemplateForm({
  template,
  initialContent = "",
  onSaved,
  onDelete,
}: Props) {
  const { mutateAsync } = useSaveTemplateMutation();
  const { register, control, handleSubmit, reset, setError, formState } =
    useForm<FormValues>();

  useEffect(() => {
    reset({
      name: template?.name ?? "",
      matcher: template?.matcher ?? "",
      content: template?.content ?? initialContent,
      isDefault: template?.isDefault ?? false,
      skills: template?.skills ?? [],
    });
  }, [template, initialContent, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await mutateAsync({
        id: template?.id,
        input: { ...values, matcher: values.matcher || null },
      });
      onSaved(saved);
    } catch (error) {
      setError("root", { message: String(error) });
    }
  });

  return (
    <form className="flex h-full min-h-0 flex-col gap-4" onSubmit={onSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <FormControl>
          <Label>Name</Label>
          <Input
            placeholder="Frontend review"
            {...register("name", { required: "Name is required" })}
            error={formState.errors.name?.message}
          />
        </FormControl>

        <FormControl>
          <Label>Repository matcher</Label>
          <Input
            placeholder="Regex on owner/repo, e.g. ^acme/ or /frontend$"
            className="font-mono"
            {...register("matcher")}
          />
        </FormControl>
      </div>

      <FormControl className="min-h-0 flex-1">
        <Label>Instructions</Label>
        <Textarea
          className="min-h-0 flex-1 resize-none font-mono text-xs"
          placeholder="What the review should focus on"
          {...register("content", {
            required: "Instructions are required",
          })}
        />
        <ErrorMessage error={formState.errors.content?.message} />
        <span className="text-xs text-muted-foreground">
          The output format and the existing PR discussion are appended
          automatically.
        </span>
      </FormControl>

      <FormControl>
        <Label>Skills</Label>
        <Controller
          control={control}
          name="skills"
          defaultValue={[]}
          render={({ field }) => (
            <SkillsField value={field.value} onChange={field.onChange} />
          )}
        />
        <span className="text-xs text-muted-foreground">
          Installed skills the review must use.
        </span>
      </FormControl>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Controller
          control={control}
          name="isDefault"
          render={({ field }) => (
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        Use when no matcher applies (default)
      </label>

      <ErrorMessage error={formState.errors.root?.message} />

      <div className="flex items-center gap-2">
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            onClick={onDelete}
          >
            <Trash2 />
            Delete
          </Button>
        )}
        <Button
          type="submit"
          className="ml-auto"
          disabled={formState.isSubmitting || !formState.isDirty}
        >
          Save
        </Button>
      </div>
    </form>
  );
}
