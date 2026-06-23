import { Box, Skeleton } from '@mui/material'

const SkeletonCard: React.FC = () => (
  <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'hsl(var(--surface-2))', border: '1px solid hsl(var(--border))', borderLeft: '3px solid hsl(var(--border))', height: 360, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    {/* header: phone + name */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="60%" height={18} animation="wave" />
        <Skeleton variant="text" width="40%" height={14} animation="wave" />
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Skeleton variant="circular" width={28} height={28} animation="wave" />
        <Skeleton variant="circular" width={28} height={28} animation="wave" />
      </Box>
    </Box>
    {/* scrollable content area */}
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.2, overflow: 'hidden' }}>
      <Skeleton variant="text" width="50%" height={12} animation="wave" />
      <Skeleton variant="rectangular" width="100%" height={32} sx={{ borderRadius: 1 }} animation="wave" />
      <Skeleton variant="text" width="40%" height={12} animation="wave" />
      <Skeleton variant="rectangular" width="30%" height={20} sx={{ borderRadius: 1 }} animation="wave" />
      <Skeleton variant="text" width="45%" height={12} animation="wave" />
      <Skeleton variant="text" width="55%" height={12} animation="wave" />
    </Box>
    {/* actions */}
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', pt: 1, borderTop: '1px solid hsl(var(--surface-2))' }}>
      <Skeleton variant="rounded" width={80} height={24} animation="wave" />
      <Skeleton variant="rounded" width={80} height={24} animation="wave" />
    </Box>
  </Box>
)

const KanbanSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <Box sx={{ display: 'flex', gap: 2, overflowX: 'hidden', pb: 2, pt: 1, px: 0.5 }}>
    {Array.from({ length: columns }).map((_, i) => (
      <Box key={i} sx={{ minWidth: 260, flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* column header skeleton */}
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'hsl(var(--surface-2))', border: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Skeleton variant="text" width="50%" height={16} animation="wave" />
          <Skeleton variant="circular" width={24} height={24} animation="wave" />
        </Box>
        {/* skeleton cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <SkeletonCard />
          <SkeletonCard />
        </Box>
      </Box>
    ))}
  </Box>
)

export default KanbanSkeleton
