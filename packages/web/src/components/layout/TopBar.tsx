import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
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
import { User, LogOut, MessageSquare, Upload, Zap, Download, Keyboard } from 'lucide-react';

interface TopBarProps {
  onRunExplorer: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function TopBar({ onRunExplorer, onExport, onImport }: TopBarProps) {
  const [showHelp, setShowHelp] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onRunExplorer,
    onExport,
    onImport,
    onNavigateToChat: () => navigate('/chat-review'),
    onShowHelp: () => setShowHelp(!showHelp),
    onCloseModal: () => setShowHelp(false),
  });

  return (
    <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">The Scientist</h1>
          <span className="text-sm text-muted-foreground">Medical Literature Review</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/chat-review')}
            variant="outline"
            size="sm"
            title="AI Review Chat (Ctrl+Shift+C)"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            AI Review Chat
          </Button>
          <Button
            onClick={onImport}
            variant="outline"
            size="sm"
            title="Import documents (Ctrl+I)"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            onClick={onRunExplorer}
            variant="outline"
            size="sm"
            title="Run AI Explorer (Ctrl+Shift+A)"
          >
            <Zap className="h-4 w-4 mr-2" />
            AI Explorer
          </Button>
          <Button
            onClick={onExport}
            variant="outline"
            size="sm"
            title="Export results (Ctrl+E)"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button
            onClick={() => setShowHelp(!showHelp)}
            variant="ghost"
            size="icon"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
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
        <div className="absolute top-16 right-6 bg-popover border rounded-lg shadow-lg p-6 z-10 w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Keyboard Shortcuts</h3>
            <Button
              onClick={() => setShowHelp(false)}
              variant="ghost"
              size="icon"
              className="h-6 w-6"
            >
              ×
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Navigation</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Navigate steps</span>
                  <kbd className="bg-muted px-2 py-1 rounded text-xs">1-5</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Go to Projects</span>
                  <kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+1</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Go to Screening</span>
                  <kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+2</kbd>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Actions</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Include candidate</span>
                  <kbd className="bg-muted px-2 py-1 rounded text-xs">I</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Exclude candidate</span>
                  <kbd className="bg-muted px-2 py-1 rounded text-xs">X</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Mark as Better</span>
                  <kbd className="bg-muted px-2 py-1 rounded text-xs">B</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Run AI Explorer</span>
                  <kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+Shift+A</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Export results</span>
                  <kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+E</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Import documents</span>
                  <kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+I</kbd>
                </div>
                <div className="flex justify-between">
                  <span>AI Review Chat</span>
                  <kbd className="bg-muted px-2 py-1 rounded text-xs">Ctrl+Shift+C</kbd>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">General</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Show shortcuts</span>
                  <kbd className="bg-muted px-2 py-1 rounded text-xs">?</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Close modal</span>
                  <kbd className="bg-muted px-2 py-1 rounded text-xs">Esc</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
