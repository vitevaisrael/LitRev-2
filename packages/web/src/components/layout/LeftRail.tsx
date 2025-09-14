import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { 
  FileText, 
  Search, 
  BookOpen, 
  Edit, 
  Download, 
  Sparkles 
} from 'lucide-react';

interface LeftRailProps {
  activeItem: string;
  onNavigate: (item: string) => void;
}

export function LeftRail({ activeItem, onNavigate }: LeftRailProps) {
  const steps = [
    { id: 'intake', label: 'Intake', key: '1', icon: FileText },
    { id: 'screen', label: 'Screen', key: '2', icon: Search },
    { id: 'ledger', label: 'Ledger', key: '3', icon: BookOpen },
    { id: 'draft', label: 'Draft', key: '4', icon: Edit },
    { id: 'exports', label: 'Exports', key: '5', icon: Download },
  ];

  return (
    <div className="w-72 bg-muted/30 border-r">
      <div className="p-4">
        <nav className="space-y-1">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Button
                key={step.id}
                onClick={() => onNavigate(step.id)}
                variant={activeItem === step.id ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  activeItem === step.id
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{step.label}</span>
              </Button>
            );
          })}
          
          <Separator className="my-4" />
          
          <Button
            onClick={() => onNavigate('explorer')}
            variant={activeItem === 'explorer' ? "secondary" : "ghost"}
            className={`w-full justify-start gap-3 ${
              activeItem === 'explorer'
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">AI Explorer</span>
          </Button>
        </nav>
      </div>
    </div>
  );
}
