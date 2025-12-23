import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force'

/**
 * Node in the orbital simulation representing an artist
 */
export interface SimulationNode extends SimulationNodeDatum {
  id: string
  genres: string[]
  popularity: number
  // Cluster assignment (primary genre index)
  cluster: number
  // 3D position
  x?: number
  y?: number
  z?: number
  // Original rank (index in sorted order)
  rank?: number
}

/**
 * Link between two artists based on shared genres
 */
export interface SimulationLink extends SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode
  target: string | SimulationNode
  strength: number
}

/**
 * Configuration for the orbital simulation
 */
export interface SimulationConfig {
  /** Radius of the galaxy sphere */
  radius: number
  /** Minimum orbit radius (inner orbit) */
  innerRadius: number
  /** Maximum orbit radius (outer orbit) */
  outerRadius: number
  /** Number of orbital shells */
  numOrbits: number
  /** Vertical spread for depth */
  verticalSpread: number
  /** Whether to spread across 3D or keep flat */
  use3D: boolean
  /** Not used anymore but kept for compatibility */
  repulsion?: number
  collisionMultiplier?: number
  linkDistance?: number
  iterations?: number
}

const DEFAULT_CONFIG: SimulationConfig = {
  radius: 35,
  innerRadius: 8,
  outerRadius: 35,
  numOrbits: 5,
  verticalSpread: 6,
  use3D: true,
}

/**
 * Extract unique genres and create a genre -> index map
 */
export function buildGenreMap(nodes: SimulationNode[]): Map<string, number> {
  const genreCounts = new Map<string, number>()

  // Count genre occurrences
  nodes.forEach((node) => {
    node.genres.forEach((genre) => {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1)
    })
  })

  // Sort by count (most common genres first) and create index map
  const sortedGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre)

  const genreMap = new Map<string, number>()
  sortedGenres.forEach((genre, index) => {
    genreMap.set(genre, index)
  })

  return genreMap
}

/**
 * Assign each node to a cluster based on its primary (most common) genre
 */
export function assignClusters(
  nodes: SimulationNode[],
  genreMap: Map<string, number>
): void {
  nodes.forEach((node) => {
    if (node.genres.length === 0) {
      node.cluster = 0
      return
    }

    // Find the genre with the lowest index (most common overall)
    let bestCluster = Infinity
    node.genres.forEach((genre) => {
      const clusterIndex = genreMap.get(genre) ?? Infinity
      if (clusterIndex < bestCluster) {
        bestCluster = clusterIndex
      }
    })

    node.cluster = bestCluster === Infinity ? 0 : bestCluster
  })
}

/**
 * Calculate spherical orbital position for an artist
 * - Inner orbits = higher importance (lower rank number = more popular)
 * - Uses golden spiral on a sphere for even 3D distribution
 * - Genre clustering via angle offset
 */
function calculateOrbitalPosition(
  node: SimulationNode,
  rank: number,
  totalArtists: number,
  config: SimulationConfig,
  genreMap: Map<string, number>
): { x: number; y: number; z: number } {
  const totalGenres = genreMap.size || 1

  // Importance is inversely related to rank (rank 0 = most important)
  const importance = 1 - rank / Math.max(totalArtists - 1, 1)

  // Calculate orbit radius: inner for important, outer for less important
  const orbitRadius =
    config.innerRadius +
    (1 - importance) * (config.outerRadius - config.innerRadius)

  // Golden ratio for spherical distribution (Fibonacci sphere)
  const goldenRatio = (1 + Math.sqrt(5)) / 2
  const goldenAngle = 2 * Math.PI / (goldenRatio * goldenRatio)

  // Spherical coordinates using golden spiral
  // phi = azimuthal angle (around Y axis)
  // theta = polar angle (from Y axis)
  const phi = rank * goldenAngle

  // Distribute theta evenly from pole to pole
  // Using arccos for uniform distribution on sphere surface
  const t = rank / Math.max(totalArtists - 1, 1)
  const theta = Math.acos(1 - 2 * t)

  // Add genre-based offset to cluster similar genres
  const genreIndex = node.cluster
  const genreAngleOffset = (genreIndex / totalGenres) * Math.PI * 0.4

  // Calculate position on the sphere
  const adjustedPhi = phi + genreAngleOffset

  const x = orbitRadius * Math.sin(theta) * Math.cos(adjustedPhi)
  const y = config.use3D ? orbitRadius * Math.cos(theta) * 0.6 : 0 // Compress Y for disc-like shape
  const z = orbitRadius * Math.sin(theta) * Math.sin(adjustedPhi)

  return { x, y, z }
}

