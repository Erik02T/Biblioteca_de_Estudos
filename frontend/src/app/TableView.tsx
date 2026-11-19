import type { Area } from "./page";
import { PropertyRow, type UpdateStudy, type ReloadStudy } from './StudyProperties';

type TableViewProps = {
  areas: Area[];
  onEdit: (area: Area) => void;
  onUpdate: UpdateStudy;
  onReload: ReloadStudy;
};

export function TableView({ areas, onEdit, onUpdate, onReload }: TableViewProps) {
  return (
    <div className="table-scroll" role="region" aria-label="Tabela de páginas" tabIndex={0}><table className="table-view" role="table">
      <thead role="rowgroup">
        <tr role="row">
          {["Nome", "Categoria", "Nível", "Status", "Favorito", "Atualizado", "Ações"].map(label =>
            <th key={label} scope="col" role="columnheader">{label}</th>)}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {areas.map((area) => (
          <PropertyRow key={area.id} area={area} onEdit={onEdit} onUpdate={onUpdate} onReload={onReload} />
        ))}
      </tbody>
    </table></div>
  );
}
