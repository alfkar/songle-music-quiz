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

const QuizGuessPicker = React.forwardRef(function QuizGuessPicker({
  label,
  placeholder,
  options,
  value,
  disabled,
  isError,
  onChange,
  onSubmit,
}, ref) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [keyboardSelectionActive, setKeyboardSelectionActive] = React.useState(false);
  const commandListRef = React.useRef(null);

  React.useImperativeHandle(ref, () => ({
    open() {
      if (!disabled) setOpen(true);
    },
  }), [disabled]);

  React.useEffect(() => {
    if (!value) setSearch("");
  }, [value]);

  const submitValue = React.useCallback((nextValue = value || search.trim()) => {
    const submittedValue = nextValue?.trim?.() || nextValue;
    if (!submittedValue || disabled) return;
    console.debug("[Songle guess picker] submit", {
      label,
      submittedValue,
      value,
      search,
      disabled,
    });
    onChange(submittedValue);
    setOpen(false);
    onSubmit(submittedValue);
  }, [disabled, label, onChange, onSubmit, search, value]);

  const getRenderedOption = React.useCallback(() => {
    const listElement = commandListRef.current;
    if (!listElement) return null;

    const selectedElement =
      listElement.querySelector("[data-option][data-selected='true']") ||
      listElement.querySelector("[data-option][aria-selected='true']");

    if (selectedElement?.getAttribute("data-option")) {
      const selectedOption = selectedElement.getAttribute("data-option");
      console.debug("[Songle guess picker] selected rendered option", {
        label,
        selectedOption,
        search,
      });
      return selectedOption;
    }

    const visibleOption = Array.from(listElement.querySelectorAll("[data-option]")).find(
      (element) => !element.hidden && element.getAttribute("aria-hidden") !== "true"
    );

    const visibleRenderedOption = visibleOption?.getAttribute("data-option") || null;
    if (visibleRenderedOption) {
      console.debug("[Songle guess picker] first rendered option", {
        label,
        visibleRenderedOption,
        search,
      });
    }
    return visibleRenderedOption;
  }, [label, search]);

  const handleEnter = (event) => {
    if (event.key !== "Enter") return;

    const selectedOption = getRenderedOption();

    if (selectedOption) {
      event.preventDefault();
      event.stopPropagation();
      console.debug("[Songle guess picker] enter selected rendered option", {
        label,
        selectedOption,
        search,
      });
      submitValue(selectedOption);
      return;
    }

    const normalizedSearch = search.trim().toLowerCase();
    const exactMatch = options.find(
      (option) => option.toLowerCase() === normalizedSearch
    );
    const partialMatches = normalizedSearch
      ? options.filter((option) => option.toLowerCase().includes(normalizedSearch))
      : [];
    const matchingOption = exactMatch || partialMatches[0] || null;

    event.preventDefault();
    event.stopPropagation();
    console.debug("[Songle guess picker] enter fallback", {
      label,
      search,
      value,
      exactMatch,
      partialMatch: partialMatches[0] || null,
      submittedValue: matchingOption || search.trim() || value,
    });
    submitValue(matchingOption || search.trim() || value);
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      setKeyboardSelectionActive(true);
      return;
    }

    if (event.key === "Enter") {
      handleEnter(event);
      return;
    }

    setKeyboardSelectionActive(false);
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
            isError={isError}
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
              onValueChange={(nextSearch) => {
                setSearch(nextSearch);
                setKeyboardSelectionActive(false);
              }}
              onKeyDown={handleInputKeyDown}
            />
            <div ref={commandListRef}>
              <CommandList className="max-h-64 overflow-y-auto">
                <CommandEmpty>No match found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option, index) => (
                    <CommandItem
                      key={`${option}-${index}`}
                      value={option}
                      data-option={option}
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
            </div>
          </Command>
        </PopoverContent>
      </Popover>
      <Button disabled={disabled || !value}>Submit {label}</Button>
    </form>
  );
});

export default QuizGuessPicker;
