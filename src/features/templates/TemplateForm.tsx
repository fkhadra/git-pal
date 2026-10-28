import { Trash2 } from "lucide-react";
import { useEffect } from "react";
import { type Control, Controller, useForm, useWatch } from "react-hook-form";

import { ErrorMessage, FormControl, Input, Label } from "~/components/form";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import type { ReviewTemplate, RiskLevel } from "~/models/code-review";

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
  autoApproveMaxRisk: RiskLevel;
  requireGreenCi: boolean;
}

// high would approve whatever the risk
const MAX_RISKS: { value: RiskLevel; label: string }[] = [
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
];

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
}

function SwitchField({ control, name, label, hint }: SwitchFieldProps) {
  return (
    <label className="col-span-3 grid cursor-pointer grid-cols-subgrid items-center">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch checked={field.value} onCheckedChange={field.onChange} />
        )}
      />
      <span className="text-sm">{label}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
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
  const { register, control, handleSubmit, reset, setError, formState } =
    useForm<FormValues>();
  const autoApprove = useWatch({ control, name: "autoApprove" });

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
      autoApproveMaxRisk: template?.autoApproveMaxRisk ?? "minimal",
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
    <form
      className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-1"
      onSubmit={onSubmit}
    >
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
      >
        <Textarea
          className="min-h-48 resize-y"
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
          className="resize-y"
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
        <div className="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-3">
          <SwitchField
            control={control}
            name="autoReview"
            label="Auto-review"
            hint="Review requests made to you as code owner"
          />
          <SwitchField
            control={control}
            name="autoApprove"
            label="Auto-approve"
            hint="Approve reviews without errors or warnings, up to a max risk"
          />
          {autoApprove && (
            <>
              <div className="col-span-3 grid grid-cols-subgrid items-center">
                <span />
                <span className="text-sm">Max risk</span>
                <Controller
                  control={control}
                  name="autoApproveMaxRisk"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(value as RiskLevel)
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        aria-label="Max risk"
                        className="w-32"
                      >
                        <SelectValue>
                          {
                            MAX_RISKS.find((r) => r.value === field.value)
                              ?.label
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {MAX_RISKS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <SwitchField
                control={control}
                name="requireGreenCi"
                label="Require green CI"
                hint="Approve only once CI checks pass"
              />
            </>
          )}
        </div>
      </Field>

      <ErrorMessage error={formState.errors.root?.message} />

      <div className="sticky bottom-0 flex items-center gap-2 border-t bg-popover pt-4">
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
