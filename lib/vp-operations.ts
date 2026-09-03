export type GatePass = { id: string; studentId: string; studentName: string; divisionCode: string; parentName: string; reason: string; departureDate: string; departureTime: string; createdAt: string; qrToken?: string; status?: string }
export type Incident = { id: string; studentId: string; studentName: string; divisionCode: string; details: string; location: string; witnesses: string; degree: string; action: string; createdAt: string }

const GATE_PASSES_KEY = 'thabat-gate-passes'
const INCIDENTS_KEY = 'thabat-incidents'
const read = <T>(key: string): T[] => {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[] } catch { return [] }
}
const write = <T>(key: string, value: T[]) => { if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value)) }
const recordAudit = (action: string, targetType: string, targetId: string, targetName: string, studentId: string, details: object) => {
  if (typeof window === 'undefined') return
  try {
    const session = JSON.parse(localStorage.getItem('thabat-session') ?? 'null') as { id?: string } | null
    void fetch('/api/audit-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: session?.id, action, targetType, targetId, targetName, studentId, details: JSON.stringify(details) }) })
  } catch { /* Ignore malformed browser session data. */ }
}
export const getGatePasses = () => read<GatePass>(GATE_PASSES_KEY)
export const saveGatePass = (pass: GatePass) => { write(GATE_PASSES_KEY, [pass, ...getGatePasses()]); recordAudit('GATE_PASS_ISSUED', 'GatePass', pass.id, pass.studentName, pass.studentId, { divisionCode: pass.divisionCode, reason: pass.reason }) }
export const getIncidents = () => read<Incident>(INCIDENTS_KEY)
export const saveIncident = (incident: Incident) => { write(INCIDENTS_KEY, [incident, ...getIncidents()]); recordAudit('INCIDENT_RECORDED', 'Incident', incident.id, incident.studentName, incident.studentId, { divisionCode: incident.divisionCode, degree: incident.degree, action: incident.action }) }
