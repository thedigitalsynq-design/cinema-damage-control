import { createContext, useContext, useEffect, useState } from 'react';

export interface TrackedProject {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  releaseDate?: string;
  theatricalStatus?: string;
  industry?: string;
  sources?: string[];
  isIndianMovie?: boolean;
}

const DEFAULT_PROJECTS: TrackedProject[] = [
  {
    id: 'toxic',
    title: 'TOXIC: A Fairy Tale',
    subtitle: 'Yash · Geetu Mohandas · Sandalwood (Day 16)',
    keywords: ['toxic', 'yash', 'geetu mohandas'],
    releaseDate: '26 Aug 2026',
    theatricalStatus: 'In Theatres (Day 16)',
    industry: 'Sandalwood / Pan-India',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    isIndianMovie: true,
  },
  {
    id: 'goat',
    title: 'THE GREATEST OF ALL TIME (GOAT)',
    subtitle: 'Thalapathy Vijay · Venkat Prabhu · Kollywood (Day 6)',
    keywords: ['goat', 'thalapathy vijay', 'venkat prabhu'],
    releaseDate: '05 Sep 2026',
    theatricalStatus: 'In Theatres (Day 6)',
    industry: 'Kollywood / Tamil',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    isIndianMovie: true,
  },
  {
    id: 'stree2',
    title: 'STREE 2',
    subtitle: 'Shraddha Kapoor · Rajkummar Rao · Bollywood (Day 27)',
    keywords: ['stree 2', 'shraddha kapoor', 'rajkummar rao'],
    releaseDate: '15 Aug 2026',
    theatricalStatus: 'In Theatres (Day 27)',
    industry: 'Bollywood / Hindi',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    isIndianMovie: true,
  },
  {
    id: 'saripodhaa',
    title: 'SARIPODHAA SANIVAARAM',
    subtitle: 'Nani · SJ Suryah · Tollywood (Day 13)',
    keywords: ['saripodhaa sanivaaram', 'nani', 'sj suryah'],
    releaseDate: '29 Aug 2026',
    theatricalStatus: 'In Theatres (Day 13)',
    industry: 'Tollywood / Telugu',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    isIndianMovie: true,
  },
  {
    id: 'mirzapur',
    title: 'Mirzapur: The Movie',
    subtitle: 'Pankaj Tripathi · Ali Fazal · Excel / Hindi (Day 7)',
    keywords: ['mirzapur', 'pankaj tripathi', 'kaleen bhaiya'],
    releaseDate: '04 Sep 2026',
    theatricalStatus: 'In Theatres (Day 7)',
    industry: 'Bollywood / Hindi',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    isIndianMovie: true,
  },
  {
    id: 'arm',
    title: 'A.R.M (Ajayante Randam Moshanam)',
    subtitle: 'Tovino Thomas · Krithi Shetty · Mollywood (Day 1)',
    keywords: ['arm', 'tovino thomas', 'ajayante randam moshanam'],
    releaseDate: '10 Sep 2026',
    theatricalStatus: 'In Theatres (Day 1)',
    industry: 'Mollywood / Malayalam',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    isIndianMovie: true,
  },
  {
    id: 'war2',
    title: 'WAR 2',
    subtitle: 'Hrithik Roshan · Jr NTR · YRF Spy Universe (Day 28)',
    keywords: ['war 2', 'hrithik', 'jr ntr'],
    releaseDate: '14 Aug 2026',
    theatricalStatus: 'In Theatres (Day 28)',
    industry: 'Bollywood / Telugu Dub',
    sources: ['BookMyShow', 'Wikipedia', 'District Trade', 'IMDb', 'Google'],
    isIndianMovie: true,
  },
];

const PROJECTS_KEY = 'cdc-projects';
const ACTIVE_KEY = 'cdc-active-project';

