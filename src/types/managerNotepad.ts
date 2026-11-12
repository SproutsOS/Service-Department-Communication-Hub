export type TaskPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface NotepadTask {
  id: string;
  title: string;
  completed: boolean;
  priority: TaskPriority;
  dueDate?: string;
  createdAt: string;
}

export interface NotepadSnippet {
  id: string;
  title: string;
  content: string;
  category?: 'SUPPLIER' | 'WARRANTY' | 'PROCEDURE' | 'PHONE' | 'GENERAL';
  createdAt: string;
}

export interface ManagerNotepadData {
  tasks: NotepadTask[];
  scratchpad: string;
  snippets: NotepadSnippet[];
  updatedAt: string;
}
