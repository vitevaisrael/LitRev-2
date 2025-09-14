import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ThreePane } from '../components/layout/ThreePane';
import { LeftRail } from '../components/layout/LeftRail';
import { TopBar } from '../components/layout/TopBar';
import { ProblemProfile } from '../components/intake/ProblemProfile';
import { DecisionCard } from '../components/screen/DecisionCard';
import { CandidateList } from '../components/screen/CandidateList';
import { ClaimDetail } from '../components/ledger/ClaimDetail';
import { DraftEditor } from '../components/draft/DraftEditor';
import { ExplorerPanel } from '../components/explorer/ExplorerPanel';
import { PrismaWidget } from '../components/shared/PrismaWidget';
import { AuditLog } from '../components/shared/AuditLog';
import { useKeyboard } from '../hooks/useKeyboard';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function Project() {
  const { id } = useParams<{ id: string }>();
  const [activeStep, setActiveStep] = useState('intake');
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch PRISMA data
  const { data: prismaData } = useQuery({
    queryKey: queryKeys.prisma(id || ''),
    queryFn: () => api.get(`/projects/${id}/prisma`),
    enabled: !!id
  });

  // Decision mutation
  const decisionMutation = useMutation({
    mutationFn: (decision: any) => api.post(`/projects/${id}/decide`, decision),
    onSuccess: () => {
      // Refetch candidates, PRISMA data, and audit logs
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates(id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.prisma(id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(id || '') });
      // Show success toast (you can add a toast library later)
      console.log('Decision recorded successfully');
    },
    onError: (error) => {
      console.error('Failed to record decision:', error);
    }
  });

  // Explorer run mutation
  const explorerRunMutation = useMutation({
    mutationFn: (data: any) => api.post(`/projects/${id}/explorer/run`, data),
    onSuccess: (response) => {
      console.log('Explorer run started:', (response.data as any).jobId);
      // In a real app, you'd poll for completion or use websockets
    },
    onError: (error) => {
      console.error('Failed to start explorer run:', error);
    }
  });

  // Import refs mutation
  const importRefsMutation = useMutation({
    mutationFn: (data: any) => api.post(`/projects/${id}/explorer/import`, data),
    onSuccess: (response) => {
      console.log('References imported:', (response.data as any).imported.length);
      // Refetch candidates to show new ones
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates(id || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.prisma(id || '') });
    },
    onError: (error) => {
      console.error('Failed to import references:', error);
    }
  });

  const prismaCounters = (prismaData?.data as any)?.prisma || {
    identified: 0,
    duplicates: 0,
    screened: 0,
    included: 0,
    excluded: 0
  };

  // Mock data for other components (to be replaced later)
  // const mockAuditEntries = [
  //   {
  //     ts: new Date().toISOString(),
  //     kind: 'project_created',
  //     userId: 'user1',
  //     details: { message: 'Project created' }
  //   }
  // ];

  const mockClaim = {
    id: '1',
    text: 'Corticosteroid therapy reduces proteinuria in IgA nephropathy patients.',
    section: 'Results',
    supports: [
      {
        id: '1',
        quote: 'Corticosteroid therapy was associated with a significant reduction in proteinuria.',
        locator: { page: 3, sentence: 2 },
        candidateId: '1'
      }
    ]
  };

  useKeyboard((key) => {
    switch (key) {
      case 'step-1': setActiveStep('intake'); break;
      case 'step-2': setActiveStep('screen'); break;
      case 'step-3': setActiveStep('ledger'); break;
      case 'step-4': setActiveStep('draft'); break;
      case 'step-5': setActiveStep('exports'); break;
      case 'explorer': setActiveStep('explorer'); break;
    }
  });

  const renderCenterContent = () => {
    switch (activeStep) {
      case 'intake':
        return <ProblemProfile />;
      case 'screen':
        return selectedCandidate ? (
          <DecisionCard
            candidate={selectedCandidate}
            projectId={id || ''}
            onInclude={(reason, justification) => {
              decisionMutation.mutate({
                candidateId: selectedCandidate.id,
                action: 'include',
                reason,
                justification,
                stage: 'title_abstract'
              });
            }}
            onExclude={(reason, justification) => {
              decisionMutation.mutate({
                candidateId: selectedCandidate.id,
                action: 'exclude',
                reason,
                justification,
                stage: 'title_abstract'
              });
            }}
            onBetter={(reason) => {
              decisionMutation.mutate({
                candidateId: selectedCandidate.id,
                action: 'better',
                reason,
                stage: 'title_abstract'
              });
            }}
            onAsk={(question) => {
              decisionMutation.mutate({
                candidateId: selectedCandidate.id,
                action: 'ask',
                reason: question,
                stage: 'title_abstract'
              });
            }}
          />
        ) : (
          <div className="p-6 text-center text-gray-500">
            Select a candidate to screen
          </div>
        );
      case 'ledger':
        return <ClaimDetail claim={mockClaim} onAddSupport={() => {}} />;
      case 'draft':
        return (
          <DraftEditor
            section="Introduction"
            content="This systematic review examines the efficacy of corticosteroid therapy in IgA nephropathy..."
            onChange={() => {}}
            onInsertCitation={() => {}}
          />
        );
      case 'exports':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Exports</h2>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 border rounded hover:bg-gray-50">
                <h3 className="font-medium">DOCX</h3>
                <p className="text-sm text-gray-600">Word document with numbered references</p>
              </button>
              <button className="p-4 border rounded hover:bg-gray-50">
                <h3 className="font-medium">BibTeX</h3>
                <p className="text-sm text-gray-600">Bibliography format</p>
              </button>
              <button className="p-4 border rounded hover:bg-gray-50">
                <h3 className="font-medium">PRISMA SVG</h3>
                <p className="text-sm text-gray-600">Flow diagram</p>
              </button>
              <button className="p-4 border rounded hover:bg-gray-50">
                <h3 className="font-medium">Ledger JSON</h3>
                <p className="text-sm text-gray-600">Evidence ledger data</p>
              </button>
            </div>
          </div>
        );
      case 'explorer':
        return (
          <div className="p-6">
            <div className="mb-4">
              <button
                onClick={() => explorerRunMutation.mutate({ prompt: 'Generate a systematic review outline for IgA nephropathy treatment' })}
                disabled={explorerRunMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {explorerRunMutation.isPending ? 'Running Explorer...' : 'Run Explorer'}
              </button>
            </div>
            <ExplorerPanel
              run={{
                runId: 'mock-run-123',
                outline: [
                  'Introduction to IgA nephropathy',
                  'Pathophysiology and diagnosis',
                  'Treatment options and evidence',
                  'Corticosteroid therapy outcomes',
                  'Future directions'
                ],
                narrative: [
                  {
                    section: 'Introduction',
                    text: 'IgA nephropathy is the most common primary glomerulonephritis worldwide, affecting approximately 1.3% of the global population.',
                    refs: [{ doi: '10.1001/jama.2023.12345' }]
                  },
                  {
                    section: 'Treatment',
                    text: 'Corticosteroid therapy has shown promise in reducing proteinuria in IgA nephropathy patients, though the evidence remains controversial.',
                    refs: [{ doi: '10.1001/jama.2023.12345' }, { pmid: '87654321' }]
                  }
                ],
                refs: [
                  {
                    title: 'Corticosteroids in IgA Nephropathy: A Systematic Review',
                    journal: 'JAMA',
                    year: 2023,
                    doi: '10.1001/jama.2023.12345'
                  },
                  {
                    title: 'Adalimumab for Uveitis in Spondyloarthritis',
                    journal: 'NEJM',
                    year: 2022,
                    pmid: '87654321'
                  }
                ]
              }}
              onImportSelected={(refs) => {
                // For now, use a mock runId since we don't have a real explorer run
                importRefsMutation.mutate({
                  runId: 'mock-run-123',
                  refs: refs
                });
              }}
              onCreateClaimFromParagraph={(text) => {
                console.log('Create claim from:', text);
              }}
            />
          </div>
        );
      default:
        return <div>Unknown step</div>;
    }
  };

  const renderLeftContent = () => {
    switch (activeStep) {
      case 'screen':
        return (
          <CandidateList
            projectId={id || ''}
            selectedId={selectedCandidate?.id}
            onSelect={setSelectedCandidate}
          />
        );
      default:
        return <LeftRail activeItem={activeStep} onNavigate={setActiveStep} />;
    }
  };

  const renderRightContent = () => {
    switch (activeStep) {
      case 'screen':
        return <PrismaWidget counters={prismaCounters} />;
      case 'ledger':
        return <AuditLog projectId={id || ''} />;
      default:
        return <PrismaWidget counters={prismaCounters} />;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <TopBar
        onRunExplorer={() => setActiveStep('explorer')}
        onExport={() => setActiveStep('exports')}
      />
      
      <div className="flex-1 overflow-hidden">
        <ThreePane
          left={renderLeftContent()}
          center={renderCenterContent()}
          right={renderRightContent()}
        />
      </div>
    </div>
  );
}
