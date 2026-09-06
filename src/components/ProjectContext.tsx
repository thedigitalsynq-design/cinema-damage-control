import { createContext, useContext, useEffect, useState } from 'react';

export interface TrackedProject {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
}

const DEFAULT_PROJECTS: TrackedProject[] = [
  { id: 'toxic', title: 'TOXIC', subtitle: 'Yash · Geetu Mohandas', keywords: ['toxic', 'yash'] },
];

const PROJECTS_KEY = 'cdc-projects';
const ACTIVE_KEY = 'cdc-active-project';

interface ProjectContextValue {
  projects: TrackedProject[];
  project: TrackedProject;
  setActiveId: (id: string) => void;
  addProject: (title: string, keywords: string) => TrackedProject;
  removeProject: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  projects: DEFAULT_PROJECTS,
  project: DEFAULT_PROJECTS[0],
  setActiveId: () => {},
  addProject: () => DEFAULT_PROJECTS[0],
  removeProject: () => {},
});

// eslint-disable-next-line react/only-export-components -- custom hook co-located with its provider by design
export function useProject(): ProjectContextValue {
  return useContext(ProjectContext);
}

function loadProjects(): TrackedProject[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PROJECTS_KEY) || '[]');
    if (Array.isArray(saved)) {
      const valid = saved.filter(
        (p: any) => p && typeof p.id === 'string' && typeof p.title === 'string' && Array.isArray(p.keywords) && p.keywords.length > 0
      );
      if (valid.length > 0) return valid;
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

  return (
    <ProjectContext.Provider value={{ projects, project, setActiveId, addProject, removeProject }}>
      {children}
    </ProjectContext.Provider>
  );
}
