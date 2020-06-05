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
  const [objUrl, setObjUrl] = React.useState('');
  const { recording, ...rest } = props;

  React.useEffect(() => {
    const sub = context.reports.report(recording).pipe(first()).subscribe(objUrl => {
      setObjUrl(objUrl);
    }, err => {
      notifications.danger(err);
    });
    return () =>  sub.unsubscribe();
  }, [context.reports, notifications, recording, props, props.recording]);

  return (<>
    <iframe src={objUrl} {...rest} />
  </>);
});
