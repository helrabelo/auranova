import { color as d3Color } from 'd3-color'

// Genre to color mapping
// Uses a consistent color scheme for major genre families
const GENRE_COLOR_MAP: Record<string, string> = {
  // Electronic/Dance - Cyan/Blue
  electronic: '#00ffff',
  edm: '#00ccff',
  house: '#0099ff',
  techno: '#0066ff',
  trance: '#3366ff',
  dubstep: '#6633ff',
  'drum and bass': '#9933ff',

  // Rock/Metal - Red/Orange
  rock: '#ff3333',
  metal: '#cc0000',
  'hard rock': '#ff6633',
  punk: '#ff9933',
  alternative: '#ff6666',
  grunge: '#993333',
  indie: '#cc6666',

  // Pop - Pink/Magenta
  pop: '#ff66cc',
  'synth-pop': '#ff33cc',
  'dance pop': '#ff99cc',
  electropop: '#cc33ff',

  // Hip-Hop/R&B - Purple/Violet
  'hip hop': '#9966ff',
  rap: '#9933ff',
  'r&b': '#cc66ff',
  soul: '#cc99ff',
  funk: '#ff66ff',

  // Jazz/Blues - Blue/Indigo
  jazz: '#3333cc',
  blues: '#333399',
  swing: '#6666cc',
  bebop: '#4444aa',

  // Classical/Orchestral - Gold/Bronze
  classical: '#ffcc00',
  orchestral: '#ffaa00',
  opera: '#ff9900',
  chamber: '#cc9933',

  // Country/Folk - Brown/Earth tones
  country: '#cc9966',
  folk: '#996633',
  bluegrass: '#cc6633',
  americana: '#993300',

  // Latin - Orange/Red
  latin: '#ff6600',
  reggaeton: '#ff3300',
  salsa: '#ff9933',
  bossa: '#ffcc33',

  // World/Ambient - Green/Teal
  world: '#33cc66',
  ambient: '#33cccc',
  'new age': '#66cc99',
  meditation: '#99cc66',
}

// Hash function for consistent color generation
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Get color for a genre
export function colorFromGenre(genre: string): string {
  const normalizedGenre = genre.toLowerCase().trim()

  // Check direct match
  if (GENRE_COLOR_MAP[normalizedGenre]) {
    return GENRE_COLOR_MAP[normalizedGenre]
  }

  // Check partial match
  for (const [key, value] of Object.entries(GENRE_COLOR_MAP)) {
    if (normalizedGenre.includes(key) || key.includes(normalizedGenre)) {
      return value
    }
  }

  // Generate consistent color for unknown genres
  const hash = hashString(normalizedGenre)
  const hue = hash % 360
  const saturation = 70 + (hash % 20) // 70-90%
  const lightness = 50 + (hash % 20) // 50-70%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

// Get RGB array from genre (for Three.js)
export function colorFromGenreRGB(genre: string): [number, number, number] {
  const hex = colorFromGenre(genre)
  const color = d3Color(hex)

  if (color) {
    const rgb = color.rgb()
    return [rgb.r / 255, rgb.g / 255, rgb.b / 255]
  }

  return [1, 1, 1] // Default white
}

// Get dominant genre color from an array of genres
export function dominantGenreColor(genres: string[]): string {
  if (genres.length === 0) {
    return '#ffffff'
  }

  // Priority order for genre families
  const priority = ['electronic', 'rock', 'pop', 'hip hop', 'jazz', 'classical']

  // Find highest priority match
  for (const priorityGenre of priority) {
    const match = genres.find((g) =>
      g.toLowerCase().includes(priorityGenre.toLowerCase())
    )
    if (match) {
      return colorFromGenre(match)
    }
  }

  // Default to first genre
  return colorFromGenre(genres[0])
}
