import { ReactNode } from 'react';

interface ThreePaneProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function ThreePane({ left, center, right }: ThreePaneProps) {
  return (
    <div className="h-screen flex">
      {/* C1: List/Queue */}
      <div className="w-80 border-r bg-gray-50">
        {left}
      </div>
      
      {/* C2: Main step view */}
      <div className="flex-1">
        {center}
      </div>
      
      {/* C3: Context pane */}
      <div className="w-96 border-l bg-gray-50">
        {right}
      </div>
    </div>
  );
}
