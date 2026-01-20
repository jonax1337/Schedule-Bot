'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const VALORANT_AGENTS = [
  'Astra', 'Breach', 'Brimstone', 'Chamber', 'Clove', 'Cypher', 'Deadlock',
  'Fade', 'Gekko', 'Harbor', 'Iso', 'Jett', 'KAYO', 'Killjoy', 'Omen',
  'Phoenix', 'Raze', 'Reyna', 'Sage', 'Skye', 'Sova', 'Tejo', 'Veto',
  'Viper', 'Vyse', 'Waylay', 'Yoru'
];

interface AgentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAgents: string[];
  onSelectAgent: (agent: string) => void;
  maxAgents?: number;
  title?: string;
  trigger?: React.ReactNode;
}

export function AgentPicker({
  open,
  onOpenChange,
  selectedAgents,
  onSelectAgent,
  maxAgents = 5,
  title = "Select Agents",
  trigger
}: AgentPickerProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {trigger && <PopoverTrigger asChild>{trigger}</PopoverTrigger>}
      <PopoverContent className="w-[420px] p-0" align="center">
        <div className="p-4 border-b bg-muted/50">
          <div className="font-medium text-sm">
            {title}
            <span className="text-muted-foreground ml-2">
              ({selectedAgents.length}/{maxAgents})
            </span>
          </div>
        </div>
        <ScrollArea className="h-[320px]">
          <div className="grid grid-cols-6 gap-1.5 p-3">
            {VALORANT_AGENTS.map((agent) => {
              const isSelected = selectedAgents.includes(agent);
              const canSelect = selectedAgents.length < maxAgents || isSelected;
              
              return (
                <button
                  key={agent}
                  onClick={() => canSelect && onSelectAgent(agent)}
                  disabled={!canSelect}
                  className={`
                    relative aspect-square rounded-md overflow-hidden border-2 transition-all
                    ${isSelected ? 'border-primary ring-2 ring-primary/50 scale-95' : 'border-transparent hover:border-muted-foreground/50'}
                    ${!canSelect ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                  `}
                  title={agent}
                >
                  <img
                    src={`/assets/agents/${agent}_icon.webp`}
                    alt={agent}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                        {selectedAgents.indexOf(agent) + 1}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

interface AgentSelectorProps {
  label: string;
  agents: string[];
  onChange: (agents: string[]) => void;
  maxAgents?: number;
}

export function AgentSelector({ label, agents, onChange, maxAgents = 5 }: AgentSelectorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleSelectAgent = (agent: string) => {
    if (agents.includes(agent)) {
      // Remove agent
      onChange(agents.filter(a => a !== agent));
    } else if (agents.length < maxAgents) {
      // Add agent
      onChange([...agents, agent]);
    }
  };

  const handleRemoveAgent = (agent: string) => {
    onChange(agents.filter(a => a !== agent));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-muted-foreground">{agents.length}/{maxAgents}</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* Selected agents with remove button */}
        {agents.map((agent, index) => (
          <div 
            key={agent} 
            className="relative group w-14 h-14 rounded-lg overflow-hidden border-2 border-primary ring-2 ring-primary/20"
          >
            <img
              src={`/assets/agents/${agent}_icon.webp`}
              alt={agent}
              className="w-full h-full object-cover"
              title={agent}
            />
            <button
              onClick={() => handleRemoveAgent(agent)}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[10px] text-center py-0.5 font-medium">
              {index + 1}
            </div>
          </div>
        ))}
        
        {/* Add button - opens popover */}
        {agents.length < maxAgents && (
          <AgentPicker
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            selectedAgents={agents}
            onSelectAgent={handleSelectAgent}
            maxAgents={maxAgents}
            title={label}
            trigger={
              <button
                className="w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-all hover:scale-105"
              >
                <span className="text-2xl">+</span>
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
