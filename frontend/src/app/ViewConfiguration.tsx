import { Button, Input, Select } from './ui';
import { useState } from "react";

type ViewLayout = "LIST" | "TABLE" | "BOARD";
type ViewScope = "ROOTS" | "ALL";

type ViewConfigurationProps = {
  currentLayout: ViewLayout;
  currentScope: ViewScope;
  currentFilters: Record<string, unknown>;
  currentOrderBy: string;
  currentOrderDirection: string;
  onLayoutChange: (layout: ViewLayout) => void;
  onScopeChange: (scope: ViewScope) => void;
  onFiltersChange: (filters: Record<string, unknown>) => void;
  onOrderByChange: (orderBy: string) => void;
  onOrderDirectionChange: (direction: string) => void;
};

export function ViewConfiguration({
  currentLayout,
  currentScope,
  currentFilters,
  currentOrderBy,
  currentOrderDirection,
  onLayoutChange,
  onScopeChange,
  onFiltersChange,
  onOrderByChange,
  onOrderDirectionChange,
}: ViewConfigurationProps) {
  const [filterValue, setFilterValue] = useState(
    typeof currentFilters.search === "string" ? currentFilters.search : ""
  );
  const [category, setCategory] = useState(String(currentFilters.categoria ?? ''));
  const [minLevel, setMinLevel] = useState(String(currentFilters.minLevel ?? ''));
  const [maxLevel, setMaxLevel] = useState(String(currentFilters.maxLevel ?? ''));
  const [favorite, setFavorite] = useState(currentFilters.isFavorite === true);
  const [section, setSection] = useState(String(currentFilters.section ?? ''));
  const [filterError, setFilterError] = useState('');
  const applyFilters = () => {
    if (Number(minLevel || 0) > Number(maxLevel || 5)) { setFilterError('Nível mínimo deve ser menor ou igual ao máximo.'); return; }
    setFilterError('');
    onFiltersChange({ section: section || undefined, search: filterValue.trim(), categoria: category.trim(), minLevel: minLevel === '' ? undefined : Number(minLevel), maxLevel: maxLevel === '' ? undefined : Number(maxLevel), isFavorite: favorite });
  };


  return (
    <div className="view-configuration">
      <div className="view-controls">
        <label>Área<Select value={section} onChange={event => setSection(event.target.value)}><option value="">Todas as áreas</option><option value="LINGUAGENS">Idiomas</option><option value="FACULDADE">Faculdade</option><option value="PROJETOS">Projetos</option><option value="OUTROS">Outros</option></Select></label>
        <label>
          Visualização:
          <Select value={currentLayout} onChange={(e) => onLayoutChange(e.target.value as ViewLayout)}>
            <option value="LIST">Lista</option>
            <option value="TABLE">Tabela</option>
            <option value="BOARD">Quadro</option>
          </Select>
        </label>
        <label>
          Escopo:
          <Select value={currentScope} onChange={(e) => onScopeChange(e.target.value as ViewScope)}>
            <option value="ROOTS">Páginas principais</option>
            <option value="ALL">Todas as páginas</option>
          </Select>
        </label>
        <label>
          Ordenar por:
          <Select value={currentOrderBy} onChange={(e) => onOrderByChange(e.target.value)}>
            <option value="updatedAt">Atualização</option>
            <option value="nome">Nome</option>
            <option value="nivelEntendimento">Nível</option>
            <option value="sortOrder">Ordem manual</option>
            <option value="lastOpenedAt">Última abertura</option>
          </Select>
        </label>
        <label>
          Direção:
          <Select value={currentOrderDirection} onChange={(e) => onOrderDirectionChange(e.target.value)}>
            <option value="desc">Descendente</option>
            <option value="asc">Ascendente</option>
          </Select>
        </label>
        <label>
          Buscar:
          <Input
            type="text"
            value={filterValue}
            onChange={(event) => setFilterValue(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) applyFilters(); }}
            placeholder="Filtrar por título ou categoria..."
            maxLength={255}
          />
        </label>
        <label>Categoria exata<Input value={category} maxLength={255} onChange={event => setCategory(event.target.value)} placeholder="Todas as categorias" /></label>
        <label>Nível mínimo<Select value={minLevel} onChange={event => setMinLevel(event.target.value)}><option value="">Qualquer</option>{[0,1,2,3,4,5].map(level => <option key={level} value={level}>{level}</option>)}</Select></label>
        <label>Nível máximo<Select value={maxLevel} onChange={event => setMaxLevel(event.target.value)}><option value="">Qualquer</option>{[0,1,2,3,4,5].map(level => <option key={level} value={level}>{level}</option>)}</Select></label>
        <label><span>Favoritos</span><input type="checkbox" checked={favorite} onChange={event => setFavorite(event.target.checked)} />Somente favoritos</label>
        <Button onClick={applyFilters}>Aplicar filtros</Button>
        {filterError && <p role="alert">{filterError}</p>}

      </div>

    </div>
  );
}
