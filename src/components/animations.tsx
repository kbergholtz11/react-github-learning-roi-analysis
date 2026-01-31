"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Fade in animation for cards and sections
export function FadeIn({ 
  children, 
  delay = 0,
  duration = 0.3,
  className = ""
}: { 
  children: React.ReactNode; 
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered children animation
export function StaggerContainer({ 
  children, 
  staggerDelay = 0.1,
  className = ""
}: { 
  children: React.ReactNode; 
  staggerDelay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ 
  children, 
  className = ""
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// GitHub-style spring transition (snappy but smooth)
export const springTransition = {
  type: "spring" as const,
  stiffness: 500,
  damping: 30,
};

// Smooth ease transition
export const smoothTransition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number], // cubic-bezier for GitHub feel
};

// Animated list with layout animations (like GitHub's notification list)
export function AnimatedList({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <motion.div layout className={className}>
      <AnimatePresence mode="popLayout">
        {children}
      </AnimatePresence>
    </motion.div>
  );
}

// Animated list item with layout ID for smooth reordering
export function AnimatedListItem({ 
  children, 
  layoutId,
  className = "",
}: { 
  children: React.ReactNode; 
  layoutId: string;
  className?: string;
}) {
  return (
    <motion.div
      layout
      layoutId={layoutId}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={springTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated tab content for smooth tab switching
export function AnimatedTabContent({ 
  children, 
  activeKey,
  className = "",
}: { 
  children: React.ReactNode; 
  activeKey: string;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeKey}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.15 }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Counter animation component
export function AnimatedNumber({ 
  value,
  className = "",
}: { 
  value: number;
  className?: string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}

// Collapse/expand animation (like GitHub's collapsible sections)
export function Collapse({ 
  isOpen, 
  children,
  className = "",
}: { 
  isOpen: boolean; 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={className}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Presence animation for elements entering/leaving
export function Presence({ 
  children,
  className = "",
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={smoothTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale animation for interactive elements
export function ScaleOnHover({ 
  children, 
  scale = 1.02,
  className = ""
}: { 
  children: React.ReactNode; 
  scale?: number;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
