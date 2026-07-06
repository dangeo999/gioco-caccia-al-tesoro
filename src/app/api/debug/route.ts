// Endpoint diagnostico: raccoglie la telemetria 3D inviata da DebugTelemetry
// (numero di texture/geometrie in GPU, FPS, perdita del contesto WebGL...).
// POST → registra un evento; GET → restituisce gli ultimi eventi raccolti.
// Serve solo in sviluppo per capire i crash su iPad/iPhone: i numeri finiscono
// nei log del server, così chi sviluppa li legge in diretta da un altro PC.

export const dynamic = "force-dynamic";

type Entry = Record<string, unknown>;

const MAX = 300;
// Stato a livello di modulo: sopravvive tra le richieste nel processo del server.
const buffer: Entry[] = [];

export async function POST(request: Request) {
  let data: Entry = {};
  try {
    data = await request.json();
  } catch {
    data = { event: "parse_error" };
  }
  buffer.push(data);
  if (buffer.length > MAX) buffer.shift();

  // Riga singola facile da filtrare nei log: [POFI-DEBUG] {...}
  console.log("[POFI-DEBUG]", JSON.stringify(data));

  return Response.json({ ok: true });
}

export async function GET() {
  return Response.json({ count: buffer.length, entries: buffer });
}

export async function DELETE() {
  buffer.length = 0;
  return Response.json({ ok: true, cleared: true });
}
