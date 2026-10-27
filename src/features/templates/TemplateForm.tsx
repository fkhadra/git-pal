import { Trash2 } from "lucide-react";
import { useEffect } from "react";
import { type Control, Controller, useForm } from "react-hook-form";

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
  riskGuidelines: string;
  autoReview: boolean;
  autoApprove: boolean;
  requireGreenCi: boolean;
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

interface SwitchFieldProps {
  control: Control<FormValues>;
  name: "autoReview" | "autoApprove" | "requireGreenCi";
  label: string;
  hint: string;
  disabled?: boolean;
}

function SwitchField({
  control,
  name,
  label,
  hint,
  disabled,
}: SwitchFieldProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
            disabled={disabled}
          />
        )}
      />
      <span className="flex flex-col">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
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
  const { register, control, handleSubmit, reset, setError, watch, formState } =
    useForm<FormValues>();
  const autoApprove = watch("autoApprove");

  useEffect(() => {
    reset({
      name: template?.name ?? "",
      matcher: template?.matcher ?? "",
      content: template?.content ?? initialContent,
      isDefault: template?.isDefault ?? false,
      skills: template?.skills ?? [],
      riskGuidelines: template?.riskGuidelines ?? "",
      autoReview: template?.autoReview ?? false,
      autoApprove: template?.autoApprove ?? false,
      requireGreenCi: template?.requireGreenCi ?? true,
    });
  }, [template, initialContent, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await mutateAsync({
        id: template?.id,
        input: {
          ...values,
          matcher: values.matcher || null,
          riskGuidelines: values.riskGuidelines || null,
        },
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

      <Field
        label="Risk guidelines"
        hint="Rules for the risk of merging, they take precedence over the built-in levels."
      >
        <Textarea
          rows={3}
          className="resize-none"
          placeholder="e.g. Database migrations are always high risk"
          {...register("riskGuidelines")}
        />
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

      <Field label="Automation">
        <div className="grid grid-cols-3 items-center gap-4">
          <SwitchField
            control={control}
            name="autoReview"
            label="Auto-review"
            hint="When requested as code owner"
          />
          <SwitchField
            control={control}
            name="autoApprove"
            label="Auto-approve"
            hint="Minimal risk, no errors or warnings"
          />
          <SwitchField
            control={control}
            name="requireGreenCi"
            label="Require green CI"
            hint="Before auto-approving"
            disabled={!autoApprove}
          />
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
