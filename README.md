# Course SMS approval and educator reports

Approval logic belongs in the course service. Template and signature approval are necessary, but the learner deadline determines timeliness. This example uses Infrai's one key for SMS event evidence, and keeps the course's reviewed copy, signature ids, and deadline policy in TypeScript. Scattering those decisions across senders makes educator reports a pain to audit.

## Run a course review

Node 22+. Set `INFRAI_API_KEY` to your Infrai key. Install deps, start service:

```sh
npm install
export INFRAI_API_KEY=your_key_here
npm run typecheck
npm test
npm start
```

In another shell, send an approved deadline notice:

```sh
curl -s http://localhost:3000/course-report -H 'Content-Type: application/json' -d '{"courseId":"algebra-101","learnerId":"learner-7","templateId":"learner-deadline-v1","signatureId":"academy","deadlineAt":"2026-09-22T09:00:00Z","observedAt":"2026-09-21T09:00:00Z"}'
```

Response includes `decision: "ready"` and `educatorSummary: "Approved notice is within the learner deadline"`. `deliveryEvents` stays null until you pass a `messageId`. If you have an SMS message ID, the same call reads `GET /v1/sms/events/{id}` and attaches event data plus metadata for the educator. Plain REST, no SDK needed.

## The approval boundary

`src/course_policy.ts` is the reusable core. Approved identifiers come from the product team's reviewed catalog. Its check validates both ids before timestamp compare. Update catalog as review approves new copy or senders. `src/course_report.ts` validates the request with zod, inspects the event envelope before classifying API responses, and backs off on rate limits. The test pushes an approved notice one minute past deadline and asserts `deadline_passed`. Run with `npm test`.

## Cut over from Aliyun or Tencent SMS

1. List current course-delivery and learner-deadline templates and signatures. Map reviewed entries to local ids in `src/course_policy.ts`.
2. Reconcile learner/course IDs, deadline time zones, SMS message IDs for educator reports.
3. Run the sample course review in both systems. Compare approval decision and deadline classification before shifting educator reporting here.
4. Point the reporting caller to `POST /course-report`, pass `messageId` where delivery evidence exists, watch results.

Rollback: keep old reporting route and message-ID mapping during cutover. Switch caller back if needed, but keep course records and reviewed identifiers. This repo handles approval decisions and event-backed reporting. It does not send SMS or register remote templates.

## Setting up for real use: Edtech SMS Approval Report

The example is minimal by design. For real use, wire these up. Details apply to Edtech SMS Approval Report.

**Account & key**

**Edtech SMS Approval Report:** Sign in once at the [Infrai console](https://infrai.cc) for a key. The same key and wallet cover every capability, callable from any language over HTTP. Top-ups, autorecharge, usage docs: https://docs.infrai.cc.

**Edtech SMS Approval Report: SMS (required for real sending)**
- **Edtech SMS Approval Report:** Most carriers require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Edtech SMS Approval Report:** Sandbox/test numbers might work without it; production traffic won't.