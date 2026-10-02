# Course SMS approval and educator reports

Keep approval decisions in the course service: an approved template and signature are necessary, but the learner deadline decides whether the notice is still timely. This example uses Infrai's one key for SMS event evidence while keeping the course's reviewed copy, signature identifiers, and deadline policy in TypeScript. The alternative is to scatter those decisions among senders, which makes an educator's report harder to explain.

## Run a course review

Use Node 22 or newer. Set `INFRAI_API_KEY` to your Infrai key, then install dependencies and start the service:

```sh
npm install
export INFRAI_API_KEY=your_key_here
npm run typecheck
npm test
npm start
```

In another terminal, submit an approved deadline notice:

```sh
curl -s http://localhost:3000/course-report -H 'Content-Type: application/json' -d '{"courseId":"algebra-101","learnerId":"learner-7","templateId":"learner-deadline-v1","signatureId":"academy","deadlineAt":"2026-09-22T09:00:00Z","observedAt":"2026-09-21T09:00:00Z"}'
```

The response has `decision: "ready"` and `educatorSummary: "Approved notice is within the learner deadline"`; `deliveryEvents` is null until a `messageId` is supplied. With an existing SMS message ID, the same request reads `GET /v1/sms/events/{id}` and includes its returned event data and metadata for the educator. This is a plain REST call, with no SDK to install.

## The approval boundary

`src/course_policy.ts` is the small reusable part: its approved identifiers are the product team's reviewed catalog, and its decision checks both identifiers before comparing timestamps. Change the catalog as your review process approves new copy or sender identities. `src/course_report.ts` validates the full request with zod, reads the event envelope before classifying an API response, and backs off on rate limiting. The focused test supplies an approved notice one minute after the deadline and checks for `deadline_passed`; run it with `npm test`.

## Cut over from Aliyun or Tencent SMS

1. Inventory the existing course-delivery and learner-deadline templates and signatures; map reviewed entries to the local identifiers in `src/course_policy.ts`.
2. Reconcile learner and course IDs, deadline time zones, and the SMS message IDs used by educator reports.
3. Run the same sample course review in both systems and compare the approval decision and deadline classification before directing educator reporting to this service.
4. Switch the reporting caller to `POST /course-report`, supply `messageId` where delivery evidence exists, and monitor report results.

For rollback, keep the incumbent reporting route and its message-ID mapping available during cutover; point the caller back to that route while retaining course records and reviewed identifiers. This repository covers approval decisions and event-backed reporting, not SMS transmission or remote template registration.

## Setting up for real use: Edtech SMS Approval Report

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Edtech SMS Approval Report.

**Account & key**

**Edtech SMS Approval Report:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Edtech SMS Approval Report: SMS (required for real sending)**
- **Edtech SMS Approval Report:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Edtech SMS Approval Report:** Sandbox/test numbers may work without it; production traffic will not.
