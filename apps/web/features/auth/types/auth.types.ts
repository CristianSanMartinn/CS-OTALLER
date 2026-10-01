export type { User, Role } from "@/features/shared/types/domain";
export interface LoginCredentials {
  email: string;
  password: string;
  remember: boolean;
}
