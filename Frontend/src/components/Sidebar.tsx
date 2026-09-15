import React, { useRef, useState } from "react";
import {
  Upload,
  Play,
  Wind,
  Compass,
  Activity,
  Sliders,
} from "lucide-react";
import {
  SpillDetectionResponse,
  DriftSimulationResponse,
  EnvironmentalTelemetry,
} from "../types";

interface SidebarProps {
  spillData: SpillDetectionResponse | null;
  driftData: DriftSimulationResponse | null;
  weatherData: EnvironmentalTelemetry | null;
  timelineHours: number;
  onTimelineChange: (hours: number) => void;
  onFileUpload: (file: File) => void;
  onLoadSample: () => void;
  isLoading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  spillData,
  driftData,
  weatherData,
  timelineHours,
  onTimelineChange,
  onFileUpload,
  onLoadSample,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const timePresets = [
    { label: "-24h Origin", value: -24 },
    { label: "-12h", value: -12 },
    { label: "-6h", value: -6 },
    { label: "T-0 Detect", value: 0 },
    { label: "+12h", value: 12 },
    { label: "+24h", value: 24 },
    { label: "+48h Impact", value: 48 },
  ];

  return (
    <aside className="w-[380px] shrink-0 h-full overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4 space-y-4 select-none">
      {/* SECTION 1: INGESTION & DATA SOURCE */}
      <div className="rounded border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center space-x-2">
            <Upload className="h-4 w-4 text-zinc-300" />
            <h2 className="text-xs font-mono font-semibold tracking-wider text-zinc-200 uppercase">
              SAR Image Ingestion
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
            GEOTIFF / GRD
          </span>
        </div>

        {/* Drag and drop upload zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-3.5 rounded border border-dashed cursor-pointer transition-all ${
            dragActive
              ? "border-zinc-400 bg-zinc-800/60"
              : "border-zinc-700 hover:border-zinc-500 bg-zinc-950/60 hover:bg-zinc-900/60"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".tif,.tiff,.geotiff,.nc"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="h-4 w-4 text-zinc-400 mb-1" />
          <p className="text-xs font-medium text-zinc-300 font-mono">
            Drop Sentinel-1 GeoTIFF here
          </p>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
            Preserves affine transform &amp; WGS84 CRS
          </p>
        </div>

        {/* Load bundled sample button */}
        <button
          onClick={onLoadSample}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 rounded border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 px-3 text-xs font-mono font-medium transition active:scale-[0.98] disabled:opacity-50 touch-target"
        >
          <Play className="h-3.5 w-3.5 text-zinc-300 fill-zinc-300" />
          <span>LOAD INCIDENT SAMPLE (MUMBAI HIGH)</span>
        </button>
      </div>

      {/* SECTION 2: SPILL DNA METRICS */}
      {spillData && spillData.summary && (
        <div className="rounded border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-red-400" />
              <h2 className="text-xs font-mono font-semibold tracking-wider text-zinc-200 uppercase">
                SAR Radar Telemetry
              </h2>
            </div>
            <span className="text-[10px] font-mono text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/60">
              {spillData.summary.total_slicks} POLIES
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Total Area */}
            <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase">
                Observed Area
              </span>
              <div className="text-sm font-bold text-red-400 mt-0.5">
                {spillData.summary.total_area_km2.toFixed(2)}{" "}
                <span className="text-[10px] text-zinc-400 font-normal">
                  km²
                </span>
              </div>
            </div>

            {/* Estimated Volume */}
            <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase">
                Est. Crude Volume
              </span>
              <div className="text-sm font-bold text-amber-400 mt-0.5">
                {spillData.summary.estimated_volume_m3.toLocaleString()}{" "}
                <span className="text-[10px] text-zinc-400 font-normal">
                  m³
                </span>
              </div>
            </div>

            {/* Centroid Coordinates */}
            <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80 col-span-2">
              <span className="text-[10px] text-zinc-400 uppercase">
                Centroid (WGS-84 Lat/Lon)
              </span>
              <div className="text-xs font-bold text-zinc-200 mt-0.5">
                {spillData.summary.primary_centroid[0].toFixed(4)}°N,{" "}
                {spillData.summary.primary_centroid[1].toFixed(4)}°E
              </div>
            </div>

            {/* Perimeter */}
            <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase">
                Perimeter
              </span>
              <div className="text-xs font-semibold text-zinc-200 mt-0.5">
                {spillData.summary.total_perimeter_km.toFixed(1)} km
              </div>
            </div>

            {/* Sensor */}
            <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase">
                Radar Sensor
              </span>
              <div className="text-xs font-semibold text-zinc-300 mt-0.5 truncate">
                {spillData.summary.polarization}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: ENVIRONMENTAL DRIFT VECTORS */}
      <div className="rounded border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center space-x-2">
            <Wind className="h-4 w-4 text-zinc-300" />
            <h2 className="text-xs font-mono font-semibold tracking-wider text-zinc-200 uppercase">
              Environmental Vectors
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
            OPEN-METEO
          </span>
        </div>

        {weatherData ? (
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* 10m Surface Wind */}
            <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>10m SURFACE WIND</span>
                <Wind className="w-3 h-3 text-zinc-400" />
              </div>
              <div className="text-xs font-bold text-zinc-100 mt-1">
                {weatherData.wind_speed_ms.toFixed(1)} m/s
                <span className="text-[10px] text-zinc-400 font-normal ml-1">
                  ({(weatherData.wind_speed_ms * 1.94384).toFixed(1)} kts)
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                From {weatherData.wind_direction_deg}°
              </div>
            </div>

            {/* Surface Current */}
            <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>OCEAN CURRENT</span>
                <Compass className="w-3 h-3 text-zinc-400" />
              </div>
              <div className="text-xs font-bold text-zinc-100 mt-1">
                {weatherData.current_speed_ms.toFixed(2)} m/s
                <span className="text-[10px] text-zinc-400 font-normal ml-1">
                  ({(weatherData.current_speed_ms * 1.94384).toFixed(1)} kts)
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Towards {weatherData.current_direction_deg}°
              </div>
            </div>

            {/* Waves & Temp */}
            <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400">WAVE HEIGHT</span>
              <div className="text-xs font-semibold text-zinc-200 mt-0.5">
                {weatherData.wave_height_m.toFixed(1)} m
              </div>
            </div>

            <div className="rounded bg-zinc-950 p-2 border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400">SEA TEMP</span>
              <div className="text-xs font-semibold text-zinc-200 mt-0.5">
                {weatherData.temperature_c.toFixed(1)} °C
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-zinc-500 font-mono py-2 text-center">
            Awaiting coordinate fix...
          </div>
        )}

