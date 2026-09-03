export type TeamDefinition = {
  id: string
  label: string
  divisions: string[]
}

export type DivisionRecord = {
  id: string
  code: string
  name: string
  teamId?: string
}

export type ChatMessage = {
  role: 'user' | 'model'
  content: string
}

export const STORAGE_KEYS = {
  theme: 'thabat-theme',
  customTeams: 'thabat-custom-teams',
  activeTeam: 'thabat-active-team',
  divisions: 'thabat-divisions',
  chatHistory: 'thabat-bot-history',
} as const

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

const writeJson = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

export const TEAM_OPTIONS: TeamDefinition[] = [
  { id: 'all', label: 'جميع الفرق', divisions: [] },
]

export function getStoredCustomTeams(): TeamDefinition[] {
  const teams = readJson<unknown>(STORAGE_KEYS.customTeams, [])
  return Array.isArray(teams) ? teams as TeamDefinition[] : []
}

export function setStoredCustomTeams(teams: TeamDefinition[]): void {
  writeJson(STORAGE_KEYS.customTeams, teams)
}

export function getStoredTeamId(): string {
  if (typeof window === 'undefined') return 'all'
  return localStorage.getItem(STORAGE_KEYS.activeTeam) ?? 'all'
}

export function setStoredTeamId(teamId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.activeTeam, teamId)
  window.dispatchEvent(new CustomEvent('thabat-team-changed', { detail: teamId }))
}

export function getTeamById(teamId: string): TeamDefinition {
  return [...TEAM_OPTIONS, ...getStoredCustomTeams()].find((team) => team.id === teamId) ?? TEAM_OPTIONS[0]
}

export function getStoredDivisions(): DivisionRecord[] {
  const divisions = readJson<unknown>(STORAGE_KEYS.divisions, [])
  return Array.isArray(divisions) ? divisions as DivisionRecord[] : []
}

export function setStoredDivisions(divisions: DivisionRecord[]): void {
  writeJson(STORAGE_KEYS.divisions, divisions)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('thabat-divisions-changed'))
}

export function getActiveTeamDivisions(teamId: string): string[] {
  return getTeamById(teamId).divisions
}

export function getStoredChatHistory(): ChatMessage[] {
  const messages = readJson<unknown>(STORAGE_KEYS.chatHistory, [])
  return Array.isArray(messages) ? messages as ChatMessage[] : []
}

export function setStoredChatHistory(messages: ChatMessage[]): void {
  writeJson(STORAGE_KEYS.chatHistory, messages.slice(-50))
}
