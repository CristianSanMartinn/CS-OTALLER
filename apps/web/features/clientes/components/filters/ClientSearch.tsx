import { SearchBox } from "@/components/ui/primitives";
export function ClientSearch(props: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <SearchBox {...props} placeholder="Buscar por nombre, RUT o correo..." />
  );
}
