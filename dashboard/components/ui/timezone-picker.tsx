"use client";

import * as React from "react";
import { ChevronsUpDown, Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const COMMON_TIMEZONES = Intl.supportedValuesOf('timeZone');

interface TimezonePickerProps {
  value: string;
  onChange: (timezone: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimezonePicker({ value, onChange, placeholder = "Select timezone...", className }: TimezonePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!search) return COMMON_TIMEZONES.slice(0, 50);
    const lower = search.toLowerCase();
    return COMMON_TIMEZONES.filter(tz => tz.toLowerCase().includes(lower)).slice(0, 50);
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn("justify-between", className)}>
          <span className="flex items-center gap-2 truncate">
            <Globe className="h-4 w-4 shrink-0 opacity-50" />
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0"
        align="start"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search timezone..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {filtered.map(tz => (
                <CommandItem
                  key={tz}
                  value={tz}
                  onSelect={() => { onChange(tz); setOpen(false); setSearch(""); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === tz ? "opacity-100" : "opacity-0")} />
                  {tz}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
