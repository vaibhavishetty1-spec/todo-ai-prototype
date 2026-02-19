
export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  subject: string;
  deadline: string;
  priority: Priority;
  status: TaskStatus;
  aiReasoning?: string;
  estimatedHours?: number;
  timeSpentSeconds: number;
  isTimerRunning: boolean;
}

export interface AIPrioritizationResult {
  taskId: string;
  suggestedPriority: Priority;
  reasoning: string;
}
