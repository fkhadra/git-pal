import { Bug, Lightbulb, MessageCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Controller, useForm } from "react-hook-form";

import commands from "~/commands";
import { CardSelect } from "~/components/card-select";
import {
  ErrorMessage,
  FormControl,
  Input,
  Label,
  Textarea,
} from "~/components/form";
import { IconWrapper } from "~/components/icon-wrapper";
import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import { withDelay } from "~/libs/utils";
import { FeedbackKind } from "~/models/feedback";

import { Section } from "./Section";

type ApiError =
  | { errors: Record<string, string> }
  | string
  | { message: string };

type FormValues = {
  kind: FeedbackKind;
  body: string;
  email: string;
};

export function FeedbackSection() {
  const { register, formState, handleSubmit, control, setError, reset } =
    useForm<FormValues>({
      defaultValues: {
        body: "",
        email: "",
        kind: "feature_request",
      },
      mode: "onBlur",
    });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await withDelay(commands.submitFeedback(data));

      setTimeout(reset, 3000);
    } catch (err) {
      const apiErr = err as ApiError;
      if (typeof apiErr === "string") {
        setError("root", { message: apiErr });
      } else if ("errors" in apiErr && apiErr?.errors) {
        for (const field of Object.keys(apiErr.errors)) {
          setError(field as keyof FormValues, {
            message: apiErr.errors[field],
          });
        }
      } else if ("message" in apiErr && apiErr?.message) {
        setError("root", { message: apiErr.message });
      }
    }
  });

  let buttonStatus = "idle";

  if (formState.isSubmitting) {
    buttonStatus = "inFlight";
  } else if (formState.isSubmitSuccessful) {
    buttonStatus = "success";
  }

  return (
    <Section icon={MessageCircle} title="Share your feedback">
      <form className="flex flex-col gap-5" onSubmit={onSubmit}>
        <FormControl>
          <Label>Feedback type</Label>
          <Controller
            control={control}
            name="kind"
            rules={{ required: true }}
            render={({ field }) => (
              <CardSelect
                onChange={field.onChange}
                legend="Feedback type"
                options={[
                  {
                    Icon: (
                      <IconWrapper>
                        <Lightbulb className="text-warning" />
                      </IconWrapper>
                    ),
                    label: "Idea",
                    value: "feature_request",
                  },
                  {
                    Icon: (
                      <IconWrapper>
                        <Bug className="text-alert" />
                      </IconWrapper>
                    ),
                    label: "Bug",
                    value: "bug",
                  },
                  {
                    Icon: (
                      <IconWrapper>
                        <MessageCircle className="text-info" />
                      </IconWrapper>
                    ),
                    label: "Other",
                    value: "other",
                  },
                ]}
                value={field.value}
              />
            )}
          />
        </FormControl>

        <FormControl>
          <Label>Your email</Label>
          <Input
            type="email"
            placeholder="Enter your email"
            {...register("email", { required: true })}
            error={formState.errors.email?.message}
          />
        </FormControl>

        <FormControl>
          <Label>Your message</Label>
          <Textarea
            placeholder="Tell me what's on your mind..."
            {...register("body", { required: true })}
            error={formState.errors.body?.message}
          />
        </FormControl>

        <ErrorMessage error={formState.errors.root?.message} />

        <Button
          disabled={formState.isSubmitting || formState.isSubmitSuccessful}
          className="relative w-full overflow-hidden"
          type="submit"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={buttonStatus}
              className="flex items-center gap-1.5"
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              initial={{ opacity: 0, y: -25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 25 }}
            >
              {buttonStatus === "inFlight" && <Spinner />}
              {buttonStatus === "success" &&
                "Your feedback has been shared! 🙌"}
              {buttonStatus === "idle" && "Send Feedback"}
            </motion.span>
          </AnimatePresence>
        </Button>
      </form>
    </Section>
  );
}
