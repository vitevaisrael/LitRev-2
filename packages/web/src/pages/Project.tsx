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
import { ExportCenter } from '../components/exports/ExportCenter';
import { PrismaWidget } from '../components/shared/PrismaWidget';
import { AuditLog } from '../components/shared/AuditLog';
import { useKeyboard } from '../hooks/useKeyboard';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function Project() {
  const { id } = useParams<{ id: string }>();
  const [activeStep, setActiveStep] = useState('intake');
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch PRISMA data
  const { data: prismaData } = useQuery({
    queryKey: queryKeys.prisma(id || ''),
    queryFn: () => api.get(`/projects/${id}/prisma`),
    enabled: !!id
  });

  // Poll job status when we have a current job
  const { data: jobStatus } = useQuery({
    queryKey: queryKeys['job-status'](currentJobId || ''),
    queryFn: () => api.get(`/job-status/${currentJobId}`),
    enabled: !!currentJobId,
    refetchInterval: (data) => {
      // Stop polling if job is completed or failed
      if (data?.data?.jobStatus?.status === 'completed' || data?.data?.jobStatus?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    }
  });

  // Fetch explorer run when job is completed
  const runId = jobStatus?.data?.jobStatus?.progress?.runId;
  const { data: explorerRun } = useQuery({
    queryKey: queryKeys['explorer-run'](id || '', runId || ''),
    queryFn: () => api.get(`/projects/${id}/explorer/${runId}`),
    enabled: !!runId && !!id
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
      const jobId = (response.data as any).jobId;
      console.log('Explorer run started:', jobId);
      setCurrentJobId(jobId);
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
        return <ProblemProfile projectId={id || ''} onPlanGenerated={setGeneratedPlan} />;
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
            projectId={id || ''}
            section="Introduction"
          />
        );
      case 'exports':
        return <ExportCenter projectId={id || ''} />;
      case 'explorer':
        return (
          <div className="p-6">
            <div className="mb-4">
              <button
                onClick={() => explorerRunMutation.mutate({ prompt: 'Generate a systematic review outline for IgA nephropathy treatment' })}
                disabled={explorerRunMutation.isPending || currentJobId !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {explorerRunMutation.isPending ? 'Starting Explorer...' : currentJobId ? 'Explorer Running...' : 'Run Explorer'}
              </button>
              
              {/* Job Status Display */}
              {jobStatus?.data?.jobStatus && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Status: {jobStatus.data.jobStatus.status}</span>
                    <span className="text-sm text-gray-600">
                      {jobStatus.data.jobStatus.progress?.count || 0} / {jobStatus.data.jobStatus.progress?.total || 0}
                    </span>
                  </div>
                  {jobStatus.data.jobStatus.progress && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((jobStatus.data.jobStatus.progress.count || 0) / (jobStatus.data.jobStatus.progress.total || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  )}
                  <div className="text-sm text-gray-600 mt-1">
                    Step: {jobStatus.data.jobStatus.progress?.step || 'initializing'}
                  </div>
                  {jobStatus.data.jobStatus.error && (
                    <div className="text-sm text-red-600 mt-1">
                      Error: {jobStatus.data.jobStatus.error}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <ExplorerPanel
              run={explorerRun?.data?.explorer}
              onImportSelected={(refs) => {
                if (runId) {
                  importRefsMutation.mutate({
                    runId: runId,
                    refs: refs
                  });
                }
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
      case 'intake':
        return generatedPlan ? (
          <div className="p-4">
            <h3 className="font-semibold mb-3">Generated Plan</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Mini Abstract</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                  {generatedPlan.miniAbstract}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">PICO Anchors</h4>
                <div className="space-y-2">
                  {generatedPlan.anchors?.map((anchor: any) => (
                    <div key={anchor.id} className="text-sm p-2 bg-blue-50 rounded">
                      <div className="font-medium">{anchor.title}</div>
                      <div className="text-gray-600">{anchor.description}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Review Outline</h4>
                <div className="space-y-1">
                  {generatedPlan.outline?.map((section: any, index: number) => (
                    <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                      <div className="font-medium">{section.section}</div>
                      <div className="text-gray-600">{section.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <h3 className="font-semibold mb-3">Plan Preview</h3>
            <p className="text-sm text-gray-600">
              Save your problem profile and click "Generate Plan" to see the review outline and PICO anchors.
            </p>
          </div>
        );
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
