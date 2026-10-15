/** Контуры иконок интерфейса: сетка 16×16, рисуются обводкой (цвет и толщину задаёт CSS компонента UiIcon). */

/** Пути SVG по имени иконки; для составных иконок — несколько путей. */
export const ICON_PATHS = {
  'chevron-down': ['M4 6l4 4 4-4'],
  sun: [
    'M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    'M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1',
  ],
  moon: ['M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z'],
  flex: ['M2 3h3v10H2zM6.5 3h3v10h-3zM11 3h3v10h-3z'],
  grid: ['M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z'],
  link: ['M6.5 9.5l3-3', 'M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1', 'M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1'],
  undo: ['M6 3L3 6l3 3', 'M3 6h6a4 4 0 0 1 0 8H6'],
  redo: ['M10 3l3 3-3 3', 'M13 6H7a4 4 0 0 0 0 8h3'],
  minus: ['M3 8h10'],
  plus: ['M3 8h10M8 3v10'],
  close: ['M4 4l8 8M12 4l-8 8'],
  check: ['M3.5 8.5l3 3 6-6.5'],
  edit: ['M3 13v-3l7-7 3 3-7 7z', 'M9 4l3 3'],
  trash: ['M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5'],
  fit: ['M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4'],
  'arrow-right': ['M3 8h10M9 4l4 4-4 4'],
  'arrow-down': ['M8 3v10M4 9l4 4 4-4'],
  'arrow-left': ['M13 8H3M7 4L3 8l4 4'],
  'arrow-up': ['M8 13V3M4 7l4-4 4 4'],
  // Выравнивание вдоль главной оси (для row): рамка и полоски; для column иконку поворачивает CSS родителя
  'justify-start': ['M2 2h12v12H2z', 'M4.5 5v6M7.5 5v6'],
  'justify-center': ['M2 2h12v12H2z', 'M6.5 5v6M9.5 5v6'],
  'justify-end': ['M2 2h12v12H2z', 'M8.5 5v6M11.5 5v6'],
  'justify-between': ['M2 2h12v12H2z', 'M4.5 5v6M8 5v6M11.5 5v6'],
  'justify-around': ['M2 2h12v12H2z', 'M5 5v6M8 5v6M11 5v6'],
  'justify-evenly': ['M2 2h12v12H2z', 'M5.5 5v6M8 5v6M10.5 5v6'],
  // Выравнивание по поперечной оси (для row): полоски разной длины
  'align-start': ['M2 2h12v12H2z', 'M5.5 4.5v6M10.5 4.5v3.5'],
  'align-center': ['M2 2h12v12H2z', 'M5.5 5v6M10.5 6.5v3'],
  'align-end': ['M2 2h12v12H2z', 'M5.5 5.5v6M10.5 8v3.5'],
  'align-stretch': ['M2 2h12v12H2z', 'M5.5 4.5v7M10.5 4.5v7'],
  'align-baseline': ['M2 2h12v12H2z', 'M5.5 4.5v5M10.5 6.5v3'],
} as const
