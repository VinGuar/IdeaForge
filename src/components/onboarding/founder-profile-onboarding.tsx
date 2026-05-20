"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipGroup } from "@/components/ui/chip-group";
import type { FounderProfile } from "@/lib/profile/founder-profile";
import {
  ROLE_OPTIONS,
  MARKET_OPTIONS,
  TECH_OPTIONS,
  GOAL_OPTIONS,
  MONETIZATION_OPTIONS,
} from "@/lib/profile/options";
import { ArrowRight, Rocket } from "lucide-react";

const STEPS = [
  {
    id: "role",
    heading: "What best describes you?",
    sub: "This helps us match ideas to how you work.",
  },
  {
    id: "markets",
    heading: "What markets do you know from the inside?",
    sub: "Pick every space you have real knowledge of: sports fan, finance nerd, gamer, whatever. This is your unfair advantage.",
  },
  {
    id: "technical",
    heading: "How would you describe your technical ability?",
    sub: "Honest answer = better-matched ideas.",
  },
  {
    id: "goals",
    heading: "What are you trying to build?",
    sub: "And how do you want to make money from it?",
  },
] as const;

export function FounderProfileOnboarding({
  onComplete,
  onSkip,
}: {
  onComplete: (profile: FounderProfile) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState("");
  const [markets, setMarkets] = useState<string[]>([]);
  const [customMarket, setCustomMarket] = useState("");
  const [technicalLevel, setTechnicalLevel] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [monetizationPref, setMonetizationPref] = useState("");

  const totalSteps = STEPS.length;
  const currentStep = STEPS[step];

  function canAdvance() {
    if (step === 0) return !!role;
    if (step === 1) return markets.length > 0 || customMarket.trim().length > 0;
    if (step === 2) return technicalLevel.length > 0;
    if (step === 3) return !!goal;
    return true;
  }

  function handleNext() {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      const allInterests = [
        ...markets,
        ...(customMarket.trim() ? customMarket.split(",").map((s) => s.trim()).filter(Boolean) : []),
      ];
      onComplete({
        role,
        technicalLevel,
        interests: allInterests,
        goal,
        monetizationPref: monetizationPref || "Not sure yet",
        completedAt: new Date().toISOString(),
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border/70 bg-card shadow-2xl">

        {/* Header */}
        <div className="border-b border-border/70 px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="size-4 text-primary" />
            <p className="text-sm font-bold text-primary uppercase tracking-wide">
              Build your Founder Profile
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            4 quick questions to unlock personalized opportunity mapping.
          </p>
          <div className="flex gap-1.5 mt-3">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i <= step ? "bg-primary w-6" : "bg-muted/60 w-3"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question */}
        <div className="px-6 py-5 space-y-4 min-h-[260px]">
          <div>
            <p className="text-base font-semibold text-foreground">{currentStep.heading}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{currentStep.sub}</p>
          </div>

          {step === 0 && (
            <ChipGroup options={ROLE_OPTIONS} selected={role} onChange={(v) => setRole(v as string)} />
          )}

          {step === 1 && (
            <div className="space-y-3">
              <ChipGroup
                options={MARKET_OPTIONS}
                selected={markets}
                multi
                onChange={(v) => setMarkets(v as string[])}
              />
              <Input
                placeholder="Add your own (comma-separated, e.g. poker, legal tech)"
                value={customMarket}
                onChange={(e) => setCustomMarket(e.target.value)}
                className="border-border/60 bg-background/60 text-sm h-9"
              />
            </div>
          )}

          {step === 2 && (
            <ChipGroup
              options={TECH_OPTIONS}
              selected={technicalLevel}
              multi
              onChange={(v) => setTechnicalLevel(v as string[])}
            />
          )}

          {step === 3 && (
            <div className="space-y-4">
              <ChipGroup
                options={GOAL_OPTIONS}
                selected={goal}
                onChange={(v) => setGoal(v as string)}
              />
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">How do you want to make money?</p>
                <ChipGroup
                  options={MONETIZATION_OPTIONS}
                  selected={monetizationPref}
                  onChange={(v) => setMonetizationPref(v as string)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/70 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            onClick={onSkip}
          >
            Skip for now
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={!canAdvance()}
              onClick={handleNext}
              className="gap-1.5"
            >
              {step === totalSteps - 1 ? "Finish" : "Continue"}
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
