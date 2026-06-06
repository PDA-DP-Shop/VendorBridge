import React from 'react';

/**
 * PageHeader — Premium dark gradient hero banner used across all pages.
 *
 * Props:
 *  - icon: ReactNode — lucide icon element displayed in the green badge
 *  - module: string — small uppercase module label (e.g. "Vendor Management")
 *  - title: string — main page title
 *  - description: string — subtitle / description
 *  - stats: Array<{ label: string, icon?: ReactNode }> — stat chips shown bottom-left
 *  - action: ReactNode — optional CTA button / element on the right side
 */
const PageHeader = ({ icon, module, title, description, stats = [], action }) => {
  return (
    <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl px-8 py-6 flex items-center justify-between shadow-xl shadow-slate-900/20">
      {/* ── Background decorations in their own clipping layer ── */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        {/* Subtle diagonal stripe texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Green glow top-left */}
        <div className="absolute -top-12 -left-12 h-44 w-44 rounded-full bg-green-500/10 blur-3xl" />
        {/* Emerald glow bottom-right */}
        <div className="absolute -bottom-12 right-16 h-36 w-36 rounded-full bg-emerald-400/10 blur-2xl" />
      </div>

      {/* Left content */}
      <div className="relative z-10">
        {/* Module badge + label */}
        <div className="flex items-center gap-2 mb-2">
          {icon && (
            <div className="h-6 w-6 rounded-md bg-green-500 flex items-center justify-center shadow-md shadow-green-600/40 shrink-0">
              {icon}
            </div>
          )}
          {module && (
            <span className="text-green-400 text-[10px] font-bold uppercase tracking-widest">
              {module}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>

        {/* Description */}
        {description && (
          <p className="text-slate-400 text-xs mt-1 font-medium">{description}</p>
        )}

        {/* Stats chips */}
        {stats.length > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {stats.map((stat, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm"
              >
                {stat.icon && <span className="text-green-400">{stat.icon}</span>}
                {stat.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right — action slot (overflow-visible so dropdowns break out) */}
      {action && (
        <div className="relative z-20 shrink-0 ml-6">
          {action}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
