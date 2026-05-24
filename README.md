# Communal Typewriter Journal

A cinematic digital journaling web app inspired by vintage typewriters, analog poetry, and dark academia interfaces.

## Features

- Live typewriter-style writing on paper
- Ink ribbon color switching with old text preserving its original color
- Local draft autosave and local anonymous journal entries
- Paper-only PNG snapshot export
- Mechanical typewriter sound design with carriage return and delete effects
- Night mode, ambient audio, film grain, dust, and typewriter motion details

## Tech Stack

- React
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React
- HTML Canvas
- Local Storage

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The default development URL is:

```text
http://127.0.0.1:5173/
```

## Build

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Notes

Snapshots are downloaded as PNG files through the browser download flow. In most browsers, this saves directly to the Downloads folder unless the browser is configured to ask for a location.

Typewriter key and bell sounds are bundled from BigSoundBank CC0 recordings.
