import { User } from "@/features/shared/types/domain";
import { Avatar } from "@/components/ui/primitives";
import { WorkerStatus } from "./WorkerStatus";
export function WorkerCard({ worker }: { worker: User }) {
  return (
    <div className="worker-card">
      <Avatar name={worker.name} />
      <h3>{worker.name}</h3>
      <p>{worker.specialty}</p>
      <WorkerStatus active={worker.active} />
    </div>
  );
}
