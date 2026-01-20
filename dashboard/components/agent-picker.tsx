'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title} ({selectedAgents.length}/{maxAgents})</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-2 py-4">
          {VALORANT_AGENTS.map((agent) => {
            const isSelected = selectedAgents.includes(agent);
            const canSelect = selectedAgents.length < maxAgents || isSelected;
            
            return (
              <button
                key={agent}
                onClick={() => canSelect && onSelectAgent(agent)}
                disabled={!canSelect}
                className={`
                  relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                  ${isSelected ? 'border-primary ring-2 ring-primary' : 'border-transparent hover:border-gray-400'}
                  ${!canSelect ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                `}
              >
                <img
                  src={`/assets/agents/${agent}_icon.webp`}
                  alt={agent}
                  className="w-full h-full object-cover"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {selectedAgents.indexOf(agent) + 1}
                    </div>
                  </div>
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
      
      <div className="grid grid-cols-5 gap-2">
        {agents.map((agent, index) => (
          <div key={agent} className="relative aspect-square rounded-lg overflow-hidden border-2 border-primary">
            <img
              src={`/assets/agents/${agent}_icon.webp`}
              alt={agent}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => handleRemoveAgent(agent)}
              className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl-lg p-0.5 hover:bg-destructive/90"
            >
              <X className="h-3 w-3" />
            </button>
            <div className="absolute bottom-0 left-0 bg-black/70 text-white text-[10px] px-1 rounded-tr-lg">
              {index + 1}
            </div>
          </div>
        ))}
        
        {/* Empty slots */}
        {Array.from({ length: maxAgents - agents.length }).map((_, index) => (
          <button
            key={`empty-${index}`}
            onClick={() => setPickerOpen(true)}
            className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
          >
            <span className="text-2xl">+</span>
          </button>
        ))}
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
