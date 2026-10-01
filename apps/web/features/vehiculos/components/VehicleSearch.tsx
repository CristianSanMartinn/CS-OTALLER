import { SearchBox } from "@/components/ui/primitives";
export function VehicleSearch(props: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <SearchBox {...props} placeholder="Buscar patente, marca o modelo..." />
  );
}
