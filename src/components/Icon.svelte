<script lang="ts" module>
  /** Набор линейных иконок (stroke). Добавляйте сюда новые по необходимости. */
  export const ICONS: Record<string, string> = {
    sheet: 'M6 3h9l3 3v15H6z M9 9h6 M9 13h6 M9 17h4',
    combat: 'M14.5 17.5 3 6V3h3l11.5 11.5 M13 19l6-6 M16 16l4 4 M19 21l2-2',
    spells: 'M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z',
    gear: 'M5 8h14l-1 13H6z M9 8V6a3 3 0 0 1 6 0v2',
    profile: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M4 21c1-4 4.5-6 8-6s7 2 8 6',
    journal: 'M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z M20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z',
    dice: 'M12 2l9 5v10l-9 5-9-5V7z M12 7l4.5 8h-9z',
    feather: 'M20 4c-6 0-11 5-12 12l-3 4 M8 16c4 0 8-2 10-6',
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
    shield: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
    bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
    boot: 'M4 18c3 0 4-3 7-3s4 3 9 3 M7 13c1-4 3-7 6-7',
    clock: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z M12 8v4l3 2',
    heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
    moon: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z',
    coffee: 'M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z M16 11h2a2 2 0 0 1 0 4h-2 M8 3v3 M12 3v3',
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
    users: 'M9 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6z M3 20c.5-3.5 3-5 6-5s5.5 1.5 6 5 M16 5a3 3 0 0 1 0 6 M18 15c2 .5 3 2 3.5 5',
    map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14',
    flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
    download: 'M12 3v12 M7 10l5 5 5-5 M5 19h14',
    upload: 'M12 21V9 M7 14l5-5 5 5 M5 5h14',
    copy: 'M8 8h11v11H8z M5 16V5h11',
    claude: 'M12 3v18 M3 12h18 M5.6 5.6l12.8 12.8 M18.4 5.6L5.6 18.4',
    cards: 'M7 3h10v14H7z M4 6v14h10',
    wave: 'M3 12h2 M7 8v8 M11 5v14 M15 9v6 M19 11v2',
    back: 'M15 5l-7 7 7 7',
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
