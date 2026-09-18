import { Check, CircleQuestionMark, Cross } from "lucide-react";
import { Spinner } from "~/components/spinner";
import { StatusState } from "~/models/homepage";

export function CheckStatus({ state }: { state: StatusState }) {
  switch (state) {
    case "SUCCESS":
      return <Check className="text-success" />;
    case "ERROR":
    case "FAILURE":
      return <Cross className="text-error" />;
    case "PENDING":
      return <Spinner />;
    default:
      return <CircleQuestionMark />;
  }
}
