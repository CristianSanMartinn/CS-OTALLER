import { Panel } from "@/components/ui/primitives";
import { ImageUploader } from "@/components/ImageUploader/ImageUploader";
import { OrderSectionProps } from "../types/editor.types";
import { useAuth } from "@/features/auth/hooks/useAuth";
export function PhotoEvidenceSection({ order, onChange }: OrderSectionProps) {
  const { user } = useAuth();
  return (
    <Panel
      title="06 · Evidencia fotográfica"
      subtitle="Antes, durante y después de la reparación"
    >
      <div className="panel-padding">
        <ImageUploader
          photos={order.photos}
          onChange={(photos) => onChange({ photos })}
          userId={user!.id}
        />
      </div>
    </Panel>
  );
}
