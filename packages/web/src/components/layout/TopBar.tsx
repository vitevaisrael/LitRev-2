import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { HelpCircle, User, LogOut } from 'lucide-react';

interface TopBarProps {
  onRunExplorer: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function TopBar({ onRunExplorer, onExport, onImport }: TopBarProps) {
  const [showHelp, setShowHelp] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">The Scientist</h1>
          <span className="text-sm text-muted-foreground">Medical Literature Review</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/chat-review')}
            variant="outline"
            size="sm"
          >
            AI Review Chat
          </Button>
          <Button
            onClick={onImport}
            variant="outline"
            size="sm"
          >
            Import
          </Button>
          <Button
            onClick={onRunExplorer}
            variant="outline"
            size="sm"
          >
            AI Explorer
          </Button>
          <Button
            onClick={onExport}
            variant="outline"
            size="sm"
          >
            Export
          </Button>
          
          <Button
            onClick={() => setShowHelp(!showHelp)}
            variant="ghost"
            size="icon"
            title="Keyboard shortcuts"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {showHelp && (
        <div className="absolute top-16 right-6 bg-popover border rounded-lg shadow-lg p-4 z-10">
          <h3 className="font-semibold mb-2">Keyboard Shortcuts</h3>
          <div className="text-sm space-y-1">
            <div><kbd className="bg-muted px-1 rounded">1-5</kbd> Navigate steps</div>
            <div><kbd className="bg-muted px-1 rounded">I</kbd> Include</div>
            <div><kbd className="bg-muted px-1 rounded">X</kbd> Exclude</div>
            <div><kbd className="bg-muted px-1 rounded">B</kbd> Better</div>
            <div><kbd className="bg-muted px-1 rounded">A</kbd> Explorer</div>
            <div><kbd className="bg-muted px-1 rounded">E</kbd> Export</div>
          </div>
        </div>
      )}
    </div>
  );
}
