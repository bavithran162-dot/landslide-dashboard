import { useState, useEffect } from "react";

// ─── Mock Data ───────────────────────────────────────────────────────────────
const SENSOR_NODES = [
  { id: "N001", location: "Nilgiris - Zone A", lat: 11.408, lng: 76.695, status: "critical", threat: 92, lastSync: "2 min ago" },
  { id: "N002", location: "Kodaikanal - Zone B", lat: 10.239, lng: 77.489, status: "warning", threat: 67, lastSync: "5 min ago" },
  { id: "N003", location: "Munnar - Zone C", lat: 10.089, lng: 77.059, status: "safe", threat: 24, lastSync: "1 min ago" },
  { id: "N004", location: "Coorg - Zone D", lat: 12.338, lng: 75.808, status: "safe", threat: 18, lastSync: "3 min ago" },
  { id: "N005", location: "Wayanad - Zone E", lat: 11.686, lng: 76.132, status: "warning", threat: 58, lastSync: "7 min ago" },
];

const generateTimeSeries = (base, variance, count = 24) =>
  Array.from({ length: count }, (_, i) => ({
    label: `${String(i).padStart(2, "0")}:00`,
    value: Math.max(0, Math.min(100, base + (Math.random() - 0.5) * variance)),
  }));

const SENSOR_TYPES = ["GPS Displacement", "Pressure", "Soil Temperature", "Moisture", "Rainfall", "Tilt Angle"];

const SENSOR_DATA = {
  "GPS Displacement": { unit: "mm", threshold: 15, current: 18.4, series: generateTimeSeries(12, 20) },
  "Pressure": { unit: "kPa", threshold: 120, current: 134.2, series: generateTimeSeries(80, 30) },
  "Soil Temperature": { unit: "°C", threshold: 35, current: 28.6, series: generateTimeSeries(25, 10) },
  "Moisture": { unit: "%", threshold: 75, current: 82.1, series: generateTimeSeries(60, 25) },
  "Rainfall": { unit: "mm/hr", threshold: 50, current: 62.3, series: generateTimeSeries(30, 40) },
  "Tilt Angle": { unit: "°", threshold: 8, current: 9.7, series: generateTimeSeries(4, 8) },
};

const ALERTS = [
  { id: 1, time: "09:14", zone: "Nilgiris - Zone A", type: "critical", msg: "GPS displacement exceeded 15mm threshold. Immediate evacuation recommended.", sensor: "GPS Displacement" },
  { id: 2, time: "08:52", zone: "Nilgiris - Zone A", type: "critical", msg: "Rainfall rate 62.3 mm/hr — 24% above critical threshold.", sensor: "Rainfall" },
  { id: 3, time: "07:30", zone: "Wayanad - Zone E", type: "warning", msg: "Moisture content rising rapidly. Monitor closely.", sensor: "Moisture" },
  { id: 4, time: "06:15", zone: "Kodaikanal - Zone B", type: "warning", msg: "Tilt sensor reading elevated at 6.2°. Approaching threshold.", sensor: "Tilt Angle" },
  { id: 5, time: "Yesterday", zone: "Munnar - Zone C", type: "info", msg: "Sensor health check complete. All systems nominal.", sensor: "System" },
];

const CUSTOMERS = [
  { id: "C001", name: "Tamil Nadu DRF", type: "Government", zones: ["N001", "N002"], status: "active", license: "GOV-2024-TN-001", expires: "2026-03-31" },
  { id: "C002", name: "Kerala Forest Dept", type: "Government", zones: ["N003", "N005"], status: "active", license: "GOV-2024-KL-014", expires: "2025-12-31" },
  { id: "C003", name: "Ramesh P. (Private)", type: "Individual", zones: ["N002"], status: "active", license: "IND-2024-0392", expires: "2025-09-30" },
];

const THREAT_FORECAST = [
  { day: "Today", level: "critical", label: "HIGH RISK", pct: 88 },
  { day: "Tomorrow", level: "critical", label: "HIGH RISK", pct: 76 },
  { day: "Day 3", level: "warning", label: "MODERATE", pct: 54 },
  { day: "Day 4", level: "warning", label: "MODERATE", pct: 42 },
  { day: "Day 5", level: "safe", label: "LOW RISK", pct: 28 },
  { day: "Day 6", level: "safe", label: "LOW RISK", pct: 18 },
  { day: "Day 7", level: "safe", label: "NO THREAT", pct: 12 },
];

