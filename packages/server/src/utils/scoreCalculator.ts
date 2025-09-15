import journalSignal from '../data/journalSignal.json';

export interface ScoreBreakdown {
  design: number;
  directness: number;
  recency: number;
  journal: number;
  total: number;
}

export interface ProblemProfile {
  population?: any;
  exposure?: any;
  comparator?: any;
  outcomes?: any;
}

// Design scoring based on study type patterns in title/abstract
function calculateDesignScore(title: string, abstract?: string): number {
  const text = `${title} ${abstract || ''}`.toLowerCase();
  
  // Systematic review or meta-analysis
  if (text.includes('systematic review') || text.includes('meta-analysis') || 
      text.includes('meta analysis') || text.includes('systematic review and meta-analysis')) {
    return 40;
  }
  
  // Randomized controlled trial
  if (text.includes('randomized controlled trial') || text.includes('rct') ||
      text.includes('randomised controlled trial') || text.includes('randomized trial') ||
      text.includes('randomised trial') || text.includes('randomized clinical trial')) {
    return 35;
  }
  
  // Prospective cohort
  if (text.includes('prospective cohort') || text.includes('prospective study') ||
      text.includes('cohort study') || text.includes('longitudinal study')) {
    return 28;
  }
  
  // Case-control
  if (text.includes('case-control') || text.includes('case control') ||
      text.includes('case series') || text.includes('case study')) {
    return 22;
  }
  
  // Retrospective cohort
  if (text.includes('retrospective cohort') || text.includes('retrospective study') ||
      text.includes('retrospective analysis') || text.includes('chart review')) {
    return 20;
  }
  
  // Case series
  if (text.includes('case series') || text.includes('series of cases')) {
    return 8;
  }
  
  // Case report
  if (text.includes('case report') || text.includes('single case')) {
    return 4;
  }
  
  // Default for unclear study design
  return 15;
}

// Directness scoring based on keyword overlap with ProblemProfile
function calculateDirectnessScore(
  title: string, 
  abstract?: string, 
  problemProfile?: ProblemProfile
): number {
  if (!problemProfile) {
    return 5; // Default moderate score if no profile
  }
  
  const text = `${title} ${abstract || ''}`.toLowerCase();
  const profileText = JSON.stringify(problemProfile).toLowerCase();
  
  // Extract key terms from profile
  const profileTerms = profileText
    .replace(/[{}":,]/g, ' ')
    .split(' ')
    .filter(term => term.length > 3)
    .map(term => term.trim());
  
  let matches = 0;
  const totalTerms = profileTerms.length;
  
  for (const term of profileTerms) {
    if (text.includes(term)) {
      matches++;
    }
  }
  
  const overlapRatio = matches / Math.max(totalTerms, 1);
  
  if (overlapRatio >= 0.7) return 10; // Exact match
  if (overlapRatio >= 0.5) return 7;  // Close match
  if (overlapRatio >= 0.2) return 3;  // Partial match
  return 0; // Off-topic
}

// Recency scoring based on publication year
function calculateRecencyScore(year: number): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;
  
  if (age <= 2) return 5;  // Very recent
  if (age <= 5) return 3;  // Recent
  if (age <= 10) return 1; // Older
  return 0; // Very old
}

// Journal impact scoring
function calculateJournalScore(journal: string): number {
  const journalLower = journal.toLowerCase();
  
  // Check exact matches first
  for (const [journalName, score] of Object.entries(journalSignal)) {
    if (journalLower === journalName.toLowerCase()) {
      return Math.min(score, 5); // Cap at 5
    }
  }
  
  // Check partial matches
  for (const [journalName, score] of Object.entries(journalSignal)) {
    if (journalLower.includes(journalName.toLowerCase()) || 
        journalName.toLowerCase().includes(journalLower)) {
      return Math.min(score, 5); // Cap at 5
    }
  }
  
  // Default score for unknown journals
  return 1;
}

// Main scoring function
export function calculateScore(
  title: string,
  journal: string,
  year: number,
  abstract?: string,
  problemProfile?: ProblemProfile
): ScoreBreakdown {
  const design = calculateDesignScore(title, abstract);
  const directness = calculateDirectnessScore(title, abstract, problemProfile);
  const recency = calculateRecencyScore(year);
  const journalScore = calculateJournalScore(journal);
  
  const total = design + directness + recency + journalScore;
  
  return {
    design,
    directness,
    recency,
    journal: journalScore,
    total
  };
}
