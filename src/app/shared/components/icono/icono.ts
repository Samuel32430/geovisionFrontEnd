import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icono',
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="paths[nombre()] || paths['grid']" />
  </svg>`,
  styles: [
    ':host{display:inline-flex;width:20px;height:20px;flex-shrink:0}svg{width:100%;height:100%}',
  ],
})
export class Icono {
  readonly nombre = input('grid');
  protected readonly paths: Record<string, string> = {
    info: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 11v6 M12 7h.01',
    download: 'M12 3v12 M8 11l4 4 4-4 M4 17v4h16v-4',
    edit: 'M15 4l5 5 M4 16L17 3l4 4L8 20H4z',
    'user-plus': 'M13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M3 21v-3a6 6 0 0 1 12 0 M19 10v8 M15 14h8',
    'user-minus': 'M13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M3 21v-3a6 6 0 0 1 12 0 M16 14h7',
    check: 'M5 12l4 4L19 6',
    grid: 'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z',
    eye: 'M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M5 21v-2a7 7 0 0 1 14 0v2z',
    users:
      'M14 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M4 21v-3a6 6 0 0 1 12 0v3z M17 4a3 3 0 0 1 0 6 M19 14a5 5 0 0 1 3 5v2',
    cart: 'M2 3h3l3 12h11l3-9H6 M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
    lab: 'M9 3h6 M10 3v7L3 20h18l-7-10V3 M7 15h10',
    box: 'M12 2l9 5v10l-9 5-9-5V7z M3 7l9 5 9-5 M12 12v10 M7 5l10 5',
    settings:
      'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
    shield: 'M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6z M8 12l3 3 6-7',
    logout: 'M10 3H4v18h6 M9 12h13 M18 8l4 4-4 4',
    search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M15 15l6 6',
    bell: 'M5 17h14l-2-4V8a5 5 0 0 0-10 0v5z M10 21h4',
    plus: 'M12 5v14 M5 12h14',
    document: 'M14 2H5v20h14V7z M14 2v6h5 M8 12h8 M8 16h5',
    money:
      'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9 M12 6v12',
    bag: 'M5 8h14l1 13H4z M9 8V6a3 3 0 0 1 6 0v2',
    warning: 'M12 3L2 21h20z M12 9v5 M12 17v1',
    calendar: 'M4 5h16v16H4z M8 2v6 M16 2v6 M4 11h16 M8 15h3',
    chevron: 'M9 5l7 7-7 7',
    menu: 'M3 6h18 M3 12h18 M3 18h18',
  };
}
