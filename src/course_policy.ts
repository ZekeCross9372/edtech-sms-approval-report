import { z } from "zod";

export const reportRequest = z.object({
  courseId: z.string().min(1),
  learnerId: z.string().min(1),
  templateId: z.string().min(1),
  signatureId: z.string().min(1),
  deadlineAt: z.string().datetime({ offset: true }),
  observedAt: z.string().datetime({ offset: true }),
  messageId: z.string().min(1).optional()
}).strict();

export type ReportRequest = z.infer<typeof reportRequest>;

// These are the product's reviewed copy and sender identities, not remote resources.
export const approvedTemplates = new Set(["course-delivery-v1", "learner-deadline-v1"]);
export const approvedSignatures = new Set(["academy"]);

export function assessCourseNotice(input: ReportRequest) {
  const approved = approvedTemplates.has(input.templateId) && approvedSignatures.has(input.signatureId);
  const beforeDeadline = Date.parse(input.observedAt) <= Date.parse(input.deadlineAt);
  return {
    courseId: input.courseId,
    learnerId: input.learnerId,
    decision: !approved ? "needs_approval" : beforeDeadline ? "ready" : "deadline_passed",
    educatorSummary: !approved ? "Review the template and signature" : beforeDeadline
      ? "Approved notice is within the learner deadline" : "Learner deadline has passed"
  } as const;
}
