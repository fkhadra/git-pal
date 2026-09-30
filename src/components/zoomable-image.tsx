import { cn } from "cn";
import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";

interface Props {
  src?: string;
  alt?: string;
  className?: string;
}

export function ZoomableImage({ src, alt = "", className }: Props) {
  const [open, setOpen] = useState(false);
  const [isActualSize, setIsActualSize] = useState(false);

  const toggleOpen = (next: boolean) => {
    setOpen(next);
    setIsActualSize(false);
  };

  return (
    <>
      <button
        type="button"
        title="Zoom in"
        className="cursor-zoom-in"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleOpen(true);
        }}
      >
        <img src={src} alt={alt} className={className} />
      </button>

      <Dialog open={open} onOpenChange={toggleOpen}>
        <DialogContent className="mt-0 flex max-h-[90vh] w-auto max-w-[95vw] items-center justify-center overflow-auto p-2">
          <DialogTitle className="sr-only">{alt || "Image"}</DialogTitle>
          <img
            src={src}
            alt={alt}
            onClick={() => setIsActualSize(!isActualSize)}
            className={cn(
              "rounded",
              isActualSize
                ? "max-w-none cursor-zoom-out"
                : "max-h-[calc(90vh-1rem)] max-w-[calc(95vw-1rem)] cursor-zoom-in object-contain",
            )}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