        {/* Drift Equation Notice */}
        <div className="rounded bg-zinc-950/80 p-2 border border-zinc-800 text-[10px] font-mono text-zinc-400">
          <span className="text-zinc-200 font-semibold">HYDRODYNAMICS:</span>{" "}
          V_drift = V_current + 0.035 × V_wind
        </div>
      </div>

      {/* SECTION 4: TEMPORAL DRIFT SCRUBBER */}
      <div className="rounded border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-mono font-semibold tracking-wider text-zinc-200 uppercase">
              Temporal Scrubber
            </h2>
          </div>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              timelineHours < 0
                ? "text-amber-400 bg-amber-950/40 border-amber-900/60"
                : timelineHours === 0
                ? "text-zinc-200 bg-zinc-800 border-zinc-700"
                : "text-blue-400 bg-blue-950/40 border-blue-900/60"
            }`}
          >
            {timelineHours < 0
              ? `HINDCAST (${timelineHours}h)`
              : timelineHours === 0
              ? "T-0 DETECTION"
              : `FORECAST (+${timelineHours}h)`}
          </span>
        </div>

        {/* Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
            <span className="text-amber-400">-24h Origin</span>
            <span className="text-zinc-200 font-bold">
              {timelineHours > 0 ? `+${timelineHours}h` : `${timelineHours}h`}
            </span>
            <span className="text-blue-400">+48h Impact</span>
          </div>
          <input
            type="range"
            min={-24}
            max={48}
            step={1}
            value={timelineHours}
            onChange={(e) => onTimelineChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-zinc-200 touch-target"
          />
        </div>

        {/* Quick jump presets */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {timePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onTimelineChange(preset.value)}
              className={`text-[10px] font-mono py-1.5 px-1 rounded border transition touch-target ${
                timelineHours === preset.value
                  ? "bg-zinc-800 border-zinc-500 text-zinc-100 font-semibold"
                  : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Weathering progression */}
        {driftData && driftData.steps && driftData.steps.length > 0 && (
          <div className="rounded bg-zinc-950 p-2.5 border border-zinc-800/80 space-y-1 text-[11px] font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Evaporation Rate:</span>
              <span className="text-zinc-200 font-semibold">
                {driftData.steps[driftData.steps.length - 1].evaporated_percentage}%
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Emulsification Water:</span>
              <span className="text-zinc-200 font-semibold">
                {driftData.steps[driftData.steps.length - 1].water_emulsification_percentage}%
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Origin Uncertainty:</span>
              <span className="text-amber-400 font-semibold">
                ±{driftData.steps[driftData.steps.length - 1].uncertainty_radius_km.toFixed(1)} km
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
