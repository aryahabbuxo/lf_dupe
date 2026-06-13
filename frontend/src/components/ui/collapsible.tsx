import * as React from "react";
import { cn } from "@/lib/utils";

interface CollapsibleContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue>({
  open: false,
  onOpenChange: () => {},
});

interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

function Collapsible({ open = false, onOpenChange = () => {}, children, className }: CollapsibleProps) {
  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange }}>
      <div className={cn("", className)} data-state={open ? "open" : "closed"}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

function CollapsibleTrigger({ children, onClick, className, ...props }: CollapsibleTriggerProps) {
  const { open, onOpenChange } = React.useContext(CollapsibleContext);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    onOpenChange(!open);
  };

  return (
    <button onClick={handleClick} aria-expanded={open} className={className} {...props}>
      {children}
    </button>
  );
}

interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {}

function CollapsibleContent({ children, className, ...props }: CollapsibleContentProps) {
  const { open } = React.useContext(CollapsibleContext);
  if (!open) return null;
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
