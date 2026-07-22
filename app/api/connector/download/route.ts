import { NextResponse } from "next/server";

// Branded, direct-download endpoint for the Luro Connector installer.
// Redirects to the Blob-hosted file so the customer only ever sees a
// luro-ai.com URL and the download starts immediately (the .exe is served
// with Content-Disposition: attachment, so browsers download it).
const BLOB_URL =
  process.env.CONNECTOR_BLOB_URL ||
  "https://sgs0xbofzp2f9rhk.public.blob.vercel-storage.com/LuroConnector.exe";

export function GET() {
  return NextResponse.redirect(BLOB_URL, 302);
}
