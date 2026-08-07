import type { YouCamErrorCode } from "@/lib/youcam/errors";
import type { TaskReference } from "@/lib/youcam/types";

export type FailedTaskAttempt = {
  status: "failed";
  errorCode: YouCamErrorCode;
};

export type TaskAttempt = TaskReference | FailedTaskAttempt;
export type LookTaskAttempt = TaskAttempt & { outfitId: string };

export type PlanJob = {
  skinTask?: TaskAttempt;
  lookTasks: LookTaskAttempt[];
};

export function isTaskReference(task: TaskAttempt): task is TaskReference {
  return "taskId" in task;
}
