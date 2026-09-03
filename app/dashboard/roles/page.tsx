import { redirect } from 'next/navigation'

export default function LegacyRolesRedirect() {
  redirect('/dashboard/settings/roles')
}
