import { User } from "@/features/shared/types/domain";
export type ProfileInput = Pick<
  User,
  "name" | "email" | "phone" | "specialty"
> & { avatarUrl: string };