const SERVICE_HEALTH = [
  { node: "N001", battery: 62, signal: 91, uptime: "99.1%", lastCalibration: "12 days ago", nextService: "18 days", issues: 1 },
  { node: "N002", battery: 88, signal: 85, uptime: "99.7%", lastCalibration: "5 days ago", nextService: "25 days", issues: 0 },
  { node: "N003", battery: 43, signal: 78, uptime: "98.2%", lastCalibration: "20 days ago", nextService: "10 days", issues: 2 },
  { node: "N004", battery: 95, signal: 94, uptime: "100%", lastCalibration: "3 days ago", nextService: "27 days", issues: 0 },
  { node: "N005", battery: 71, signal: 68, uptime: "97.8%", lastCalibration: "15 days ago", nextService: "15 days", issues: 1 },
];

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  critical: "#e24b4a", criticalBg: "#fcebeb", criticalBorder: "#f09595",
  warning: "#ba7517", warningBg: "#faeeda", warningBorder: "#fac775",
  safe: "#3b6d11", safeBg: "#eaf3de", safeBorder: "#97c459",
  info: "#185fa5", infoBg: "#e6f1fb", infoBorder: "#85b7eb",
  accent: "#185fa5",
};

const statusColor  = (s) => ({ critical: C.critical, warning: C.warning, safe: C.safe, info: C.info }[s] || C.info);
const statusBg     = (s) => ({ critical: C.criticalBg, warning: C.warningBg, safe: C.safeBg, info: C.infoBg }[s] || C.infoBg);
const statusBorder = (s) => ({ critical: C.criticalBorder, warning: C.warningBorder, safe: C.safeBorder, info: C.infoBorder }[s] || C.infoBorder);

const MOISTURE_THRESHOLD = 75;
const RAINFALL_THRESHOLD = 50;

function getInspectionAlerts(history) {
  const zones = [...new Set(history.map((day) => day.zone))];
  const alerts = [];

  zones.forEach((zone) => {
    const days = history
      .filter((day) => day.zone === zone)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 2);

    if (days.length !== 2) return;

    const latestDate = new Date(`${days[0].date}T00:00:00Z`);
    const previousDate = new Date(`${days[1].date}T00:00:00Z`);

    const difference =
      (latestDate.getTime() - previousDate.getTime()) / 86400000;

    if (difference !== 1) return;

    const [latest, previous] = days;

    if (
      latest.moisture > MOISTURE_THRESHOLD &&
      previous.moisture > MOISTURE_THRESHOLD
    ) {
      alerts.push({
        id: `${zone}-moisture`,
        zone,
        sensor: "Soil Moisture",
        value: latest.moisture,
        threshold: MOISTURE_THRESHOLD,
        unit: "%",
        message:
          "Soil moisture exceeded its threshold for two consecutive days.",
      });
    }

    if (
      latest.rainfall > RAINFALL_THRESHOLD &&
      previous.rainfall > RAINFALL_THRESHOLD
    ) {
      alerts.push({
        id: `${zone}-rainfall`,
        zone,
        sensor: "Rainfall",
        value: latest.rainfall,
        threshold: RAINFALL_THRESHOLD,
        unit: "mm/hr",
        message:
          "Rainfall exceeded its threshold for two consecutive days.",
      });
    }
  });

  return alerts;
}

const INSPECTION_ALERTS = getInspectionAlerts(DAILY_SENSOR_HISTORY);


// ─── Shared Sub-components ────────────────────────────────────────────────────
function MiniBar({ series, threshold, color }) {
  const max = Math.max(...series.map((s) => s.value), threshold * 1.2);
  const w = 360, h = 80, barW = Math.floor((w - series.length) / series.length);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 80 }}>
      {series.map((s, i) => {
        const barH = Math.round((s.value / max) * (h - 12));
        const over = s.value > threshold;
        return <rect key={i} x={i * (barW + 1)} y={h - barH - 4} width={barW} height={barH} rx="2" fill={over ? C.critical : color} opacity={over ? 1 : 0.65} />;
      })}
      <line x1={0} x2={w} y1={h - Math.round((threshold / max) * (h - 12)) - 4} y2={h - Math.round((threshold / max) * (h - 12)) - 4} stroke={C.critical} strokeWidth="1" strokeDasharray="4 3" opacity={0.7} />
    </svg>
  );
}

