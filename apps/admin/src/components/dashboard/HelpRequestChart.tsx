"use client";

import { useTranslations } from "next-intl";
import type { DashboardDayCount } from "@/lib/dashboard/stats";

type HelpRequestChartProps = {
  data: DashboardDayCount[];
};

export function HelpRequestChart({ data }: HelpRequestChartProps) {
  const t = useTranslations("AdminDashboard");
  const max = Math.max(...data.map((d) => d.count), 0);
  const width = 560;
  const height = 220;
  const paddingX = 36;
  const paddingY = 28;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  if (data.every((d) => d.count === 0)) {
    return (
      <p className="text-sm text-slate-600" role="status">
        {t("chartEmpty")}
      </p>
    );
  }

  const points = data.map((item, index) => {
    const x =
      paddingX +
      (data.length === 1 ? chartW / 2 : (index / (data.length - 1)) * chartW);
    const y =
      paddingY +
      chartH -
      (max === 0 ? 0 : (item.count / max) * chartH);
    return { ...item, x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = [
    `M ${points[0].x} ${paddingY + chartH}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${paddingY + chartH}`,
    "Z",
  ].join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto min-w-[20rem] w-full"
        role="img"
        aria-label={t("chartTitle")}
      >
        <defs>
          <linearGradient id="helpArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a4a1e" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7a4a1e" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const y = paddingY + chartH * (1 - ratio);
          const value = Math.round(max * ratio);
          return (
            <g key={ratio}>
              <line
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={paddingX - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500"
                fontSize="11"
              >
                {value}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#helpArea)" />
        <polyline
          points={polyline}
          fill="none"
          stroke="#7a4a1e"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((point) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r="4" fill="#7a4a1e" />
            <text
              x={point.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-slate-600"
              fontSize="11"
            >
              {point.label}
            </text>
            <title>{`${point.date}: ${point.count}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}
