export interface AuthUser { id: string; workshopId: string; name: string; email: string; role: 'ADMIN' | 'WORKER'; active: boolean; rut: string; phone: string; specialty: string; avatarUrl?: string; theme?: "light" | "dark"; }
export interface AuthRequest { user: AuthUser; headers: { authorization?: string }; }
export function mapUser(row: Record<string, any>): AuthUser {
  return { id:row.id, workshopId:row.workshop_id, name:[row.first_name,row.last_name].filter(Boolean).join(' '), email:row.email, role:row.role === 'ADMIN' ? 'ADMIN' : 'WORKER', active:row.active, rut:row.rut ?? '',phone:row.phone ?? '',specialty:row.specialty ?? '',avatarUrl:row.profile_photo_url ?? '',theme:row.theme === 'dark' ? 'dark' : 'light' };
}
