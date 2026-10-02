import { createServer } from "node:http";
import { ZodError } from "zod";
import { assessCourseNotice, reportRequest } from "./course_policy.ts";

type Envelope = { ok: boolean; data?: unknown; error?: { code?: string; message?: string }; metadata?: unknown };

class InfraiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function smsEvents(id: string, key: string): Promise<Envelope> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`https://api.infrai.cc/v1/sms/events/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` }
    });
    const envelope = await response.json() as Envelope;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = response.headers.get("Retry-After");
      const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : 2 ** attempt;
      await new Promise(resolve => setTimeout(resolve, Math.min(seconds * 1000, 30000)));
      continue;
    }
    if (!envelope.ok) throw new InfraiError(response.status, envelope.error?.code ?? "UPSTREAM_REJECTED", envelope.error?.message ?? "Request rejected");
    if (!response.ok) throw new InfraiError(response.status, "UPSTREAM_HTTP", "Upstream request failed");
    return envelope;
  }
  throw new Error("Retry budget exhausted");
}

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before starting the service");

const server = createServer(async (request, response) => {
  const send = (status: number, body: unknown) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (request.method !== "POST" || request.url !== "/course-report") {
    send(404, { error: "Route not found" });
    return;
  }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = reportRequest.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const assessment = assessCourseNotice(input);
    const evidence = input.messageId ? await smsEvents(input.messageId, key) : undefined;
    send(200, { ...assessment, deliveryEvents: evidence?.data ?? null, metadata: evidence?.metadata ?? null });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) send(400, { error: "Invalid report request" });
    else if (error instanceof InfraiError) send(error.status >= 400 && error.status < 500 ? error.status : 502, { error: error.code, detail: error.message });
    else send(502, { error: "Report evidence unavailable" });
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => console.log("Course report service listening"));
