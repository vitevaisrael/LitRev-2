import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifySuccess, handleApiError } from '../../lib/notify';

interface ProblemProfileProps {
  projectId: string;
  onPlanGenerated?: (plan: any) => void;
}

export function ProblemProfile({ projectId, onPlanGenerated }: ProblemProfileProps) {
  const [profile, setProfile] = useState({
    population: '',
    exposure: '',
    comparator: '',
    outcomes: '',
    timeframe: { from: 2020, to: 2024 },
    mesh: [],
    include: [],
    exclude: []
  });
  
  const queryClient = useQueryClient();

  // Load existing profile on mount
  const { data: existingProfile, isLoading } = useQuery({
    queryKey: ['problem-profile', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/projects/${projectId}/intake/profile`);
      const data = await response.json();
      return data.data;
    },
    enabled: !!projectId
  });

  // Initialize profile when data loads
  useEffect(() => {
    if (existingProfile) {
      setProfile({
        population: existingProfile.population || '',
        exposure: existingProfile.exposure || '',
        comparator: existingProfile.comparator || '',
        outcomes: existingProfile.outcomes || '',
        timeframe: existingProfile.timeframe || { from: 2020, to: 2024 },
        mesh: existingProfile.mesh || [],
        include: existingProfile.include || [],
        exclude: existingProfile.exclude || []
      });
    }
  }, [existingProfile]);

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const response = await fetch(`/api/v1/projects/${projectId}/intake/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problem-profile', projectId] });
      notifySuccess('Profile saved successfully!');
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to save profile');
    }
  });

  // Generate plan mutation
  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/projects/${projectId}/intake/plan`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }
      
      return data;
    },
    onSuccess: (data) => {
      if (onPlanGenerated) {
        onPlanGenerated(data.data);
      }
      notifySuccess('Plan generated successfully!');
    },
    onError: (error: any) => {
      handleApiError(error, 'Failed to generate plan');
    }
  });

  const handleSaveProfile = () => {
    saveProfileMutation.mutate(profile);
  };

  const handleGeneratePlan = () => {
    generatePlanMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Problem Profile (PICO)</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Population</label>
          <textarea
            value={profile.population}
            onChange={(e) => setProfile({...profile, population: e.target.value})}
            className="w-full p-2 border rounded"
            placeholder="Describe the target population..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Exposure/Intervention</label>
          <textarea
            value={profile.exposure}
            onChange={(e) => setProfile({...profile, exposure: e.target.value})}
            className="w-full p-2 border rounded"
            placeholder="Describe the intervention or exposure..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Comparator</label>
          <textarea
            value={profile.comparator}
            onChange={(e) => setProfile({...profile, comparator: e.target.value})}
            className="w-full p-2 border rounded"
            placeholder="Describe the comparison group..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Outcomes</label>
          <textarea
            value={profile.outcomes}
            onChange={(e) => setProfile({...profile, outcomes: e.target.value})}
            className="w-full p-2 border rounded"
            placeholder="Describe the outcomes of interest..."
          />
        </div>
      </div>
      
      <div className="flex gap-4">
        <button 
          onClick={handleSaveProfile}
          disabled={saveProfileMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saveProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
        </button>
        <button 
          onClick={handleGeneratePlan}
          disabled={generatePlanMutation.isPending}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {generatePlanMutation.isPending ? 'Generating...' : 'Generate Plan'}
        </button>
      </div>
    </div>
  );
}
