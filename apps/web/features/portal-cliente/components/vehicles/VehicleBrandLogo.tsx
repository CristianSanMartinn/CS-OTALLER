import Image from "next/image";
import { CarFront } from "lucide-react";
const brands = new Set([
  "toyota",
  "mazda",
  "chevrolet",
  "hyundai",
  "kia",
  "peugeot",
  "ford",
  "nissan",
  "bmw",
  "volkswagen",
  "renault",
  "suzuki",
  "honda",
]);
export function VehicleBrandLogo({ brand }: { brand: string }) {
  const key = brand.toLowerCase().replace(/[^a-z]/g, "");
  return (
    <span className="public-brand-emblem">
      {brands.has(key) ? (
        <Image
          src={"/brands/" + key + ".svg"}
          width={38}
          height={38}
          alt={"Logo de " + brand}
        />
      ) : (
        <CarFront size={29} aria-label={brand} />
      )}
    </span>
  );
}
