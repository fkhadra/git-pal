import {
  Bug,
  Check,
  Lightbulb,
  MessageCircle,
  MessageSquare,
  Send,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import commands from "~/commands";
import { Button } from "~/components";
import { FormControl, Input, Label, Textarea } from "~/components/Form";
import { Section } from "./Section";
import { CardSelect } from "~/components/CardSelect";
import { IconWrapper } from "~/components/IconWrapper";

export function FeedbackSection() {
  const [kind, setKind] = useState("feature_request");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await commands.submitFeedback({ email, kind, body });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Section icon={MessageSquare} title="Send us feedback">
      <div className="flex flex-col gap-5">
        <FormControl>
          <Label>Feedback type</Label>
          <CardSelect
            onChange={setKind}
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
            value={kind}
          />
        </FormControl>

        <FormControl>
          <Label>Your email</Label>
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormControl>

        <FormControl>
          <Label>Your message</Label>
          <Textarea
            placeholder="Tell me what's on your mind..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </FormControl>

        {error && <p className="text-alert text-sm">{error}</p>}

        <Button
          disabled={submitting || !body.trim() || submitted}
          onClick={handleSubmit}
          className="w-full"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${submitted}`}
              className="flex items-center gap-1.5"
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              initial={{ opacity: 0, y: -25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 25 }}
            >
              {submitted ? (
                <>
                  <Check className="size-4" />
                  Sent!
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Send Feedback
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
    </Section>
  );
}
