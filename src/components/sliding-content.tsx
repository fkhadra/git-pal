import { AnimatePresence, motion, type Variants } from "motion/react";

const variants: Variants = {
  initial: { opacity: 0, y: -25 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 25 },
};

interface Props {
  from: React.ReactNode;
  to: React.ReactNode;
  toggle: boolean;
  className?: string;
}

export function SlidingContent({ from, to, toggle, className }: Props) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        variants={variants}
        animate="animate"
        initial="initial"
        exit="exit"
        key={toggle ? "to" : "from"}
        className={className}
      >
        {toggle ? to : from}
      </motion.span>
    </AnimatePresence>
  );
}
