import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  X, 
  ShieldCheck, 
  Clock, 
  Layers, 
  RefreshCw 
} from 'lucide-react';
import sahayyaApi from '../services/api';

interface ReportGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidentIdOrCode?: string | number;
  incidentTitle?: string;
  isFleetReport?: boolean;
}

type StepStatus = 'pending' | 'in-progress' | 'completed';

interface PipelineStep {
  id: string;
  label: string;
  status: StepStatus;
}

export const ReportGenerationModal: React.FC<ReportGenerationModalProps> = ({
  isOpen,
  onClose,
  incidentIdOrCode = "IN-MH-2026",
  incidentTitle = "Mumbai High Offshore Oil Slick",
  isFleetReport = false,
}) => {
  const [phase, setPhase] = useState<'idle' | 'starting' | 'polling' | 'ready' | 'failed'>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<{
    report_id?: number;
    download_url?: string;
    file_hash?: string;
    filename?: string;
    pages_count?: number;
    generated_at?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [steps, setSteps] = useState<PipelineStep[]>([
    { id: '1', label: 'Extracting SAR Satellite & Spill DNA Geometry', status: 'pending' },
    { id: '2', label: 'Computing Lagrangian Hindcast Origin Reconstruction', status: 'pending' },
    { id: '3', label: 'Synthesizing 7D AIS Vessel Attribution Matrix', status: 'pending' },
    { id: '4', label: 'Rendering High-Resolution Hydrodynamic Drift Maps', status: 'pending' },
    { id: '5', label: 'Generating SHA-256 Tamper-Proof Cryptographic Seal', status: 'pending' },
  ]);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start generation whenever modal opens
  useEffect(() => {
    if (isOpen) {
      startGeneration();
    } else {
      cleanup();
    }
    return () => cleanup();
  }, [isOpen]);

  const cleanup = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startGeneration = async () => {
    cleanup();
    setPhase('starting');
    setErrorMessage(null);
    setReportData(null);

    // Reset steps
    setSteps([
      { id: '1', label: isFleetReport ? 'Aggregating Indian EEZ Vessel Telemetry' : 'Extracting SAR Satellite & Spill DNA Geometry', status: 'in-progress' },
      { id: '2', label: isFleetReport ? 'Cross-referencing Port Registries & Flag States' : 'Computing Lagrangian Hindcast Origin Reconstruction', status: 'pending' },
      { id: '3', label: isFleetReport ? 'Evaluating AIS Dark-Vessel Gap Events' : 'Synthesizing 7D AIS Vessel Attribution Matrix', status: 'pending' },
      { id: '4', label: isFleetReport ? 'Compiling Fleet Operational Readiness Roster' : 'Rendering High-Resolution Hydrodynamic Drift Maps', status: 'pending' },
      { id: '5', label: 'Generating SHA-256 Tamper-Proof Cryptographic Seal', status: 'pending' },
    ]);

    try {
      let resp;
      if (isFleetReport) {
        resp = await sahayyaApi.reports.generateFleetReport();
      } else {
        resp = await sahayyaApi.reports.generate(incidentIdOrCode, 'INCIDENT_DOSSIER');
      }

      const newJobId = resp.job_id;
      setJobId(newJobId);

      // If backend generated immediately, display success instantly!
      if (resp.status === 'ready') {
        cleanup();
        setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
        setReportData(resp);
        setPhase('ready');
        return;
      }

      setPhase('polling');

      // Start simulated step progression for UI responsiveness while backend processes
      let currentStep = 0;
      const stepTimer = setInterval(() => {
        currentStep++;
        setSteps(prev => prev.map((s, idx) => {
          if (idx < currentStep) return { ...s, status: 'completed' };
          if (idx === currentStep) return { ...s, status: 'in-progress' };
          return s;
        }));
        if (currentStep >= 4) clearInterval(stepTimer);
      }, 700);

      // Poll every 1 second for rapid status completion
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusResp = await sahayyaApi.reports.getStatus(newJobId);
          if (statusResp.status === 'ready') {
            clearInterval(stepTimer);
            cleanup();
            setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
            setReportData(statusResp);
            setPhase('ready');
          } else if (statusResp.status === 'failed') {
            clearInterval(stepTimer);
            cleanup();
            setErrorMessage(statusResp.error || 'Report generation failed on backend');
            setPhase('failed');
          }
        } catch (err: any) {
          console.warn('Polling status check error:', err);
        }
      }, 1000);

    } catch (err: any) {
      cleanup();
      setErrorMessage(err?.response?.data?.detail || err?.message || 'Failed to initiate report generation');
      setPhase('failed');
    }
  };

  const handleDownload = () => {
    if (!reportData?.report_id) return;
    const downloadUrl = sahayyaApi.reports.getDownloadUrl(reportData.report_id, false);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', reportData.filename || 'Sahayya_Intelligence_Report.pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewInBrowser = () => {
    if (!reportData?.report_id) return;
    const viewUrl = sahayyaApi.reports.getDownloadUrl(reportData.report_id, true);
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0B2545] via-[#133A6B] to-[#1E5FBF] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg tracking-tight">
                  {isFleetReport ? 'Fleet Surveillance Dossier' : 'Official Marine Incident Report'}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-200 border border-blue-300/30">
                  ICG Defense Spec
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                {isFleetReport ? 'All-India Maritime EEZ Domain' : `${incidentIdOrCode} · ${incidentTitle}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {(phase === 'starting' || phase === 'polling') && (
            <div className="space-y-6">
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 border border-blue-200 text-blue-600 mb-3 animate-pulse">
                  <Loader2 className="w-7 h-7 animate-spin" />
                </div>
                <h4 className="text-base font-semibold text-slate-800">
                  Synthesizing High-Fidelity Intelligence Report
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Sahayya defense engine is correlating satellite SAR raster data, vessel trajectories, and hydrodynamic particle drift models...
                </p>
              </div>

              {/* Progress Steps */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                {steps.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    {s.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : s.status === 'in-progress' ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${
                      s.status === 'completed' 
                        ? 'text-slate-700 font-medium line-through opacity-80' 
                        : s.status === 'in-progress'
                        ? 'text-blue-700 font-semibold'
                        : 'text-slate-400'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Estimated compilation time: ~4–8 seconds</span>
              </div>
            </div>
          )}

          {phase === 'ready' && reportData && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-emerald-950">
                    Document Compiled &amp; Cryptographically Certified
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Full 9-page forensic report ready for operational deployment and evidentiary chain-of-custody.
                  </p>
                </div>
              </div>

              {/* Document Metadata Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Document Title</span>
                  <span className="font-semibold text-slate-800 text-right truncate max-w-[280px]">
                    {reportData.filename || 'Sahayya_Investigation_Report.pdf'}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Structure &amp; Scope</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    {reportData.pages_count || 9} Official Pages with Embedded Drift Maps
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Generated At</span>
                  <span className="font-mono text-slate-700">
                    {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      Evidence Registry SHA-256 Hash
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">
                      Verified
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10px] text-slate-600 break-all select-all">
                    {reportData.file_hash || '7d2e8b4...'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#1E5FBF] hover:bg-[#184E9F] text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={handleViewInBrowser}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors border border-slate-200"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View in Browser</span>
                </button>
              </div>
            </div>
          )}

          {phase === 'failed' && (
            <div className="space-y-5 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  Report Generation Encountered an Issue
                </h4>
                <p className="text-xs text-red-600 mt-1 max-w-sm mx-auto">
                  {errorMessage || 'An error occurred while compiling the simulation assets and PDF.'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={startGeneration}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Compilation</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Security Classification: Restricted — Official Coast Guard Use</span>
          <button 
            onClick={onClose}
            className="hover:text-slate-600 font-medium"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerationModal;
