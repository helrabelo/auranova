import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceLink,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'

/**
 * Node in the force simulation representing an artist
 */
export interface SimulationNode extends SimulationNodeDatum {
  id: string
  genres: string[]
  popularity: number
  // Cluster assignment (primary genre index)
  cluster: number
  // 3D position (z is calculated from cluster)
  x?: number
  y?: number
  z?: number
  // Fixed position after simulation
  fx?: number | null
  fy?: number | null
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
 * Configuration for the force simulation
 */
export interface SimulationConfig {
  /** Radius of the galaxy sphere */
  radius: number
  /** Repulsion strength between nodes */
  repulsion: number
  /** Collision radius multiplier */
  collisionMultiplier: number
  /** Link distance */
  linkDistance: number
  /** Number of simulation iterations */
  iterations: number
  /** Whether to spread across 3D or keep flat */
  use3D: boolean
}

const DEFAULT_CONFIG: SimulationConfig = {
  radius: 30,
  repulsion: -50,
  collisionMultiplier: 1.5,
  linkDistance: 10,
  iterations: 300,
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
 * Initialize node positions in a spherical pattern based on clusters
 */
export function initializePositions(
  nodes: SimulationNode[],
  config: SimulationConfig
): void {
  const clusterGroups = new Map<number, SimulationNode[]>()

  // Group nodes by cluster
  nodes.forEach((node) => {
    const group = clusterGroups.get(node.cluster) ?? []
    group.push(node)
    clusterGroups.set(node.cluster, group)
  })

  const numClusters = clusterGroups.size
  const goldenRatio = (1 + Math.sqrt(5)) / 2

  // Position each cluster in a different region of the sphere
  let clusterIndex = 0
  clusterGroups.forEach((clusterNodes, _clusterId) => {
    // Calculate cluster center using golden spiral on sphere
    const clusterPhi = Math.acos(1 - (2 * (clusterIndex + 0.5)) / numClusters)
    const clusterTheta = 2 * Math.PI * clusterIndex * goldenRatio

    const clusterRadius = config.radius * 0.6
    const clusterCenterX =
      clusterRadius * Math.sin(clusterPhi) * Math.cos(clusterTheta)
    const clusterCenterY =
      clusterRadius * Math.sin(clusterPhi) * Math.sin(clusterTheta)
    const clusterCenterZ = clusterRadius * Math.cos(clusterPhi)

    // Spread nodes around cluster center
    clusterNodes.forEach((node, nodeIndex) => {
      const nodeTotal = clusterNodes.length
      const nodePhi = Math.acos(
        1 - (2 * (nodeIndex + 0.5)) / Math.max(nodeTotal, 1)
      )
      const nodeTheta = 2 * Math.PI * nodeIndex * goldenRatio

      // Smaller radius for individual nodes within cluster
      const nodeRadius = config.radius * 0.2 * (0.5 + Math.random() * 0.5)

      node.x =
        clusterCenterX + nodeRadius * Math.sin(nodePhi) * Math.cos(nodeTheta)
      node.y =
        clusterCenterY + nodeRadius * Math.sin(nodePhi) * Math.sin(nodeTheta)

      if (config.use3D) {
        node.z = clusterCenterZ + nodeRadius * Math.cos(nodePhi)
      } else {
        node.z = 0
      }
    })

    clusterIndex++
  })
}

/**
 * Custom force to pull nodes toward their cluster center
 */
function forceCluster(
  nodes: SimulationNode[],
  strength = 0.1
): (alpha: number) => void {
  const clusterCenters = new Map<
    number,
    { x: number; y: number; count: number }
  >()

  return (alpha: number) => {
    // Calculate cluster centers
    clusterCenters.clear()
    nodes.forEach((node) => {
      const center = clusterCenters.get(node.cluster) ?? {
        x: 0,
        y: 0,
        count: 0,
      }
      center.x += node.x ?? 0
      center.y += node.y ?? 0
      center.count += 1
      clusterCenters.set(node.cluster, center)
    })

    // Average to get centroids
    clusterCenters.forEach((center) => {
      if (center.count > 0) {
        center.x /= center.count
        center.y /= center.count
      }
    })

    // Apply force toward cluster center
    nodes.forEach((node) => {
      const center = clusterCenters.get(node.cluster)
      if (center && node.x !== undefined && node.y !== undefined) {
        node.vx = (node.vx ?? 0) + (center.x - node.x) * strength * alpha
        node.vy = (node.vy ?? 0) + (center.y - node.y) * strength * alpha
      }
    })
  }
}

/**
 * Run the D3 force simulation and return final positions
 */
export function runSimulation(
  nodes: SimulationNode[],
  links: SimulationLink[],
  config: Partial<SimulationConfig> = {}
): SimulationNode[] {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Build genre map and assign clusters
  const genreMap = buildGenreMap(nodes)
  assignClusters(nodes, genreMap)

  // Initialize positions
  initializePositions(nodes, cfg)

  // Node size based on popularity (for collision detection)
  const getNodeRadius = (node: SimulationNode): number => {
    return 0.5 + (node.popularity / 100) * 2
  }

  // Create the simulation
  const simulation: Simulation<SimulationNode, SimulationLink> =
    forceSimulation(nodes)
      // Repulsion between all nodes
      .force(
        'charge',
        forceManyBody<SimulationNode>()
          .strength(cfg.repulsion)
          .distanceMax(cfg.radius * 2)
      )
      // Center the whole simulation
      .force('center', forceCenter(0, 0).strength(0.05))
      // Prevent node overlap
      .force(
        'collision',
        forceCollide<SimulationNode>()
          .radius((d) => getNodeRadius(d) * cfg.collisionMultiplier)
          .strength(0.8)
      )
      // Links between connected artists
      .force(
        'link',
        forceLink<SimulationNode, SimulationLink>(links)
          .id((d) => d.id)
          .distance(cfg.linkDistance)
          .strength((d) => d.strength * 0.5)
      )
      // Custom cluster force
      .force('cluster', forceCluster(nodes, 0.15))
      // Stop automatic ticking
      .stop()

  // Run simulation for specified iterations
  for (let i = 0; i < cfg.iterations; i++) {
    simulation.tick()
  }

  // Normalize positions to fit within radius and add 3D depth
  normalizePositions(nodes, cfg)

  return nodes
}

/**
 * Normalize positions to fit within the galaxy radius
 * and add Z-depth based on cluster
 */
function normalizePositions(
  nodes: SimulationNode[],
  config: SimulationConfig
): void {
  // Find current bounds
  let maxDist = 0
  nodes.forEach((node) => {
    const dist = Math.sqrt((node.x ?? 0) ** 2 + (node.y ?? 0) ** 2)
    if (dist > maxDist) maxDist = dist
  })

  // Scale to fit within radius
  const scale = maxDist > 0 ? (config.radius * 0.9) / maxDist : 1

  // Get unique clusters for Z distribution
  const clusters = new Set(nodes.map((n) => n.cluster))
  const numClusters = clusters.size
  const clusterToZ = new Map<number, number>()
  let idx = 0
  clusters.forEach((cluster) => {
    // Distribute clusters across Z axis
    const zRange = config.radius * 0.6
    const z = config.use3D
      ? -zRange / 2 + (idx / Math.max(numClusters - 1, 1)) * zRange
      : 0
    clusterToZ.set(cluster, z)
    idx++
  })

  // Apply scaling and Z position
  nodes.forEach((node) => {
    node.x = (node.x ?? 0) * scale
    node.y = (node.y ?? 0) * scale

    if (config.use3D) {
      // Base Z from cluster + small random variation
      const baseZ = clusterToZ.get(node.cluster) ?? 0
      const variation = (Math.random() - 0.5) * config.radius * 0.2
      node.z = baseZ + variation
    } else {
      node.z = 0
    }
  })
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
