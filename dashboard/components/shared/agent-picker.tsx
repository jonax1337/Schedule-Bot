'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { microInteractions, gridStagger, cn } from "@/lib/animations";

const VALORANT_AGENTS = [
  'Astra', 'Breach', 'Brimstone', 'Chamber', 'Clove', 'Cypher', 'Deadlock',
  'Fade', 'Gekko', 'Harbor', 'Iso', 'Jett', 'KAYO', 'Killjoy', 'Neon', 'Omen',
  'Phoenix', 'Raze', 'Reyna', 'Sage', 'Skye', 'Sova', 'Tejo', 'Veto',
  'Viper', 'Vyse', 'Waylay', 'Yoru'
].sort();

interface AgentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAgents: string[];
  onSelectAgent: (agent: string) => void;
  maxAgents?: number;
  title?: string;
}

export function AgentPicker({
  open,
  onOpenChange,
  selectedAgents,
  onSelectAgent,
  maxAgents = 5,
  title = "Select Agents"
}: AgentPickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{title} ({selectedAgents.length}/{maxAgents})</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-6 gap-1.5 py-3">
          {VALORANT_AGENTS.map((agent, index) => {
            const isSelected = selectedAgents.includes(agent);
            const canSelect = selectedAgents.length < maxAgents || isSelected;
            const row = Math.floor(index / 6);
            const col = index % 6;

            return (
              <button
                key={agent}
                onClick={() => canSelect && onSelectAgent(agent)}
                disabled={!canSelect}
                className={cn(
                  "relative aspect-square rounded-md overflow-hidden border-2 transition-all",
                  isSelected ? 'border-primary ring-2 ring-primary' : 'border-transparent hover:border-gray-400',
                  !canSelect ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105',
                  gridStagger(row, col, 6, 'fast', 'scaleIn'),
                  microInteractions.smooth
                )}
                title={agent}
              >
                <img
                  src={`/assets/agents/${agent}_icon.webp`}
                  alt={agent}
                  className="w-full h-full object-cover"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/20" />
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-muted-foreground">{agents.length}/{maxAgents}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[...agents].sort().map((agent, index) => (
          <div
            key={agent}
            className={cn(
              "relative w-12 h-12 rounded-md overflow-hidden border-2 border-primary",
              "animate-scaleIn",
              microInteractions.hoverScale
            )}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <img
              src={`/assets/agents/${agent}_icon.webp`}
              alt={agent}
              className="w-full h-full object-cover"
              title={agent}
            />
            <button
              type="button"
              onClick={() => handleRemoveAgent(agent)}
              className={cn(
                "absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90 shadow-sm",
                microInteractions.activePress,
                microInteractions.smooth
              )}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}

        {/* Add button */}
        {agents.length < maxAgents && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={cn(
              "w-12 h-12 rounded-md border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors",
              microInteractions.hoverScale,
              microInteractions.smooth
            )}
            title="Add agent"
          >
            <span className="text-xl">+</span>
          </button>
        )}
      </div>

      <AgentPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedAgents={agents}
        onSelectAgent={handleSelectAgent}
        maxAgents={maxAgents}
        title={label}
      />
    </div>
  );
}
