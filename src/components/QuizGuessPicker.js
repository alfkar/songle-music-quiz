"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/8bit/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/8bit/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/8bit/popover";

export default function QuizGuessPicker({
  label,
  placeholder,
  options,
  value,
  disabled,
  onChange,
  onSubmit,
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const submitValue = React.useCallback((nextValue = value) => {
    if (!nextValue || disabled) return;
    onChange(nextValue);
    setOpen(false);
    onSubmit(nextValue);
  }, [disabled, onChange, onSubmit, value]);

  const handleEnter = (event) => {
    if (event.key !== "Enter") return;

    const normalizedSearch = search.trim().toLowerCase();
    const exactMatch = options.find(
      (option) => option.toLowerCase() === normalizedSearch
    );
    const partialMatches = normalizedSearch
      ? options.filter((option) => option.toLowerCase().includes(normalizedSearch))
      : [];
    const matchingOption = exactMatch || (partialMatches.length === 1 ? partialMatches[0] : null);

    event.preventDefault();
    event.stopPropagation();
    submitValue(matchingOption || value);
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        submitValue();
      }}
    >
      <label className="text-sm font-bold">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between"
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {value || placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          side="bottom"
          avoidCollisions={false}
        >
          <Command>
            <CommandInput
              placeholder={placeholder}
              value={search}
              onValueChange={setSearch}
              onKeyDownCapture={handleEnter}
            />
            <CommandList className="max-h-64 overflow-y-auto">
              <CommandEmpty>No match found.</CommandEmpty>
              <CommandGroup>
                {options.map((option, index) => (
                  <CommandItem
                    key={`${option}-${index}`}
                    value={option}
                    onSelect={() => {
                      setSearch(option);
                      submitValue(option);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button disabled={disabled || !value}>Submit {label}</Button>
    </form>
  );
}
