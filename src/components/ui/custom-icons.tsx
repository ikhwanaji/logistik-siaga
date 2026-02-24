import React from 'react';

// ─── ICONS (inline SVG wrappers) ──────────────────────────────────────────────
export const Icon = ({ d, size = 20, color = 'currentColor', strokeWidth = 2, fill = 'none' }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

export const Icons = {
  Home: () => <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" />,
  AlertTriangle: () => <Icon d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01" />,
  Package: () => <Icon d={['M16.5 9.4l-9-5.19', 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12']} />,
  User: () => <Icon d={['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z']} />,
  Bell: () => <Icon d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0" />,
  MapPin: () => <Icon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 10a2 2 0 100-4 2 2 0 000 4z" />,
  Camera: () => <Icon d={['M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z', 'M12 17a4 4 0 100-8 4 4 0 000 8z']} />,
  CheckCircle: () => <Icon d="M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3" />,
  ChevronRight: () => <Icon d="M9 18l6-6-6-6" />,
  Heart: () => <Icon d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />,
  Zap: () => <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  Plus: () => <Icon d="M12 5v14 M5 12h14" />,
  Shield: () => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  TrendingUp: () => <Icon d="M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6" />,
  X: () => <Icon d="M18 6L6 18 M6 6l12 12" />,
  Search: () => <Icon d="M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.35-4.35" />,
  Star: () => <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" />,
};
