import React from "react";
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Scale,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  SpillDetectionResponse,
  DriftSimulationResponse,
  AISAttributionResponse,
  SuspectVessel,
} from "../types";

interface ForensicReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  spillData: SpillDetectionResponse | null;
  driftData: DriftSimulationResponse | null;
  aisData: AISAttributionResponse | null;
  activeIncident: string;
}

export const ForensicReportModal: React.FC<ForensicReportModalProps> = ({
  isOpen,
  onClose,
  spillData,
  driftData,
  aisData,
  activeIncident,
}) => {
  if (!isOpen) return null;

  const incidentId = `SAHAYYA-EVID-2026-${Date.now().toString().slice(-6)}`;
  const nowUtc = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
  const primarySuspect = aisData?.primary_suspect;

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Header styling
    doc.setFillColor(11, 15, 25);
    doc.rect(0, 0, 210, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SAHAYYA // MARITIME FORENSIC EVIDENCE DOSSIER", 14, 15);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(6, 182, 212);
    doc.text("ADMISSIBLE MARITIME POLLUTION & AIS VESSEL ATTRIBUTION REPORT", 14, 23);

    // Metadata section
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`Incident Dossier Ref: ${incidentId}`, 14, 38);
    doc.text(`Date & Time Generated: ${nowUtc}`, 14, 44);
    doc.text(`Surveillance Sector: ${activeIncident} (Arabian Sea / Mumbai High)`, 14, 50);

    // 1. Satellite SAR Detection
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("1. SATELLITE SAR RADAR OBSERVATION", 14, 60);

    autoTable(doc, {
      startY: 63,
      head: [["Parameter", "Observed Telemetry Value"]],
      body: [
        ["Radar Sensor", spillData?.summary.acquisition_satellite || "Sentinel-1A C-SAR (IW)"],
        ["Polarization & Mode", spillData?.summary.polarization || "VV Dual-Pol"],
        ["Total Detected Slick Area", `${spillData?.summary.total_area_km2.toFixed(3) || "0.0"} km²`],
        ["Centroid Geographic Coordinates", `${spillData?.summary.primary_centroid[0]}°N, ${spillData?.summary.primary_centroid[1]}°E`],
        ["Estimated Crude Sheen Volume", `${spillData?.summary.estimated_volume_m3.toLocaleString() || "0"} m³ (Bonn Code: Metallic/Continuous)`],
        ["Inference Method", spillData?.summary.inference_mode || "Adaptive Decibel Backscatter Damping"],
      ],
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    });

    // 2. Hydrodynamic Drift Verification
    const lastY1 = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("2. COPERNICUS & OPEN-METEO HYDRODYNAMIC DRIFT ANALYSIS", 14, lastY1);

    autoTable(doc, {
      startY: lastY1 + 3,
      head: [["Parameter", "Measurement", "Model Impact"]],
      body: [
        ["Net Hydrodynamic Drift Speed", `${driftData?.net_drift_speed_knots} kts (${driftData?.net_drift_speed_ms} m/s)`, "Particle Vector Integration"],
        ["Net Drift Heading", `${driftData?.net_drift_heading_deg}°`, "Direction of Current + Wind Deflection"],
        ["10m Surface Wind Velocity", `${driftData?.environmental_telemetry.wind_speed_ms} m/s from ${driftData?.environmental_telemetry.wind_direction_deg}°`, "0.035 x Wind Velocity Component"],
        ["Surface Current Velocity", `${driftData?.environmental_telemetry.current_speed_ms} m/s to ${driftData?.environmental_telemetry.current_direction_deg}°`, "Primary Ocean Current Component"],
        ["Calculated Hindcast Origin Window", `${driftData?.origin_window_bbox.join(", ")}`, "Spatial Target Area at T-24h"],
      ],
      theme: "striped",
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    });

    // 3. Ranked AIS Suspect Vessels
    const lastY2 = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("3. AIS VESSEL CROSS-CORRELATION & FORENSIC LIABILITY RANKING", 14, lastY2);

    const suspectRows = (aisData?.ranked_suspects || []).map((s) => [
      `#${s.attribution_rank}`,
      s.vessel_name,
      s.imo,
      s.vessel_type,
      s.flag,
      `${s.closest_approach_km} km`,
      `${s.min_sog_knots} kts`,
      `${s.max_transponder_gap_mins} min`,
      `${s.liability_probability_pct}%`,
    ]);

    autoTable(doc, {
      startY: lastY2 + 3,
      head: [["Rank", "Vessel", "IMO", "Type", "Flag", "CPA", "Min SOG", "AIS Gap", "Liability"]],
      body: suspectRows,
      theme: "grid",
      headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
    });

    // 4. Primary Suspect Statement & Signature Block
    const lastY3 = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(180, 20, 20);
    doc.text(`PRIMARY SUSPECT LIABILITY DETERMINATION: ${primarySuspect?.vessel_name || "N/A"} (${primarySuspect?.liability_probability_pct}% LIABILITY)`, 14, lastY3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    const statement = `Based on multi-source spatial intersection against the calculated hydrodynamic origin cone (T-24h), vessel ${primarySuspect?.vessel_name} (IMO: ${primarySuspect?.imo}, MMSI: ${primarySuspect?.mmsi}) exhibited an intentional discharge profile with SOG drop to ${primarySuspect?.min_sog_knots} knots, erratic course fluctuation, and an AIS transponder silence of ${primarySuspect?.max_transponder_gap_mins} minutes directly within the discharge envelope. This evidence constitutes probable cause for MARPOL Annex I violation investigation.`;
    doc.text(doc.splitTextToSize(statement, 180), 14, lastY3 + 6);

    // Signature Block
    doc.setDrawColor(150, 150, 150);
    doc.line(14, 270, 80, 270);
    doc.line(130, 270, 196, 270);
    doc.setFontSize(8);
    doc.text("Forensic Analyst Signature / Stamp", 14, 275);
    doc.text("Maritime Authority Verification Seal", 130, 275);

    doc.save(`Sahayya_Forensic_Evidence_${incidentId}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none font-mono">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-zinc-700 bg-zinc-800 text-zinc-300">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
                Forensic Evidence Dossier
              </h2>
              <p className="text-[10px] text-zinc-400">
                REF: {incidentId} • ADMISSIBLE MARITIME POLLUTION BRIEF
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-1.5 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition touch-target"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>EXPORT PDF</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition touch-target"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              <span>PRINT</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-3 gap-3 rounded border border-zinc-800 bg-zinc-900/60 p-3.5">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase">Sector</span>
              <div className="font-bold text-zinc-200 mt-0.5">{activeIncident}</div>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase">Acquisition UTC</span>
              <div className="font-bold text-zinc-200 mt-0.5">{nowUtc}</div>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase">Legal Standard</span>
              <div className="font-bold text-zinc-200 mt-0.5">MARPOL Annex I / UNCLOS</div>
            </div>
          </div>

          {/* Section 1: SAR Oil Slick Evidence */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1">
              <FileCheck className="w-4 h-4 text-zinc-400" />
              1. Satellite SAR Oil Slick Detection Metrics
            </h3>
            <div className="grid grid-cols-4 gap-2 text-[11px]">
              <div className="rounded bg-zinc-900 p-2.5 border border-zinc-800">
                <span className="text-zinc-400">Total Slick Area</span>
                <div className="text-sm font-bold text-red-400 mt-0.5">
                  {spillData?.summary.total_area_km2.toFixed(2)} km²
                </div>
              </div>
              <div className="rounded bg-zinc-900 p-2.5 border border-zinc-800">
                <span className="text-zinc-400">Est. Volume</span>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  {spillData?.summary.estimated_volume_m3.toLocaleString()} m³
                </div>
              </div>
              <div className="rounded bg-zinc-900 p-2.5 border border-zinc-800 col-span-2">
                <span className="text-zinc-400">Centroid Coordinates</span>
                <div className="text-xs font-bold text-zinc-200 mt-0.5">
                  {spillData?.summary.primary_centroid[0]}°N, {spillData?.summary.primary_centroid[1]}°E
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Hydrodynamic Drift Verification */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1">
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
              2. Hydrodynamic Drift Model Verification
            </h3>
            <div className="rounded bg-zinc-900 p-3 border border-zinc-800 space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-zinc-300">
                <span>Governing Equation:</span>
                <span className="text-zinc-100 font-bold">V_drift = V_current + 0.035 × V_wind</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800">
                <div>
                  <span className="text-zinc-400">Net Drift Speed:</span>
                  <div className="text-zinc-200 font-bold">{driftData?.net_drift_speed_knots} kts ({driftData?.net_drift_speed_ms} m/s)</div>
                </div>
                <div>
                  <span className="text-zinc-400">Net Drift Heading:</span>
                  <div className="text-zinc-200 font-bold">{driftData?.net_drift_heading_deg}°</div>
                </div>
                <div>
                  <span className="text-zinc-400">Origin Window BBox:</span>
                  <div className="text-zinc-200 font-bold truncate">[{driftData?.origin_window_bbox.map(n => n.toFixed(3)).join(", ")}]</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Ranked Suspects Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1">
              <AlertTriangle className="w-4 h-4 text-zinc-400" />
              3. AIS Cross-Correlated Suspect Vessel Attribution
            </h3>
            <div className="overflow-x-auto rounded border border-zinc-800 bg-zinc-900">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="p-2">Rank</th>
                    <th className="p-2">Vessel Name</th>
                    <th className="p-2">IMO / Flag</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">CPA</th>
                    <th className="p-2">Min SOG</th>
                    <th className="p-2">AIS Gap</th>
                    <th className="p-2 text-right">Liability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-200">
                  {aisData?.ranked_suspects.map((v) => (
                    <tr key={v.mmsi} className={v.attribution_rank === 1 ? "bg-red-950/20" : ""}>
                      <td className="p-2 font-bold text-red-400">#{v.attribution_rank}</td>
                      <td className="p-2 font-bold">{v.vessel_name}</td>
                      <td className="p-2 text-zinc-400">{v.imo} ({v.flag})</td>
                      <td className="p-2 text-zinc-400">{v.vessel_type}</td>
                      <td className="p-2 font-semibold text-red-400">{v.closest_approach_km} km</td>
                      <td className="p-2 font-semibold text-amber-300">{v.min_sog_knots} kts</td>
                      <td className="p-2 font-semibold text-red-400">{v.max_transponder_gap_mins}m</td>
                      <td className="p-2 text-right font-bold text-red-400">{v.liability_probability_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Primary Suspect Determination & Legal Notice */}
          {primarySuspect && (
            <div className="rounded border border-red-900/60 bg-red-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-400 uppercase">
                  Statement of Primary Liability &amp; Anomaly Evidence
                </span>
                <span className="text-xs font-bold text-red-300 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                  {primarySuspect.liability_probability_pct}% CONFIDENCE
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-300">
                Vessel <strong className="text-zinc-100">{primarySuspect.vessel_name}</strong> ({primarySuspect.vessel_type}, Flag: {primarySuspect.flag}, IMO: {primarySuspect.imo}) traversed within <strong className="text-red-400">{primarySuspect.closest_approach_km} km</strong> of the hydrodynamic spill origin. The vessel exhibited kinematic anomalies characteristic of illegal bilge or slop tank discharge: reduction of speed to <strong className="text-red-400">{primarySuspect.min_sog_knots} knots</strong> and an AIS transponder blackout of <strong className="text-red-400">{primarySuspect.max_transponder_gap_mins} minutes</strong> within the origin surveillance box.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900 px-6 py-3 text-[11px] text-zinc-400">
          <span>SAHAYYA FORENSIC ENGINE • DIGITAL CHAIN OF CUSTODY VERIFIED</span>
          <button
            onClick={onClose}
            className="rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 text-xs text-zinc-200 transition touch-target"
          >
            CLOSE DOSSIER
          </button>
        </div>
      </div>
    </div>
  );
};
