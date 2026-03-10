import type React from 'react';

export const SettingsLoading: React.FC = () => {
  return (
    <div className="grid animate-fade-in gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-[28px] border border-border bg-card/70 p-4">
          <div className="h-3 w-24 rounded bg-muted/40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="h-4 w-24 rounded bg-muted/40" />
                <div className="mt-2 h-3 w-full rounded bg-muted/30" />
                <div className="mt-3 h-3 w-2/3 rounded bg-muted/30" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[28px] border border-border bg-card/70 p-6">
          <div className="h-3 w-28 rounded bg-muted/40" />
          <div className="mt-4 h-8 w-56 rounded bg-muted/30" />
          <div className="mt-3 h-3 w-full rounded bg-muted/30" />
          <div className="mt-2 h-3 w-5/6 rounded bg-muted/30" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <div className="h-3 w-16 rounded bg-muted/40" />
                <div className="mt-3 h-5 w-20 rounded bg-muted/30" />
              </div>
            ))}
          </div>
        </div>

        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[28px] border border-border bg-card/70 p-5">
            <div className="h-4 w-48 rounded bg-muted/40" />
            <div className="mt-3 h-3 w-full rounded bg-muted/30" />
            <div className="mt-4 h-12 rounded-2xl bg-muted/20" />
          </div>
        ))}
      </div>
    </div>
  );
};
