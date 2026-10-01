import Link from "next/link";
import { CarFront, ArrowUpRight } from "lucide-react";
import { Vehicle } from "@/features/shared/types/domain";
import { km } from "@/utils/format";
export function VehicleCard({ vehicle: v }: { vehicle: Vehicle }) {
  return (
    <Link className="vehicle-card" href={"/vehiculos/" + v.id}>
      <div className="vehicle-card-top">
        <CarFront size={27} />
        <ArrowUpRight size={17} />
      </div>
      <span className="plate">{v.plate}</span>
      <h3>
        {v.brand} {v.model}
      </h3>
      <p>
        {v.version} · {v.year}
      </p>
      <small>
        {km(v.mileage)} · {v.color}
      </small>
    </Link>
  );
}
