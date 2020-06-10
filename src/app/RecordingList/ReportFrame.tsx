import * as React from 'react';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { Recording } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { first } from 'rxjs/operators';

export interface ReportFrameProps extends React.HTMLProps<HTMLIFrameElement> {
  recording: Recording;
}

export const ReportFrame: React.FunctionComponent<ReportFrameProps> = React.memo((props) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const [report, setReport] = React.useState();
  const { recording, ...rest } = props;

  React.useLayoutEffect(() => {
    const sub = context.reports.report(recording).pipe(first()).subscribe(
      setReport,
      notifications.danger
    );
    return () =>  sub.unsubscribe();
  }, [context.reports, notifications, recording, props, props.recording]);

  return (<>
    <iframe srcDoc={report} {...rest} />
  </>);
});
