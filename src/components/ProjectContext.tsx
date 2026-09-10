import { createContext, useContext, useEffect, useState } from 'react';

export interface TrackedProject {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
}

const DEFAULT_PROJECTS: TrackedProject[] = [
  { id: 'toxic', title: 'TOXIC: A Fairy Tale', subtitle: 'Yash · Geetu Mohandas · KVN Productions', keywords: ['toxic', 'yash'] },
  { id: 'war2', title: 'WAR 2', subtitle: 'Hrithik Roshan · Jr NTR · YRF Spy Universe', keywords: ['war 2', 'hrithik', 'jr ntr'] },
  { id: 'kantara', title: 'KANTARA: Chapter 1', subtitle: 'Rishab Shetty · Hombale Films', keywords: ['kantara', 'rishab shetty'] },
  { id: 'pushpa2', title: 'PUSHPA 2: The Rule', subtitle: 'Allu Arjun · Sukumar · Mythri Movie Makers', keywords: ['pushpa 2', 'allu arjun'] },
  { id: 'avatar3', title: 'AVATAR: Fire & Ash', subtitle: 'James Cameron · 20th Century Studios', keywords: ['avatar 3', 'fire and ash'] },
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
      const valid = saved.filter(
        (p: any) => p && typeof p.id === 'string' && typeof p.title === 'string' && Array.isArray(p.keywords) && p.keywords.length > 0
      );
      // Merge defaults if missing
      const ids = new Set(valid.map((p: any) => p.id));
      const combined = [...valid];
      for (const def of DEFAULT_PROJECTS) {
        if (!ids.has(def.id)) combined.push(def);
      }
      return combined;
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
