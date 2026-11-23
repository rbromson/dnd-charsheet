<script lang="ts" module>
  /** Набор линейных иконок (stroke). Добавляйте сюда новые по необходимости. */
  export const ICONS: Record<string, string> = {
    sheet: 'M8 3h9a2 2 0 0 1 2 2v1h-2 M8 3a2 2 0 0 0-2 2v13a3 3 0 0 0 3 3h8a2 2 0 0 0 2-2V6 M8 3a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3 M12 9h4 M12 13h4 M12 17h2',
    combat: 'M4 4l10.5 10.5 M12.5 16.5l4-4 M14.5 14.5l5 5 M20 4L9.5 14.5 M7.5 12.5l4 4 M9.5 14.5l-5 5 M4 4h3 M4 4v3 M20 4h-3 M20 4v3',
    spells: 'M4 20L14.5 9.5 M14.5 9.5l1.5-1.5 M17 2.5l.9 2.1 2.1.9-2.1.9L17 8.5l-.9-2.1L14 5.5l2.1-.9z M8 4l.5 1.2 1.2.5-1.2.5L8 7.4l-.5-1.2L6.3 5.7l1.2-.5z M19 13l.5 1.2 1.2.5-1.2.5L19 16.4l-.5-1.2-1.2-.5 1.2-.5z',
    gear: 'M7 9a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z M10 6V4a2 2 0 0 1 4 0v2 M7 12h10 M10.5 12v3h3v-3 M5 11v7 M19 11v7',
    profile: 'M5 13a7 7 0 0 1 14 0v7H5z M5 13h14 M9 13v3 M12 13v4 M15 13v3 M12 6V2.5 M10.5 3.5h3',
    journal: 'M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z M5 20.5A2.5 2.5 0 0 0 7.5 23H19v-5 M10 3v7l2-1.5L14 10V3',
    dice: 'M12 2l9 5v10l-9 5-9-5V7z M12 7l4.5 8h-9z',
    feather: 'M20 3c-7 .5-12 6-13 13l-3 5 M7 16c5-.5 9-4 11.5-9.5 M10 13.5l3-.5 M12.5 10.5l3-.5',
    edit: 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4',
    plus: 'M12 5v14 M5 12h14',
    minus: 'M5 12h14',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
    close: 'M6 6l12 12 M18 6L6 18',
    up: 'M12 19V5 M6 11l6-6 6 6',
    down: 'M12 5v14 M6 13l6 6 6-6',
    check: 'M5 12l5 5L20 7',
    mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5 11a7 7 0 0 0 14 0 M12 18v3',
    stop: 'M7 7h10v10H7z',
    share: 'M12 3v12 M7 8l5-5 5 5 M5 14v6h14v-6',
    image: 'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M15 9a1 1 0 1 0 0.01 0',
    search: 'M10 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12z M15 15l5 5',
    pin: 'M9 3h6l-1 6 4 4H6l4-4z M12 13v8',
    undo: 'M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3',
    more: 'M12 5h.01 M12 12h.01 M12 19h.01',
    shield: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z M12 7v10 M8 11h8',
    bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
    boot: 'M4 18c3 0 4-3 7-3s4 3 9 3 M7 13c1-4 3-7 6-7',
    clock: 'M12 2.5l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L6.2 6.8l4-.6z M8.5 13.5L6.5 21l3-1.5L12 22 M15.5 13.5l2 7.5-3-1.5L12 22',
    heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
    moon: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z M17 3l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z',
    coffee: 'M5 21l14-4 M19 21L5 17 M12 3c2.5 3 4.5 4.5 4.5 7.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2.5-4.5 0 1.8.8 3 2 3.2 0-2-.8-3.8 0-6.2z',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
    lock: 'M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    camera: 'M4 7h4l2-3h4l2 3h4v12H4z M12 10a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
    play: 'M8 5v14l11-7z',
    pause: 'M8 5v14 M16 5v14',
    reroll: 'M3 12a9 9 0 1 0 3-6.7 M3 4v5h5',
    sparkle: 'M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z',
    swap: 'M7 7h12 M15 3l4 4-4 4 M17 17H5 M9 13l-4 4 4 4',
    drag: 'M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01',
    users: 'M8 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6z M2.5 20c.5-3.5 2.8-5 5.5-5s5 1.5 5.5 5 M16 3.5a3 3 0 0 1 0 6 M17.5 15c2 .5 3.3 2 3.8 5 M16.5 12l1 1 2-2',
    map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14',
    flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
    download: 'M12 3v12 M7 10l5 5 5-5 M5 19h14',
    upload: 'M12 21V9 M7 14l5-5 5 5 M5 5h14',
    copy: 'M8 8h11v11H8z M5 16V5h11',
    claude: 'M12 3v18 M3 12h18 M5.6 5.6l12.8 12.8 M18.4 5.6L5.6 18.4',
    cards: 'M7 3h10v14H7z M4 6v14h10',
    wave: 'M3 12h2 M7 8v8 M11 5v14 M15 9v6 M19 11v2',
    back: 'M15 5l-7 7 7 7',
    chevron: 'M9 5l7 7-7 7',
    help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.5 9.2a2.6 2.6 0 0 1 5 1c0 1.8-2.5 2.2-2.5 3.8 M12 17.2v.1',
    chevronDown: 'M5 9l7 7 7-7',
  };
</script>

<script lang="ts">
  let { name, size = 24, stroke = 1.8, fill = false }: { name: string; size?: number; stroke?: number; fill?: boolean } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={fill ? 'currentColor' : 'none'}
  stroke="currentColor"
  stroke-width={stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={ICONS[name] ?? ''} />
</svg>
