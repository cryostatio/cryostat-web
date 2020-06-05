import * as React from 'react';
import { of } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { combineLatest, concatMap, first, mergeMap } from 'rxjs/operators';
import { Recording } from '@app/Shared/Services/Api.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationsContext } from '@app/Notifications/Notifications';

export interface ReportFrameProps extends React.HTMLProps<HTMLIFrameElement> {
  recording: Recording;
}

export const ReportFrame: React.FunctionComponent<ReportFrameProps> = React.memo((props) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const [content, setContent] = React.useState('');
  const { recording, ...rest } = props;

  React.useEffect(() => {
    const sub = context.reports.report(recording).pipe(first()).subscribe(objUrl => {
      setContent(objUrl);
    }, err => {
      notifications.danger(err);
    });
    return () => {
      sub.unsubscribe();
      window.URL.revokeObjectURL(content);
    };
  }, [context.reports]);

  return (<>
    <iframe src={content} {...rest} />
  </>);
});
