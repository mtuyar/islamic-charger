import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { renderDailyWidget, renderPrayerWidget } from './render';
import { WIDGET_DAILY, WIDGET_PRAYER } from '../services/widgets';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, renderWidget } = props;
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  if (widgetInfo.widgetName === WIDGET_DAILY) {
    renderWidget(await renderDailyWidget(widgetInfo));
  } else if (widgetInfo.widgetName === WIDGET_PRAYER) {
    renderWidget(await renderPrayerWidget(widgetInfo));
  }
}
