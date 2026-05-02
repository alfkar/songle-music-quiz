import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

import {
  Select as ShadcnSelect,
  SelectContent as ShadcnSelectContent,
  SelectGroup as ShadcnSelectGroup,
  SelectItem as ShadcnSelectItem,
  SelectLabel as ShadcnSelectLabel,
  SelectScrollDownButton as ShadcnSelectScrollDownButton,
  SelectScrollUpButton as ShadcnSelectScrollUpButton,
  SelectSeparator as ShadcnSelectSeparator,
  SelectTrigger as ShadcnSelectTrigger,
  SelectValue as ShadcnSelectValue,
} from "@/components/ui/select";

export const inputVariants = cva("", {
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

function Select({
  ...props
}) {
  return <ShadcnSelect {...props} />;
}

function SelectGroup({
  ...props
}) {
  return <ShadcnSelectGroup {...props} />;
}

function SelectValue({
  className,
  ...props
}) {
  const { font } = props;

  return (<ShadcnSelectValue className={cn("min-w-0 truncate", font !== "normal" && "retro", className)} {...props} />);
}

function SelectTrigger({
  children,
  ...props
}) {
  const { className, font } = props;

  return (
    <div
      className={cn(
        "relative min-w-0 border-y-6 border-foreground dark:border-ring",
        className,
        font !== "normal" && "retro"
      )}>
      <ShadcnSelectTrigger
        {...props}
        className={cn("w-full min-w-0 rounded-none border-0 ring-0 [&>span]:min-w-0 [&>span]:truncate", className)}>
        {children}
      </ShadcnSelectTrigger>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 right-0 border-x-6 border-foreground dark:border-ring"
        aria-hidden="true" />
    </div>
  );
}

function SelectContent({
  className,
  children,
  ...props
}) {
  const { font } = props;

  return (
    <ShadcnSelectContent
      className={cn(
        font !== "normal" && "retro",
        className,
        "relative rounded-none border-4 border-foreground dark:border-ring -ml-1 mt-1"
      )}
      {...props}>
      {children}
    </ShadcnSelectContent>
  );
}

function SelectLabel({
  className,
  ...props
}) {
  return <ShadcnSelectLabel className={cn(className)} {...props} />;
}

function SelectItem({
  className,
  children,
  ...props
}) {
  return (
    <ShadcnSelectItem
      className={cn(
        className,
        "rounded-none border-y-3 border-dashed border-ring/0 hover:border-foreground dark:hover:border-ring"
      )}
      {...props}>
      {children}
    </ShadcnSelectItem>
  );
}

function SelectSeparator({
  className,
  ...props
}) {
  return <ShadcnSelectSeparator className={cn(className)} {...props} />;
}

function SelectScrollUpButton({
  className,
  ...props
}) {
  return <ShadcnSelectScrollUpButton className={cn(className)} {...props} />;
}

function SelectScrollDownButton({
  className,
  ...props
}) {
  return <ShadcnSelectScrollDownButton className={cn(className)} {...props} />;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
