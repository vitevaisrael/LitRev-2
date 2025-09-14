import { useState, useEffect } from 'react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
}

interface QuickTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to The Scientist!',
    description: 'This is your systematic review workspace. Let\'s take a quick tour of the main features.'
  },
  {
    id: 'intake',
    title: 'Step 1: Problem Profile',
    description: 'Start by defining your research question, population, and inclusion criteria. This helps the AI understand what you\'re looking for.'
  },
  {
    id: 'screening',
    title: 'Step 2: Candidate Screening',
    description: 'Review and screen research papers. Use keyboard shortcuts (I=include, X=exclude, B=better, A=ask) for faster screening.'
  },
  {
    id: 'evidence',
    title: 'Step 3: Evidence Capture',
    description: 'Extract quotes and evidence from papers to support your claims. Upload PDFs and select relevant sentences.'
  },
  {
    id: 'drafting',
    title: 'Step 4: Draft Writing',
    description: 'Write your systematic review with AI assistance. Citations are automatically validated and formatted.'
  },
  {
    id: 'exports',
    title: 'Step 5: Export Results',
    description: 'Export your review in multiple formats: Markdown, BibTeX, PRISMA diagram, and structured data.'
  }
];

export function QuickTour({ isOpen, onClose, onComplete }: QuickTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Check if this is the first visit
      const hasVisited = localStorage.getItem('scientist-tour-completed');
      setIsFirstVisit(!hasVisited);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('scientist-tour-completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    if (isFirstVisit) {
      localStorage.setItem('scientist-tour-completed', 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Quick Tour</h2>
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">{step.title}</h3>
          <p className="text-gray-600 text-sm">{step.description}</p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2">
            {TOUR_STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
