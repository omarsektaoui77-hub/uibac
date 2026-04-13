// Data Layer - Abstracted Subject Service
// Provides hardened, validated subject data with fallbacks

import { z } from 'zod';

// Schema validation for subjects
const SubjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  path: z.string(),
});

const TrackSchema = z.object({
  label: z.string().optional(),
  subjects: z.array(SubjectSchema),
});

const BranchDataSchema = z.object({
  common: z.array(SubjectSchema),
  SM: TrackSchema,
});

// Types
export type Subject = z.infer<typeof SubjectSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type BranchData = z.infer<typeof BranchDataSchema>;

// Fallback data for resilience
const FALLBACK_SUBJECTS: BranchData = {
  common: [
    { id: "islamic_studies", name: "Islamic Studies", icon: "???", path: "/practice/islamic-studies" },
    { id: "french", name: "French", icon: "???", path: "/practice/french" },
    { id: "arabic", name: "Arabic", icon: "???", path: "/practice/arabic" },
    { id: "philosophy", name: "Philosophy", icon: "???", path: "/practice/philosophy" },
    { id: "history_geo", name: "History / Geography", icon: "???", path: "/practice/history-geography" }
  ],
  SM: {
    label: "Mathematical Sciences",
    subjects: [
      { id: "advanced_math", name: "Advanced Mathematics", icon: "???", path: "/practice/sm/advanced-math" },
      { id: "physics_chemistry", name: "Physics & Chemistry", icon: "???", path: "/practice/sm/physics-chemistry" },
      { id: "engineering_sciences_smb", name: "Engineering Sciences (SM-B)", icon: "???", path: "/practice/sm/engineering-sciences" }
    ]
  }
};

/**
 * Get subjects with validation and fallback
 */
export async function getSubjects(): Promise<BranchData> {
  try {
    // Import dynamically to avoid build issues
    const { branchData } = await import('../branchData');
    
    // Validate data structure
    const validated = BranchDataSchema.safeParse(branchData);
    
    if (validated.success) {
      return validated.data;
    } else {
      console.error('Branch data validation failed:', validated.error);
      return FALLBACK_SUBJECTS;
    }
  } catch (error) {
    console.error('Failed to load subjects:', error);
    return FALLBACK_SUBJECTS;
  }
}

/**
 * Get common subjects only
 */
export async function getCommonSubjects(): Promise<Subject[]> {
  const data = await getSubjects();
  return data.common;
}

/**
 * Get SM track subjects
 */
export async function getSMSubjects(): Promise<Subject[]> {
  const data = await getSubjects();
  return data.SM.subjects;
}

/**
 * Get subject by ID
 */
export async function getSubjectById(id: string): Promise<Subject | null> {
  const data = await getSubjects();
  
  // Search in common subjects
  const commonSubject = data.common.find(subject => subject.id === id);
  if (commonSubject) return commonSubject;
  
  // Search in SM subjects
  const smSubject = data.SM.subjects.find(subject => subject.id === id);
  if (smSubject) return smSubject;
  
  return null;
}

/**
 * Get subjects by track
 */
export async function getSubjectsByTrack(trackId: string): Promise<Subject[]> {
  const data = await getSubjects();
  
  switch (trackId) {
    case 'common':
      return data.common;
    case 'sm':
      return data.SM.subjects;
    default:
      console.warn(`Unknown track: ${trackId}`);
      return data.common;
  }
}

/**
 * Generate quiz link for subject
 */
export function generateQuizLink(locale: string, trackId: string, subjectId: string): string {
  return `/${locale}/quiz?trackId=${trackId}&subjectId=${subjectId}`;
}

/**
 * Validate subject data (for AI-generated content)
 */
export function validateSubjectData(data: unknown): Subject | null {
  const result = SubjectSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Sanitize subject name (for AI-generated content)
 */
export function sanitizeSubjectName(name: string): string {
  return name
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/["']/g, '') // Remove quotes
    .trim()
    .slice(0, 50); // Limit length
}

/**
 * Check if subject exists
 */
export async function subjectExists(subjectId: string): Promise<boolean> {
  const subject = await getSubjectById(subjectId);
  return subject !== null;
}

// Export types for use in components
export type { BranchData };
