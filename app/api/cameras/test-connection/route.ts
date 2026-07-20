import { NextResponse } from "next/server";
import net from "node:net";
import { getSessionFromRequest } from "@/lib/auth/session";

function parseHostPort(rtspUrl: string): { host: string; port: number } | null {
  try {
    const url = new URL(rtspUrl);
    const host = url.hostname;
    const port = url.port ? Number(url.port) : 554;
    if (!host) return null;
    return { host, port };
  } catch {
    return null;
  }
}

function testTcpConnection(host: string, port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  let body: { rtspUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const rtspUrl = String(body.rtspUrl || "").trim();
  if (!rtspUrl) {
    return NextResponse.json({ error: "RTSP adresi gerekli." }, { status: 400 });
  }

  const parsed = parseHostPort(rtspUrl);
  if (!parsed) {
    return NextResponse.json({ reachable: false, reason: "invalid_url" });
  }

  const reachable = await testTcpConnection(parsed.host, parsed.port);
  return NextResponse.json({ reachable, host: parsed.host, port: parsed.port });
}