/**
 * Calculate planet size for collision avoidance
 * Uses smaller sizes matching the visual planet sizes
 */
function getNodeSize(_node: SimulationNode): number {
  // Average of our 3 planet sizes (0.4, 0.6, 0.9)
  return 0.6
}

/**
 * Resolve overlapping planets by pushing them apart
 */
function resolveOverlaps(
  nodes: SimulationNode[],
  iterations: number = 10
): void {
  const minSpacing = 1.2 // Multiplier for minimum distance between planets

  for (let iter = 0; iter < iterations; iter++) {
    let hasOverlap = false

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i]
        const nodeB = nodes[j]

        const dx = (nodeB.x ?? 0) - (nodeA.x ?? 0)
        const dy = (nodeB.y ?? 0) - (nodeA.y ?? 0)
        const dz = (nodeB.z ?? 0) - (nodeA.z ?? 0)
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        const sizeA = getNodeSize(nodeA)
        const sizeB = getNodeSize(nodeB)
        const minDist = (sizeA + sizeB) * minSpacing

        if (dist < minDist && dist > 0.001) {
          hasOverlap = true

          // Push apart
          const overlap = minDist - dist
          const pushAmount = overlap / 2

          const nx = dx / dist
          const ny = dy / dist
          const nz = dz / dist

          nodeA.x = (nodeA.x ?? 0) - nx * pushAmount
          nodeA.y = (nodeA.y ?? 0) - ny * pushAmount
          nodeA.z = (nodeA.z ?? 0) - nz * pushAmount

          nodeB.x = (nodeB.x ?? 0) + nx * pushAmount
          nodeB.y = (nodeB.y ?? 0) + ny * pushAmount
          nodeB.z = (nodeB.z ?? 0) + nz * pushAmount
        }
      }
    }

    // Early exit if no overlaps found
    if (!hasOverlap) break
  }
}

/**
 * Run the orbital positioning algorithm and return final positions
 * Replaces D3 force simulation with deterministic orbital layout
 */
export function runSimulation(
  nodes: SimulationNode[],
  _links: SimulationLink[], // Links not used in orbital layout but kept for API compatibility
  config: Partial<SimulationConfig> = {}
): SimulationNode[] {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Build genre map and assign clusters
  const genreMap = buildGenreMap(nodes)
  assignClusters(nodes, genreMap)

  // Sort nodes by popularity (most popular first = inner orbits)
  const sortedNodes = [...nodes].sort((a, b) => b.popularity - a.popularity)

  // Assign ranks
  sortedNodes.forEach((node, index) => {
    node.rank = index
  })

  // Calculate orbital positions for each node
  const totalArtists = nodes.length
  sortedNodes.forEach((node) => {
    const pos = calculateOrbitalPosition(
      node,
      node.rank ?? 0,
      totalArtists,
      cfg,
      genreMap
    )
    node.x = pos.x
    node.y = pos.y
    node.z = pos.z
  })

  // Resolve any overlapping planets
  resolveOverlaps(sortedNodes, 15)

  return nodes
}

/**
 * Convert simulation nodes back to position tuples
 */
export function nodesToPositions(
  nodes: SimulationNode[]
): Map<string, [number, number, number]> {
  const positions = new Map<string, [number, number, number]>()

  nodes.forEach((node) => {
    positions.set(node.id, [node.x ?? 0, node.y ?? 0, node.z ?? 0])
  })

  return positions
}
