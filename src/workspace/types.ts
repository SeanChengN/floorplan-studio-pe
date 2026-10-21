import type { Document } from '../picture/model';
import type { Opening, Project as LegacyProject, Wall } from '../model/schema';

export interface Drawing {
  width: number;
  height: number;
  walls: Wall[];
  openings: Opening[];
  bindings: Record<string, string>;
  grid: number;
  snap: boolean;
  angles: boolean;
  showGrid: boolean;
}
export interface FloorDocument { id: string; name: string; document: Document }
export interface Workspace {
  format: 'fps-studio-project'; version: 3; id: string; name: string;
  createdAt: number; updatedAt: number; activeFloorId: string;
  floors: FloorDocument[];
  legacy?: LegacyProject;
  exportWarnings?: string[];
  archived?: boolean;
}
export type Tool = 'select' | 'marker' | 'room' | 'wall' | 'door' | 'window';