function Gauge({ pct, label, color }) {
  const r = 36, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  const arc = circ * 0.75, fill = arc * (pct / 100), offset = circ * 0.125;
  return (
    <svg viewBox="0 0 100 80" style={{ width: 100, height: 80 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border-tertiary)" strokeWidth="7" strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={-offset} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={`${fill} ${circ - fill}`} strokeDashoffset={-offset} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="14" fontWeight="500" fill="var(--color-text-primary)">{pct}%</text>
      <text x={cx} y={cy + 17} textAnchor="middle" fontSize="8" fill="var(--color-text-secondary)">{label}</text>
    </svg>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: "1.5rem", overflowX: "auto" }}>
      {tabs.map((t) => (
        <button key={t} onClick={() => onChange(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 16px", fontSize: 13, fontWeight: active === t ? 500 : 400, color: active === t ? C.accent : "var(--color-text-secondary)", borderBottom: active === t ? `2px solid ${C.accent}` : "2px solid transparent", whiteSpace: "nowrap", transition: "all 0.15s" }}>{t}</button>
      ))}
    </div>
  );
}

function AlertBanner({ onDismiss }) {
  return (
    <div style={{ background: C.criticalBg, border: `1px solid ${C.criticalBorder}`, borderRadius: "var(--border-radius-lg)", padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start", marginBottom: "1.5rem" }}>
      <div style={{ fontSize: 16 }}>⚠</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: C.critical }}>CRITICAL ALERT — Nilgiris Zone A</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 3 }}>GPS displacement (18.4 mm) and rainfall (62.3 mm/hr) exceed thresholds. High landslide probability in next 24 hours.</div>
      </div>
      <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: 0 }}>×</button>
    </div>
  );
}

function SensorCard({ name }) {
  const d = SENSOR_DATA[name];
  const over = d.current > d.threshold;
  return (
    <div style={{ background: "var(--color-background-primary)", border: `0.5px solid ${over ? C.criticalBorder : "var(--color-border-tertiary)"}`, borderRadius: "var(--border-radius-lg)", padding: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{name}</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: over ? C.critical : "var(--color-text-primary)" }}>{d.current.toFixed(1)}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 3 }}>{d.unit}</span></div>
        </div>
        <div style={{ background: over ? C.criticalBg : C.safeBg, color: over ? C.critical : C.safe, border: `0.5px solid ${over ? C.criticalBorder : C.safeBorder}`, borderRadius: "var(--border-radius-md)", padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>{over ? "ABOVE THRESHOLD" : "NORMAL"}</div>
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Threshold: {d.threshold} {d.unit}</div>
      <MiniBar series={d.series} threshold={d.threshold} color={C.accent} />
    </div>
  );
}

