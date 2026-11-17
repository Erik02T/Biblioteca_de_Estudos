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
    <div className="table-scroll" role="region" aria-label="Tabela de páginas" tabIndex={0}><table className="table-view">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Categoria</th>
          <th>Nível</th>
          <th>Status</th>
          <th>Favorito</th>
          <th>Atualizado</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {areas.map((area) => (
          <PropertyRow key={area.id} area={area} onEdit={onEdit} onUpdate={onUpdate} onReload={onReload} />
        ))}
      </tbody>
    </table></div>
  );
}
