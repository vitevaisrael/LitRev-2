import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

// Health check hook
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/health'),
    refetchInterval: 30000, // Check every 30 seconds
  });
}

// Projects hooks
export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => api.get('/projects'),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { title: string }) => api.post('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

// Project hooks
export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => api.get(`/projects/${id}`),
    enabled: !!id,
  });
}

// Intake hooks
export function useIntakePlan(projectId: string) {
  return useMutation({
    mutationFn: (data: { note: string }) => 
      api.post(`/projects/${projectId}/intake/plan`, data),
  });
}

// Screen hooks
export function useScreenPropose(projectId: string) {
  return useMutation({
    mutationFn: (data: { candidateId: string }) => 
      api.post(`/projects/${projectId}/screen/propose`, data),
  });
}
