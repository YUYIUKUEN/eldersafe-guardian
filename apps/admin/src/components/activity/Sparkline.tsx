"use client";

import type { DayCount } from "@/lib/management/engagement";

type SparklineProps = {
  data: DayCount[];
  label: string;
};

export function Sparkline({ data, label }: SparklineProps) {
  const width = 120;
  const height = 36;
  const max = Math.max(...data.map((item) => item.count), 0);
  if (max === 0) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-9 w-[7.5rem]"
        role="img"
        aria-label={label}
      >
        <line
          x1="0"
          y1={height - 4}
          x2={width}
          y2={height - 4}
          stroke="#cbd5e1"
          strokeWidth="2"
        />
      </svg>
    );
  }

  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
    const y = height - 4 - (item.count / max) * (height - 8);
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-9 w-[7.5rem]"
      role="img"
      aria-label={label}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#7a4a1e"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
