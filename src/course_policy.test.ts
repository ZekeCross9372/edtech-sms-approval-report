import assert from "node:assert/strict";
import test from "node:test";
import { assessCourseNotice, reportRequest } from "./course_policy.ts";

test("a deadline overrides an approved course notice", () => {
  const input = reportRequest.parse({
    courseId: "algebra-101", learnerId: "learner-7",
    templateId: "learner-deadline-v1", signatureId: "academy",
    deadlineAt: "2026-09-21T09:00:00Z", observedAt: "2026-09-21T09:01:00Z"
  });
  assert.equal(assessCourseNotice(input).decision, "deadline_passed");
});

test("an unapproved signature cannot be marked ready", () => {
  const input = reportRequest.parse({
    courseId: "algebra-101", learnerId: "learner-7",
    templateId: "course-delivery-v1", signatureId: "unknown",
    deadlineAt: "2026-09-22T09:00:00Z", observedAt: "2026-09-21T09:00:00Z"
  });
  assert.equal(assessCourseNotice(input).decision, "needs_approval");
});
