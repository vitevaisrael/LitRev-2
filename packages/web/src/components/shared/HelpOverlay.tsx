interface HelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpOverlay({ isOpen, onClose }: HelpOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Navigation</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>1-5</span>
                  <span className="text-gray-600">Switch steps</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Screening Actions</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>I</span>
                  <span className="text-gray-600">Include</span>
                </div>
                <div className="flex justify-between">
                  <span>X</span>
                  <span className="text-gray-600">Exclude</span>
                </div>
                <div className="flex justify-between">
                  <span>B</span>
                  <span className="text-gray-600">Better</span>
                </div>
                <div className="flex justify-between">
                  <span>A</span>
                  <span className="text-gray-600">Ask</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-3">
            <h3 className="font-medium mb-2">Other Actions</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>R</span>
                <span className="text-gray-600">Run Explorer</span>
              </div>
              <div className="flex justify-between">
                <span>E</span>
                <span className="text-gray-600">Export</span>
              </div>
              <div className="flex justify-between">
                <span>?</span>
                <span className="text-gray-600">Show this help</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
