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

interface FieldProps {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

function Field({ label, hint, className, children }: FieldProps) {
  return (
    <FormControl className={className}>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </FormControl>
  );
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
      <Field label="Name">
        <Input
          placeholder="Frontend review"
          {...register("name", { required: "Name is required" })}
          error={formState.errors.name?.message}
        />
      </Field>

      <Field
        label="Instructions"
        hint="The output format and the existing PR discussion are appended automatically."
        className="min-h-0 flex-1"
      >
        <Textarea
          className="min-h-0 flex-1 resize-none"
          placeholder="What the review should focus on"
          {...register("content", {
            required: "Instructions are required",
          })}
        />
        <ErrorMessage error={formState.errors.content?.message} />
      </Field>

      <Field label="Skills" hint="Installed skills the review must use.">
        <Controller
          control={control}
          name="skills"
          defaultValue={[]}
          render={({ field }) => (
            <SkillsField value={field.value} onChange={field.onChange} />
          )}
        />
      </Field>

      <Field
        label="When to use"
        hint="The first template whose matcher accepts the repository is used, then the default one, then the built-in instructions."
      >
        <div className="grid grid-cols-2 items-center gap-4">
          <Input
            aria-label="Repository matcher"
            placeholder="Regex on owner/repo, e.g. ^acme/"
            className="font-mono"
            {...register("matcher")}
          />

          <label className="flex cursor-pointer items-center gap-2">
            <Controller
              control={control}
              name="isDefault"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <span className="flex flex-col">
              <span className="text-sm">Default template</span>
              <span className="text-xs text-muted-foreground">
                Used when no matcher applies
              </span>
            </span>
          </label>
        </div>
      </Field>

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
