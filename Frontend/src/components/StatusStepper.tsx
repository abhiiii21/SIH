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
                <div className="mt-1.5 text-center min-w-[76px] sm:min-w-[96px] font-body">
                  <div
                    className={`text-xs font-bold leading-tight ${
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
                    className={`text-[11px] font-medium leading-tight mt-0.5 ${
                      isCurrent
                        ? "text-amber-600 font-semibold"
                        : isCompleted
                        ? "text-emerald-700 font-medium"
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
        <div className="absolute top-full left-4 right-4 sm:left-auto sm:right-4 mt-2 sm:w-[420px] bg-white border border-[#E1EEF9] rounded-2xl shadow-[0_16px_40px_rgba(30,95,191,0.18)] p-4 sm:p-5 z-40 animate-fadeIn text-slate-800 font-body">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E1EEF9] mb-3">
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
              <span className="font-display font-bold text-[#0B2545] text-sm sm:text-base">
                Stage {stages.findIndex((s) => s.id === activePopoverStage.id) + 1}:{" "}
                {activePopoverStage.title}
              </span>
            </div>
            <button
              onClick={() => setActivePopoverStage(null)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 font-body">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium">Timestamp:</span>
              <span className="font-mono text-[#0B2545] font-semibold text-xs">
                {activePopoverStage.timestamp}
              </span>
            </div>
            {activePopoverStage.agency && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">Authority:</span>
                <span className="text-slate-700 font-semibold text-xs">
                  {activePopoverStage.agency}
                </span>
              </div>
            )}
            <p className="body-description mt-2.5 p-3.5 rounded-xl bg-[#F8FBFE] border border-[#E1EEF9] text-slate-700 text-sm sm:text-[14.5px] leading-relaxed font-body">
              {activePopoverStage.details}
            </p>
            {onAdvanceStage && activePopoverStage.status === "current" && (
              <button
                type="button"
                onClick={() => {
                  onAdvanceStage(activePopoverStage.id);
                  setActivePopoverStage(null);
                }}
                className="w-full mt-3 py-2 px-3.5 bg-[#1E5FBF] hover:bg-[#184E9F] text-white text-xs sm:text-sm font-semibold font-body rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Stage Verified &amp; Advance</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
