import type { SxProps, Theme } from '@mui/material/styles'
import type { GridLocaleText } from '@mui/x-data-grid'

export const ptBRLocaleText: Partial<GridLocaleText> = {
  noRowsLabel: 'Nenhuma linha',
  noResultsOverlayLabel: 'Nenhum resultado encontrado.',
  footerRowSelected: (count) =>
    count !== 1 ? `${count} linhas selecionadas` : `${count} linha selecionada`,
  footerTotalRows: 'Total de linhas:',
  footerTotalVisibleRows: (visibleCount, totalCount) =>
    `${visibleCount} de ${totalCount}`,
  columnMenuLabel: 'Menu',
  columnMenuShowColumns: 'Mostrar colunas',
  columnMenuHideColumn: 'Ocultar',
  columnMenuUnsort: 'Remover ordenação',
  columnMenuSortAsc: 'Ordenar crescente',
  columnMenuSortDesc: 'Ordenar decrescente',
  toolbarColumns: 'Colunas',
  toolbarFilters: 'Filtros',
  toolbarExport: 'Exportar',
  toolbarExportLabel: 'Exportar',
  toolbarExportCSV: 'Baixar como CSV',
  toolbarExportPrint: 'Imprimir',
}

export const gridSx: SxProps<Theme> = {
  border: 'none',
  fontFamily: "'Inter', sans-serif",
  '& .MuiDataGrid-columnHeaders': {
    background: 'hsl(var(--surface-2))',
    borderBottom: '1px solid hsl(var(--border))',
    color: 'hsl(var(--accent))',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  '& .MuiDataGrid-columnHeaderTitleContainer': {
    justifyContent: 'center',
  },
  '& .MuiDataGrid-columnSeparator': { display: 'none' },
  '& .MuiDataGrid-row': {
    borderBottom: '1px solid hsl(var(--border))',
    transition: 'background 0.15s ease',
  },
  '& .MuiDataGrid-row:hover': {
    background: 'hsl(var(--surface-2)) !important',
  },
  '& .MuiDataGrid-cell': {
    color: 'hsl(var(--text-primary))',
    borderBottom: 'none',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
    outline: 'none',
  },
  '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
    outline: 'none',
  },
  '& .MuiDataGrid-footerContainer': {
    background: 'hsl(var(--surface-2))',
    borderTop: '1px solid hsl(var(--border))',
  },
  '& .MuiTablePagination-root': {
    color: 'hsl(var(--text-secondary))',
    fontSize: 13,
  },
  '& .MuiTablePagination-selectIcon': {
    color: 'hsl(var(--text-secondary))',
  },
  '& .MuiIconButton-root': {
    color: 'hsl(var(--text-secondary))',
  },
  '& .MuiIconButton-root.Mui-disabled': {
    color: 'hsl(var(--text-secondary) / 0.4)',
  },
  '& .MuiDataGrid-overlay': {
    color: 'hsl(var(--text-secondary))',
    background: 'transparent',
  },
  '& .MuiDataGrid-selectedRowCount': {
    color: 'hsl(var(--text-secondary))',
  },
  '& .MuiCheckbox-root': {
    color: 'hsl(var(--text-secondary))',
  },
}