function ForecastWidget() {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
      {THREAT_FORECAST.map((d, i) => (
        <div key={i} style={{ minWidth: 80, flex: "0 0 80px", borderRadius: "var(--border-radius-lg)", background: statusBg(d.level), border: `0.5px solid ${statusBorder(d.level)}`, padding: "10px 8px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{d.day}</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: statusColor(d.level), lineHeight: 1 }}>{d.pct}%</div>
          <div style={{ fontSize: 9, fontWeight: 500, color: statusColor(d.level), marginTop: 4 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Section Views ────────────────────────────────────────────────────────────
function Dashboard({ showBanner, setShowBanner }) {
  return (
    <div>
      {showBanner && <AlertBanner onDismiss={() => setShowBanner(false)} />}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: "1.5rem" }}>
        {[
          { label: "Active Nodes", val: "5", sub: "All transmitting" },
          { label: "Critical Alerts", val: "2", sub: "Nilgiris Zone A", color: C.critical },
          { label: "Threat Level", val: "HIGH", sub: "Zone A & B", color: C.critical },
          { label: "Avg. Moisture", val: "61%", sub: "Across all nodes" },
          { label: "Rainfall 24hr", val: "48mm", sub: "Zone A highest" },
          { label: "Sensor Uptime", val: "98.9%", sub: "All zones" },
        ].map((c, i) => (
          <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "14px 16px" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: c.color || "var(--color-text-primary)" }}>{c.val}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>7-Day Landslide Risk Forecast</div>
        <ForecastWidget />
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 10 }}>Based on AI model combining sensor readings, rainfall forecast, and historical data</div>
      </div>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Sensor Node Overview</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SENSOR_NODES.map((n) => (
            <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor(n.status), flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{n.location}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Last sync: {n.lastSync}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 500, color: statusColor(n.status) }}>{n.threat}%</div>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>threat</div>
              </div>
              <div style={{ background: statusBg(n.status), color: statusColor(n.status), border: `0.5px solid ${statusBorder(n.status)}`, borderRadius: "var(--border-radius-md)", padding: "3px 10px", fontSize: 11, fontWeight: 500, textTransform: "uppercase" }}>{n.status}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Recent Alerts</div>
        {ALERTS.map((a, i) => (
          <div key={a.id} style={{ display: "flex", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: i < ALERTS.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(a.type), marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: statusColor(a.type) }}>{a.zone}</span>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{a.time}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{a.msg}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SensorDataView() {
  const [selected, setSelected] = useState("All Sensors");
  const tabs = ["All Sensors", ...SENSOR_TYPES];
  return (
    <div>
      <Tabs tabs={tabs} active={selected} onChange={setSelected} />
      {selected === "All Sensors" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {SENSOR_TYPES.map((s) => <SensorCard key={s} name={s} />)}
        </div>
      ) : (
        <div>
          <SensorCard name={selected} />
          <div style={{ marginTop: 16, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Historical Data — Last 24 Hours</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>{["Time", "Value", "Threshold", "Status"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--color-text-secondary)", fontWeight: 500, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {SENSOR_DATA[selected].series.slice(0, 12).map((s, i) => {
                    const over = s.value > SENSOR_DATA[selected].threshold;
                    return (
                      <tr key={i}>
                        <td style={{ padding: "6px 8px", color: "var(--color-text-secondary)" }}>{s.label}</td>
                        <td style={{ padding: "6px 8px", fontWeight: 500, color: over ? C.critical : "var(--color-text-primary)" }}>{s.value.toFixed(1)} {SENSOR_DATA[selected].unit}</td>
                        <td style={{ padding: "6px 8px", color: "var(--color-text-secondary)" }}>{SENSOR_DATA[selected].threshold} {SENSOR_DATA[selected].unit}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <span style={{ background: over ? C.criticalBg : C.safeBg, color: over ? C.critical : C.safe, border: `0.5px solid ${over ? C.criticalBorder : C.safeBorder}`, borderRadius: "var(--border-radius-md)", padding: "2px 8px", fontSize: 11 }}>{over ? "ALERT" : "OK"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceHealthView() {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: "1.5rem" }}>
        {SERVICE_HEALTH.map((n) => {
          const node = SENSOR_NODES.find((x) => x.id === n.node);
          return (
            <div key={n.node} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{node?.location || n.node}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Node ID: {n.node}</div>
                </div>
                {n.issues > 0 && <span style={{ background: C.warningBg, color: C.warning, border: `0.5px solid ${C.warningBorder}`, borderRadius: "var(--border-radius-md)", padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>{n.issues} ISSUE{n.issues > 1 ? "S" : ""}</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12 }}>
                <Gauge pct={n.battery} label="Battery" color={n.battery < 50 ? C.warning : C.safe} />
                <Gauge pct={n.signal} label="Signal" color={n.signal < 70 ? C.warning : C.accent} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                {[["Uptime", n.uptime], ["Last Calib.", n.lastCalibration], ["Next Service", n.nextService], ["LoRa Status", "Active"]].map(([k, v]) => (
                  <div key={k} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 2 }}>{k}</div>
                    <div style={{ fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Data Pipeline Status</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { step: "Sensors → Arduino", status: "safe", latency: "12ms", rate: "1/min" },
            { step: "Arduino → LoRa", status: "safe", latency: "45ms", rate: "1/min" },
            { step: "LoRa → ESP32", status: "safe", latency: "78ms", rate: "1/min" },
            { step: "ESP32 → Cloud", status: "warning", latency: "320ms", rate: "1/min" },
            { step: "Cloud → App", status: "safe", latency: "85ms", rate: "Real-time" },
          ].map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(p.status), flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13 }}>{p.step}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Latency: {p.latency}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{p.rate}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomerPortalView() {
  const [tab, setTab] = useState("Overview");
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  return (
    <div>
      <Tabs tabs={["Overview", "Land Records", "Documents", "Feedback & Issues"]} active={tab} onChange={setTab} />
      {tab === "Overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {CUSTOMERS.map((c) => (
            <div key={c.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: c.type === "Government" ? C.infoBg : C.safeBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: c.type === "Government" ? C.info : C.safe }}>{c.name.slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>License: {c.license}</div>
                </div>
                <span style={{ background: c.type === "Government" ? C.infoBg : C.safeBg, color: c.type === "Government" ? C.info : C.safe, border: `0.5px solid ${c.type === "Government" ? C.infoBorder : C.safeBorder}`, borderRadius: "var(--border-radius-md)", padding: "3px 10px", fontSize: 11 }}>{c.type}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
                {[["Zones", c.zones.join(", ")], ["Status", c.status.toUpperCase()], ["Expires", c.expires]].map(([k, v]) => (
                  <div key={k} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{k}</div>
                    <div style={{ fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "Land Records" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {SENSOR_NODES.map((n) => (
            <div key={n.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 12 }}>{n.location}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, fontSize: 12 }}>
                {[
                  ["Survey No.", `SRV-${n.id}-2024`],
                  ["Coordinates", `${n.lat.toFixed(3)}°N, ${n.lng.toFixed(3)}°E`],
                  ["Elevation", `${Math.round(800 + Math.random() * 1200)}m ASL`],
                  ["Slope Angle", `${(Math.random() * 25 + 10).toFixed(1)}°`],
                  ["Soil Type", ["Sandy Loam", "Clay", "Silt Loam", "Gravel"][Math.floor(Math.random() * 4)]],
                  ["Vegetation", ["Dense Forest", "Sparse", "Mixed"][Math.floor(Math.random() * 3)]],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 10px" }}>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{k}</div>
                    <div style={{ fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "Documents" && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Legal & Technical Documents</div>
          {[
            { name: "Installation Certificate", zone: "All Zones", date: "2024-01-15" },
            { name: "Government Authorization - TN", zone: "N001, N002", date: "2024-02-01" },
            { name: "Land Survey Report — Nilgiris", zone: "N001", date: "2024-03-10" },
            { name: "Sensor Calibration Certificate", zone: "All Zones", date: "2025-01-05" },
            { name: "Annual Maintenance Agreement", zone: "All Zones", date: "2025-01-01" },
            { name: "Environmental Clearance", zone: "N003, N005", date: "2024-04-20" },
          ].map((doc, i, arr) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < arr.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--border-radius-md)", background: C.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: C.info, flexShrink: 0 }}>PDF</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.name}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{doc.zone} · {doc.date}</div>
              </div>
              <span style={{ background: C.safeBg, color: C.safe, border: `0.5px solid ${C.safeBorder}`, borderRadius: "var(--border-radius-md)", padding: "3px 10px", fontSize: 11 }}>verified</span>
            </div>
          ))}
        </div>
      )}
      {tab === "Feedback & Issues" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Submit Feedback or Report Issue</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <select style={{ padding: "8px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13 }}>
                <option>General Feedback</option><option>Sensor Malfunction</option><option>Alert Accuracy Issue</option><option>Data Discrepancy</option><option>App Bug / UI Issue</option>
              </select>
              <select style={{ padding: "8px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13 }}>
                <option>All Zones</option>
                {SENSOR_NODES.map((n) => <option key={n.id}>{n.location}</option>)}
              </select>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Describe your feedback or issue in detail..." rows={4} style={{ padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, resize: "vertical" }} />
              <button onClick={() => { setFeedbackSent(true); setFeedback(""); }} style={{ padding: "10px 20px", borderRadius: "var(--border-radius-md)", background: C.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, alignSelf: "flex-start" }}>Submit</button>
              {feedbackSent && <div style={{ background: C.safeBg, color: C.safe, borderRadius: "var(--border-radius-md)", padding: "10px 14px", fontSize: 13 }}>Thank you. Your report has been submitted and assigned ticket #TKT-{Math.floor(Math.random() * 9000 + 1000)}.</div>}
            </div>
          </div>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Open Issues</div>
            {[
              { id: "TKT-3821", type: "Sensor Malfunction", zone: "N003", date: "2025-03-18", status: "In Progress" },
              { id: "TKT-3798", type: "Alert Accuracy Issue", zone: "N001", date: "2025-03-10", status: "Resolved" },
              { id: "TKT-3755", type: "Data Discrepancy", zone: "N005", date: "2025-03-01", status: "Resolved" },
            ].map((t, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < arr.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{t.id}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{t.type} · {t.zone}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{t.date}</div>
                </div>
                <span style={{ background: t.status === "Resolved" ? C.safeBg : C.warningBg, color: t.status === "Resolved" ? C.safe : C.warning, border: `0.5px solid ${t.status === "Resolved" ? C.safeBorder : C.warningBorder}`, borderRadius: "var(--border-radius-md)", padding: "3px 10px", fontSize: 11 }}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsView() {
  const [node, setNode] = useState("All Zones");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", alignItems: "center" }}>
        <label style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Zone:</label>
        <select value={node} onChange={(e) => setNode(e.target.value)} style={{ padding: "6px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13 }}>
          <option>All Zones</option>
          {SENSOR_NODES.map((n) => <option key={n.id}>{n.location}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {SENSOR_TYPES.map((s) => {
          const d = SENSOR_DATA[s];
          const max = Math.max(...d.series.map((x) => x.value));
          const avg = d.series.reduce((a, b) => a + b.value, 0) / d.series.length;
          return (
            <div key={s} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s}</div>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Avg: {avg.toFixed(1)} {d.unit}</span>
              </div>
              <MiniBar series={d.series} threshold={d.threshold} color={C.accent} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {[["Peak", `${max.toFixed(1)} ${d.unit}`], ["Threshold", `${d.threshold} ${d.unit}`], ["Now", `${d.current} ${d.unit}`]].map(([k, v]) => (
                  <div key={k} style={{ flex: 1, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlertsView() {
  const [phone, setPhone] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Public Alert Subscription</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>Residents receive automatic SMS + push alerts when threat level crosses critical threshold.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9XXXXXXXXX" style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13 }} />
          <button onClick={() => setSubscribed(true)} style={{ padding: "8px 16px", background: C.accent, color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Subscribe</button>
        </div>
        {subscribed && <div style={{ background: C.safeBg, color: C.safe, borderRadius: "var(--border-radius-md)", padding: "10px 14px", fontSize: 13, marginTop: 10 }}>Subscribed. You will receive alerts for your registered zone.</div>}
      </div>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Alert History</div>
        {ALERTS.map((a, i) => (
          <div key={a.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < ALERTS.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--border-radius-md)", background: statusBg(a.type), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
              {a.type === "critical" ? "🚨" : a.type === "warning" ? "⚠" : "ℹ"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{a.zone}</span>
                <span style={{ background: statusBg(a.type), color: statusColor(a.type), border: `0.5px solid ${statusBorder(a.type)}`, borderRadius: "var(--border-radius-md)", padding: "2px 8px", fontSize: 10 }}>{a.type.toUpperCase()}</span>
                <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{a.time}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{a.msg}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Notification Channels</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[["SMS Broadcast", "Active", "1,240 numbers enrolled"], ["Push Notifications", "Active", "892 app users"], ["Email Digest", "Active", "Government: 14 contacts"], ["WhatsApp Alert", "Beta", "450 opted in"], ["Siren Activation", "Manual Only", "3 zones equipped"]].map(([ch, st, detail]) => (
            <div key={ch} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{ch}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{detail}</div>
              </div>
              <span style={{ background: st === "Active" ? C.safeBg : C.infoBg, color: st === "Active" ? C.safe : C.info, border: `0.5px solid ${st === "Active" ? C.safeBorder : C.infoBorder}`, borderRadius: "var(--border-radius-md)", padding: "3px 10px", fontSize: 11 }}>{st}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [userType, setUserType] = useState("government");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em" }}>LandShield</div>
          <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 4 }}>AI-Powered Early Landslide Detection</div>
        </div>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem 2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: "1.5rem" }}>
            {["government", "individual"].map((t) => (
              <button key={t} onClick={() => setUserType(t)} style={{ padding: "10px", borderRadius: "var(--border-radius-md)", border: `0.5px solid ${userType === t ? C.accent : "var(--color-border-secondary)"}`, background: userType === t ? C.infoBg : "transparent", color: userType === t ? C.accent : "var(--color-text-secondary)", cursor: "pointer", fontSize: 13, fontWeight: userType === t ? 500 : 400 }}>
                {t === "government" ? "Government" : "Individual"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Email</div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Password</div>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <button onClick={() => onLogin(userType)} style={{ padding: "10px", background: C.accent, color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontSize: 14, fontWeight: 500, marginTop: 4 }}>Sign in</button>
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--color-text-secondary)" }}>Demo: press Sign in without credentials</div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: "1rem", fontSize: 11, color: "var(--color-text-tertiary)" }}>LandShield v2.1 · Secured · NDMA Compliant</div>
      </div>
    </div>
  );
}

// ─── Root App Component ───────────────────────────────────────────────────────
function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userType, setUserType] = useState("government");
  const [section, setSection] = useState("Dashboard");
  const [showBanner, setShowBanner] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!loggedIn) return;
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, [loggedIn]);

  if (!loggedIn) return <LoginScreen onLogin={(t) => { setUserType(t); setLoggedIn(true); }} />;

  const navItems = [
    { id: "Dashboard", icon: "◉" },
    { id: "Sensor Data", icon: "⬡" },
    { id: "Analytics", icon: "▦" },
    { id: "Alerts", icon: "◈" },
    { id: "Service Health", icon: "◎" },
    { id: "Customer Portal", icon: "◇" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-background-tertiary)" }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "1.5rem 1.25rem 1rem" }}>
          <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em" }}>LandShield</div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>Early Detection System</div>
        </div>
        <div style={{ padding: "0 0.75rem", flex: 1 }}>
          {navItems.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", marginBottom: 2, borderRadius: "var(--border-radius-md)", border: "none", cursor: "pointer", background: section === n.id ? C.infoBg : "transparent", color: section === n.id ? C.accent : "var(--color-text-secondary)", fontWeight: section === n.id ? 500 : 400, fontSize: 13, textAlign: "left", transition: "all 0.15s" }}>
              <span style={{ fontSize: 14 }}>{n.icon}</span>
              {n.id}
              {n.id === "Alerts" && showBanner && (
                <span style={{ marginLeft: "auto", background: C.critical, color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500 }}>2</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ padding: "1rem 1.25rem", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.infoBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: C.info }}>
              {userType === "government" ? "GV" : "IN"}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{userType === "government" ? "TN-DRF Admin" : "Individual User"}</div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", cursor: "pointer" }} onClick={() => setLoggedIn(false)}>Sign out</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.safe }} />
            <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Live · Updated {tick > 0 ? `${tick * 5}s ago` : "just now"}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>{section}</h1>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
              {section === "Dashboard" && "Real-time overview of all monitored zones"}
              {section === "Sensor Data" && "Live readings from all 6 sensor types"}
              {section === "Analytics" && "Trend analysis and historical data"}
              {section === "Alerts" && "Notifications and alert management"}
              {section === "Service Health" && "Sensor uptime, battery, and data pipeline"}
              {section === "Customer Portal" && "Customer accounts, land records, and documents"}
            </div>
          </div>
          {section === "Dashboard" && <Dashboard showBanner={showBanner} setShowBanner={setShowBanner} />}
          {section === "Sensor Data" && <SensorDataView />}
          {section === "Analytics" && <AnalyticsView />}
          {section === "Alerts" && <AlertsView />}
          {section === "Service Health" && <ServiceHealthView />}
          {section === "Customer Portal" && <CustomerPortalView />}
        </div>
      </div>
    </div>
  );
}

export default App;
