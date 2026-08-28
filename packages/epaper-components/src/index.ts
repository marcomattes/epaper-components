// EPaper · Component Library entry point.
// Importing this module registers all custom elements as side effects.

export { ICONS, iconSvg, registerIcon, iconNames, SVG_NS } from './core/icons';
export type { IconName } from './core/icons';
export {
  formatNumber,
  formatDate,
  formatMoneyParts,
  formatRelativeTime,
  formatUnitPrice,
  MONEY_PLACEHOLDER,
  resolveLocale,
  weekdayLabels,
  monthLabel,
} from './core/format';
export type { NumberFormatOptions, MoneyOptions, MoneyParts } from './core/format';
export { setLocaleStrings, strings, t } from './core/i18n';
export type { LocaleStrings } from './core/i18n';
export type {
  EChangeDetail,
  CascaderOption,
  TreeNode,
  CalendarEvent,
  CalendarEventStatus,
  EventLogEntry,
  EventLogSeverity,
} from './core/types';

// Components
export { EIcon } from './components/icon/icon';
export { EButton } from './components/button/button';
export { ECard } from './components/card/card';
export { ECardImage } from './components/card-image/card-image';
export { EInput } from './components/input/input';
export { ETextarea } from './components/textarea/textarea';
export { EToggle } from './components/toggle/toggle';
export { ECheckbox } from './components/checkbox/checkbox';
export { EBadge } from './components/badge/badge';
export { EBadgeCount } from './components/badge-count/badge-count';
export { ERibbon } from './components/ribbon/ribbon';
export { ETitle } from './components/title/title';
export { EText } from './components/text/text';
export { EProse } from './components/prose/prose';
export { ELink } from './components/link/link';
export { EDivider } from './components/divider/divider';
export { EFlex } from './components/flex/flex';
export { EGrid, EGridItem } from './components/grid/grid';
export { ESpace } from './components/space/space';
export { EMasonry } from './components/masonry/masonry';
export {
  ELayout,
  ELayoutHeader,
  ELayoutSider,
  ELayoutContent,
  ELayoutFooter,
} from './components/layout/layout';
export { ESplitter } from './components/splitter/splitter';
export { EFloatButton, EFloatButtonGroup, EFabItem } from './components/float-button/float-button';
export { EAnchor, EAnchorItem } from './components/anchor/anchor';
export { EToc } from './components/toc/toc';
export { EBreadcrumb, EBreadcrumbItem } from './components/breadcrumb/breadcrumb';
export { EDropdown, EDropdownItem } from './components/dropdown/dropdown';
export { EForm, EFormItem } from './components/form/form';
export { EInputNumber } from './components/input-number/input-number';
export { ERating } from './components/rating/rating';
export { ESlider } from './components/slider/slider';
export { EPinInput } from './components/pin-input/pin-input';
export { ESignature } from './components/signature/signature';
export { EKeypad } from './components/keypad/keypad';
export { ERadioGroup, ERadio } from './components/radio-group/radio-group';
export { ESegmented, ESegment } from './components/segmented/segmented';
export { ECheckboxGroup, ECboxOption } from './components/checkbox-group/checkbox-group';
export { ESelect, EOption } from './components/select/select';
export { ECascader } from './components/cascader/cascader';
export { ETreeSelect } from './components/tree-select/tree-select';
export { EDatePicker } from './components/date-picker/date-picker';
export { ETimePicker } from './components/time-picker/time-picker';
export { EUpload } from './components/upload/upload';
export { EMenu, EMenuItem } from './components/menu/menu';
export { EPagination } from './components/pagination/pagination';
export { ESteps, EStep } from './components/steps/steps';
export { ETabs, ETab } from './components/tabs/tabs';
export { EAvatar, EAvatarGroup, EAvatarItem } from './components/avatar/avatar';
export { ECalendar } from './components/calendar/calendar';
export { EAgenda } from './components/agenda/agenda';
export { EKaleido } from './components/kaleido/kaleido';
export { ETag } from './components/tag/tag';
export { EChip } from './components/chip/chip';
export { EEmpty } from './components/empty/empty';
export { ESkeleton } from './components/skeleton/skeleton';
export { EProgress } from './components/progress/progress';
export { EResult } from './components/result/result';
export { EList, EListItem } from './components/list/list';
export { ETable } from './components/table/table';
export { EStatistic } from './components/statistic/statistic';
export { EPrice } from './components/price/price';
export { EMeter } from './components/meter/meter';
export { ESparkline } from './components/sparkline/sparkline';
export { EStatusBoard } from './components/status-board/status-board';
export type {
  StatusBoardItem,
  StatusBoardStatus,
  StatusMeta,
} from './components/status-board/status-board';
export { EStatusPill } from './components/status-pill/status-pill';
export type { StatusPillMeta } from './components/status-pill/status-pill';
export { EChangeMarker } from './components/change-marker/change-marker';
export { ELastUpdated } from './components/last-updated/last-updated';
export type { UpdateFreshness } from './components/last-updated/last-updated';
export { EDiff } from './components/diff/diff';
export { ERedline } from './components/redline/redline';
export { ETimeline, ETimelineItem } from './components/timeline/timeline';
export { EEventLog } from './components/event-log/event-log';
export { EDescriptionList, EDescItem } from './components/description-list/description-list';
export { EAffix } from './components/affix/affix';
export { EBackTop } from './components/back-top/back-top';
export { EWatermark } from './components/watermark/watermark';
export { EImage } from './components/image/image';
export { EQrcode } from './components/qrcode/qrcode';
export { EBarcode } from './components/barcode/barcode';
export type { BarcodeFormat } from './components/barcode/barcode';
export { EDialog } from './components/dialog/dialog';
export type { DialogCloseReason } from './components/dialog/dialog';
export { EAlert } from './components/alert/alert';
export { ECollapse, ECollapsePanel } from './components/collapse/collapse';
export { ETree } from './components/tree/tree';
export { EPopover, EPopconfirm } from './components/popover/popover';
