import { useMusicStore } from '@/stores/musicStore'
import { TIME_RANGE_LABELS, type TimeRange } from '@/types/domain'

const TIME_RANGES: TimeRange[] = ['short_term', 'medium_term', 'long_term']

const SHORT_LABELS: Record<TimeRange, string> = {
  short_term: '4W',
  medium_term: '6M',
  long_term: 'All',
}

/**
 * Toggle for switching between Spotify time ranges
 */
export function TimeRangeToggle(): React.JSX.Element {
  const timeRange = useMusicStore((state) => state.timeRange)
  const setTimeRange = useMusicStore((state) => state.setTimeRange)
  const isLoading = useMusicStore((state) => state.isLoading)

  return (
    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 backdrop-blur-sm border border-white/10">
      {TIME_RANGES.map((range) => {
        const isActive = range === timeRange
        return (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            disabled={isLoading}
            className={`
              relative px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-300
              ${
                isActive
                  ? 'text-white bg-purple-500/80 shadow-lg shadow-purple-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={TIME_RANGE_LABELS[range]}
          >
            <span className="relative z-10">{SHORT_LABELS[range]}</span>
            {isActive && (
              <span className="absolute inset-0 rounded-md bg-gradient-to-r from-purple-500/20 to-pink-500/20 animate-pulse" />
            )}
          </button>
        )
      })}
    </div>
  )
}
