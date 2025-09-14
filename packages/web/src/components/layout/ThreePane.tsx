import { ReactNode } from 'react';

interface ThreePaneProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function ThreePane({ left, center, right }: ThreePaneProps) {
  return (
    <div className="h-screen flex bg-background">
      {/* C1: Left Rail */}
      <div className="overflow-y-auto border-r bg-card">
        {left}
      </div>
      
      {/* C2: Main content */}
      <div className="flex-1 overflow-y-auto bg-background">
        {center}
      </div>
      
      {/* C3: Context pane */}
      <div className="w-96 border-l bg-muted/20 overflow-y-auto">
        {right}
      </div>
    </div>
  );
}
