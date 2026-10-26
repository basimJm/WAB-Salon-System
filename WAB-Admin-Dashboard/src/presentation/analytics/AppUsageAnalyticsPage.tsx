import { useLocation } from 'react-router-dom';
import type { BoardId } from '@/constants/analytics';
import { APP_USAGE_BOARDS } from '@/constants/analyticsPaths';
import { AnalyticsBoard } from './AnalyticsBoard';

const DEFAULT_BOARD: BoardId = 'traffic';

/**
 * Design boards A02-A06 (traffic, screens, funnels, search, retention), one page module for all five: app-usage
 * data lives in Firebase only (server analytics = MongoDB events), so every KPI and card shows "no data yet".
 */
export default function AppUsageAnalyticsPage() {
  const { pathname } = useLocation();
  const board: BoardId =
    APP_USAGE_BOARDS[pathname as keyof typeof APP_USAGE_BOARDS] ?? DEFAULT_BOARD;
  return <AnalyticsBoard board={board} path={`/analytics/${board}`} />;
}
