import { useState } from 'react';

export function ProblemProfile() {
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

  return (
    <div className="space-y-6">
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
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Save Profile
        </button>
        <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
          Generate Plan
        </button>
      </div>
    </div>
  );
}
