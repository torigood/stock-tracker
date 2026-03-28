import type { TranslationKey } from '../i18n/translations'

export const WIDGETS: { id: string; labelKey: TranslationKey }[] = [
  { id: 'reminders',        labelKey: 'widget.reminders' },
  { id: 'pinnedNotes',      labelKey: 'widget.pinnedNotes' },
  { id: 'summary',          labelKey: 'widget.summary' },
  { id: 'portfolioChart',   labelKey: 'widget.portfolioChart' },
  { id: 'holdings',         labelKey: 'widget.holdings' },
  { id: 'donut',            labelKey: 'widget.donut' },
  { id: 'heatmap',          labelKey: 'widget.heatmap' },
  { id: 'monthlyChart',     labelKey: 'widget.monthlyChart' },
  { id: 'performance',      labelKey: 'widget.performance' },
  { id: 'benchmark',        labelKey: 'widget.benchmark' },
  { id: 'taxReport',        labelKey: 'widget.taxReport' },
  { id: 'rebalancing',      labelKey: 'widget.rebalancing' },
  { id: 'dividendCalendar', labelKey: 'widget.dividendCalendar' },
]
