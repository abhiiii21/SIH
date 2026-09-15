import React, { useState } from "react";
import { Check, Activity, Clock, ShieldAlert, CheckCircle2, X } from "lucide-react";

export interface StatusStage {
  id: string;
  title: string;
  sublabel: string;
  status: "completed" | "current" | "upcoming";
  timestamp: string;
  agency?: string;
  details: string;
}

interface StatusStepperProps {
  stages: StatusStage[];
  onAdvanceStage?: (stageId: string) => void;
}

export const StatusStepper: React.FC<StatusStepperProps> = ({ stages, onAdvanceStage }) => {
  const [activePopoverStage, setActivePopoverStage] = useState<StatusStage | null>(null);

  const getStageIcon = (stage: StatusStage, idx: number) => {
    if (stage.status === "completed") {
      return <Check className="w-4 h-4 text-white stroke-[2.5]" />;
    }
    if (stage.status === "current") {
      return <Activity className="w-4 h-4 text-white stroke-[2.5]" />;
    }
    return <span className="text-xs font-bold text-slate-400 font-mono">{idx + 1}</span>;
  };

  return (
    <div className="relative w-full bg-white/95 backdrop-blur-xs border border-[#E1EEF9] rounded-2xl p-3.5 shadow-[0_4px_20px_rgba(30,95,191,0.06)]">
      <div className="flex items-center justify-between relative">
        {stages.map((stage, idx) => {
          const isCompleted = stage.status === "completed";
          const isCurrent = stage.status === "current";
          const isUpcoming = stage.status === "upcoming";
          const isLast = idx === stages.length - 1;

          return (
            <React.Fragment key={stage.id}>
              {/* Stepper Node */}
              <button
                type="button"
                onClick={() =>
                  setActivePopoverStage(activePopoverStage?.id === stage.id ? null : stage)
                }
                className="group relative flex flex-col items-center cursor-pointer select-none text-left focus:outline-none z-10"
              >
                {/* Circle Marker */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${
                    isCompleted
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-2 ring-emerald-100 group-hover:scale-105"
                      : isCurrent
                      ? "bg-gradient-to-br from-[#1E5FBF] to-[#2E8FE8] text-white ring-4 ring-sky-200/80 shadow-md group-hover:scale-105 animate-pulse"
                      : "bg-[#F8FBFE] border border-[#E1EEF9] text-slate-400 group-hover:border-sky-300 group-hover:bg-white"
                  }`}
                >
                  {getStageIcon(stage, idx)}
                </div>

                {/* Labels */}
                <div className="mt-1.5 text-center min-w-[72px] sm:min-w-[90px]">
                  <div
                    className={`text-[11px] font-bold leading-tight ${
                      isCurrent
                        ? "text-[#1E5FBF]"
                        : isCompleted
                        ? "text-[#0B2545]"
                        : "text-slate-500"
                    }`}
                  >
                    {stage.title}
                  </div>
                  <div
                    className={`text-[9px] font-medium leading-tight mt-0.5 ${
                      isCurrent
                        ? "text-amber-600 font-bold"
                        : isCompleted
                        ? "text-emerald-700"
                        : "text-slate-400"
                    }`}
                  >
                    {stage.sublabel}
                  </div>
                </div>
              </button>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 h-[2.5px] mx-1 sm:mx-2 -mt-6 rounded-full relative overflow-hidden bg-[#E1EEF9]">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isCompleted
                        ? "w-full bg-gradient-to-r from-emerald-500 to-[#1E5FBF]"
                        : isCurrent
                        ? "w-1/2 bg-gradient-to-r from-[#1E5FBF] to-sky-300"
                        : "w-0"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Stage Detail Popover */}
      {activePopoverStage && (
        <div className="absolute top-full left-4 right-4 sm:left-auto sm:right-4 mt-2 sm:w-96 bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_12px_36px_rgba(30,95,191,0.18)] p-3.5 z-40 animate-fadeIn text-xs text-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-[#E1EEF9] mb-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  activePopoverStage.status === "completed"
                    ? "bg-emerald-500"
                    : activePopoverStage.status === "current"
                    ? "bg-[#1E5FBF] animate-ping"
                    : "bg-slate-300"
                }`}
              />
              <span className="font-bold text-[#0B2545] text-xs">
                Stage {stages.findIndex((s) => s.id === activePopoverStage.id) + 1}:{" "}
                {activePopoverStage.title}
              </span>
            </div>
            <button
              onClick={() => setActivePopoverStage(null)}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px] leading-relaxed text-slate-600">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="font-medium">Timestamp:</span>
              <span className="font-mono text-[#0B2545] font-semibold">
                {activePopoverStage.timestamp}
              </span>
            </div>
            {activePopoverStage.agency && (
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-medium">Authority:</span>
                <span className="text-slate-700 font-medium">
                  {activePopoverStage.agency}
                </span>
              </div>
            )}
            <p className="mt-1.5 p-2 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-slate-700">
              {activePopoverStage.details}
            </p>
            {onAdvanceStage && activePopoverStage.status === "current" && (
              <button
                type="button"
                onClick={() => {
                  onAdvanceStage(activePopoverStage.id);
                  setActivePopoverStage(null);
                }}
                className="w-full mt-2 py-1.5 px-3 bg-[#1E5FBF] hover:bg-[#184E9F] text-white text-[11px] font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Stage Verified &amp; Advance</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
