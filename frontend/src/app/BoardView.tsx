import type { Area } from "./page";
import { Button } from './ui';
import { BoardStatus, FavoriteButton, type UpdateStudy, type ReloadStudy } from './StudyProperties';

type BoardViewProps = {
  areas: Area[];
  onEdit: (area: Area) => void;
  onUpdate: UpdateStudy;
  onReload: ReloadStudy;
};

const subSections = ["ESTUDANDO", "ESTUDADO"] as const;

export function BoardView({ areas, onEdit, onUpdate, onReload }: BoardViewProps) {
  return (
    <div><p>Quadro da página atual. Os filtros e a paginação são compartilhados com a lista e a tabela.</p><div className="board-view">
      {subSections.map((subSection) => {
        const columnAreas = areas.filter((area) => area.subSection === subSection);
        return (
          <div key={subSection} className="board-column">
            <h3>{subSection === "ESTUDANDO" ? "Estudando" : "Estudado"} ({columnAreas.length})</h3>
            <div className="board-cards">
              {columnAreas.map((area) => (
                <article key={area.id} className="board-card" data-page-id={area.id}>
                  <span className="board-icon">{area.icone || "✦"}</span>
                  <h4>{area.nome}</h4>
                  <p>{area.categoria}</p>
                  <small>Nível {area.nivelEntendimento}/5</small>
                  <div><Button onClick={() => onEdit(area)}>Abrir {area.nome}</Button><FavoriteButton area={area} onUpdate={onUpdate} /></div>
                  <BoardStatus area={area} onUpdate={onUpdate} onReload={onReload} />
                </article>
              ))}
              {columnAreas.length === 0 && (
                <p className="board-empty">Nenhum item</p>
              )}
            </div>
          </div>
        );
      })}
    </div></div>
  );
}
