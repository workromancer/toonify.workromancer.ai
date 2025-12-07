import { create } from 'zustand';
import api from '@/lib/api';

interface Workspace {
    id: string;
    name: string;
    credits: number;
    tier: string;
    role: string;
}

interface WorkspaceState {
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    fetchWorkspaces: () => Promise<void>;
    setCurrentWorkspace: (workspace: Workspace) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
    workspaces: [],
    currentWorkspace: null,
    fetchWorkspaces: async () => {
        try {
            const res = await api.get('/workspaces/');
            const workspaces = res.data;
            set({ workspaces });

            // Set default workspace if none selected
            if (workspaces.length > 0 && !get().currentWorkspace) {
                set({ currentWorkspace: workspaces[0] });
            }
        } catch (err) {
            console.error('Failed to fetch workspaces', err);
        }
    },
    setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
}));
