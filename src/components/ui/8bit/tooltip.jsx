import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

import {
  Tooltip as ShadcnTooltip,
  TooltipContent as ShadcnTooltipContent,
  TooltipProvider as ShadcnTooltipProvider,
  TooltipTrigger as ShadcnTooltipTrigger,
} from "@/components/ui/tooltip";

export const tooltipVariants = cva("", {
  variants: {
    font: {
      normal: "",
      retro: "retro",
    },
  },
  defaultVariants: {
    font: "retro",
  },
});

function TooltipProvider({ ...props }) {
  return <ShadcnTooltipProvider {...props} />;
}

function Tooltip({ ...props }) {
  return <ShadcnTooltip {...props} />;
}

function TooltipTrigger({ className, asChild = true, ...props }) {
  return <ShadcnTooltipTrigger className={cn(className)} asChild={asChild} {...props} />;
}

function TooltipContent({ children, className, font, ...props }) {
  return (
    <ShadcnTooltipContent
      className={cn(
        "relative rounded-none border-4 border-foreground bg-background px-3 py-2 text-foreground shadow-none dark:border-ring",
        tooltipVariants({ font, className })
      )}
      {...props}
    >
      {children}
    </ShadcnTooltipContent>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
