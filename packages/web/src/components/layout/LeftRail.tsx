// import { ReactNode } from 'react';

interface LeftRailProps {
  activeItem: string;
  onNavigate: (item: string) => void;
}

export function LeftRail({ activeItem, onNavigate }: LeftRailProps) {
  const steps = [
    { id: 'intake', label: '1. Intake', key: '1' },
    { id: 'screen', label: '2. Screen', key: '2' },
    { id: 'ledger', label: '3. Ledger', key: '3' },
    { id: 'draft', label: '4. Draft', key: '4' },
    { id: 'exports', label: '5. Exports', key: '5' },
  ];

  return (
    <div className="p-4">
      <nav className="space-y-2">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => onNavigate(step.id)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              activeItem === step.id
                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {step.label}
          </button>
        ))}
        
        <div className="border-t pt-4 mt-4">
          <button
            onClick={() => onNavigate('explorer')}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              activeItem === 'explorer'
                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            AI Explorer
          </button>
        </div>
      </nav>
    </div>
  );
}
