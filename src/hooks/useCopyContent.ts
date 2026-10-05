import { useState } from "react";
import { toast } from "react-toastify";

const COPY_FEEDBACK_MS = 600;

export function useCopyContent() {
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async (content: string) => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(content);
    } catch (err) {
      toast.error(`Unable to copy content ${err}`);
    } finally {
      setTimeout(() => {
        setIsCopying(false);
      }, COPY_FEEDBACK_MS);
    }
  };

  return {
    handleCopy,
    isCopying,
  };
}
