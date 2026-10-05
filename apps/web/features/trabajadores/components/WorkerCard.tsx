import { User } from "@/features/shared/types/domain";
import { Avatar } from "@/components/ui/primitives";
import { WorkerStatusBadge } from "./WorkerStatusBadge";
import { WorkerLastSeen } from "./WorkerLastSeen";
import { usePresence } from "../hooks/usePresence";
export function WorkerCard({ worker }: { worker: User }) {
  const presence = usePresence().forWorker(worker);
  return (
    <div className="worker-card">
      <Avatar name={worker.name} src={worker.avatarUrl} />
      <h3>{worker.name}</h3>
      <p>{worker.specialty}</p>
      <WorkerStatusBadge status={presence.status} />
      <WorkerLastSeen
        lastSeenAt={presence.lastSeenAt}
        connected={presence.status === "ONLINE"}
      />
    </div>
  );
}