interface ProjectContextValue {
  projects: TrackedProject[];
  project: TrackedProject;
  setActiveId: (id: string) => void;
  addProject: (title: string, keywords: string) => TrackedProject;
  trackFilm: (film: { id: string; title: string; subtitle?: string; keywords: string[] }) => TrackedProject;
  removeProject: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  projects: DEFAULT_PROJECTS,
  project: DEFAULT_PROJECTS[0],
  setActiveId: () => {},
  addProject: () => DEFAULT_PROJECTS[0],
  trackFilm: () => DEFAULT_PROJECTS[0],
  removeProject: () => {},
});

// eslint-disable-next-line react/only-export-components -- custom hook co-located with its provider by design
export function useProject(): ProjectContextValue {
  return useContext(ProjectContext);
}

function loadProjects(): TrackedProject[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PROJECTS_KEY) || '[]');
    if (Array.isArray(saved) && saved.length > 0) {
      // Strictly enforce only Indian movies, remove old Hollywood placeholders, and deduplicate IDs
      const valid: TrackedProject[] = [];
      const seenIds = new Set<string>();
      for (const p of saved) {
        if (
          p &&
          typeof p.id === 'string' &&
          typeof p.title === 'string' &&
          p.id !== 'avatar3' &&
          !p.title.toLowerCase().includes('avatar') &&
          Array.isArray(p.keywords) &&
          p.keywords.length > 0 &&
          !seenIds.has(p.id)
        ) {
          seenIds.add(p.id);
          valid.push(p);
        }
      }
      for (const def of DEFAULT_PROJECTS) {
        if (!seenIds.has(def.id)) {
          seenIds.add(def.id);
          valid.push(def);
        }
      }
      return valid;
    }
  } catch {
    /* fall through to defaults */
  }
  return DEFAULT_PROJECTS;
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<TrackedProject[]>(loadProjects);
  const [activeId, setActiveId] = useState<string>(() => {
    try {
      return window.localStorage.getItem(ACTIVE_KEY) || 'toxic';
    } catch {
      return 'toxic';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
      window.localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {
      /* ignore write failures */
    }
  }, [projects, activeId]);

  // Stale ids (deleted or from older storage) always resolve to a live project.
  const safeId = projects.some((p) => p.id === activeId) ? activeId : projects[0].id;
  const project = projects.find((p) => p.id === safeId) || projects[0];

  const removeProject = (id: string) => {
    setProjects((prev) => {
      if (prev.length <= 1 || !prev.some((p) => p.id === id)) return prev;
      const next = prev.filter((p) => p.id !== id);
      if (safeId === id) setActiveId(next[0].id);
      return next;
    });
  };

  const addProject = (title: string, keywords: string): TrackedProject => {
    const kws = keywords.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 5);
    const cleanTitle = title.trim().slice(0, 40) || 'Untitled';
    const created: TrackedProject = {
      id: `project-${Date.now()}`,
      title: cleanTitle.toUpperCase(),
      subtitle: 'Custom tracking',
      keywords: kws.length > 0 ? kws : [cleanTitle.toLowerCase()],
    };
    setProjects((prev) => [...prev, created]);
    setActiveId(created.id);
    return created;
  };

  const trackFilm = (film: { id: string; title: string; subtitle?: string; keywords: string[] }): TrackedProject => {
    const existing = projects.find((p) => p.id === film.id || p.title.toLowerCase() === film.title.toLowerCase());
    if (existing) {
      setActiveId(existing.id);
      return existing;
    }
    const cleanTitle = film.title.trim().slice(0, 50);
    const newProject: TrackedProject = {
      id: film.id,
      title: cleanTitle,
      subtitle: film.subtitle || 'Indian Theatrical Release (30-Day Radar)',
      keywords: film.keywords && film.keywords.length > 0 ? film.keywords : [cleanTitle.toLowerCase()],
    };
    setProjects((prev) => [newProject, ...prev]);
    setActiveId(newProject.id);
    return newProject;
  };

  return (
    <ProjectContext.Provider value={{ projects, project, setActiveId, addProject, trackFilm, removeProject }}>
      {children}
    </ProjectContext.Provider>
  );
}
