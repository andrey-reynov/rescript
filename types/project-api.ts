import type { ProjectData, ProjectDocument, ProjectSummary } from "../electron/project-files";

export interface DesktopProjects {
  folder(): Promise<string>;
  chooseFolder(): Promise<string | null>;
  list(): Promise<ProjectSummary[]>;
  create(data: ProjectData, file: File): Promise<ProjectDocument>;
  save(id: string, data: ProjectData): Promise<ProjectDocument>;
  read(id: string): Promise<ProjectDocument & {filePath:string}>;
  media(id: string): Promise<string>;
  open(): Promise<string | null>;
  saveAs(id: string, data: ProjectData): Promise<ProjectDocument | null>;
  relink(id: string): Promise<ProjectDocument | null>;
  snapshots(id: string): Promise<string[]>;
  restore(id: string, snapshot: string): Promise<ProjectDocument>;
  show(id: string): Promise<void>;
}
