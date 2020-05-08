import * as React from 'react';
import { of } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { combineLatest, concatMap, first, mergeMap } from 'rxjs/operators';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationsContext } from '@app/Notifications/Notifications';

export interface ReportFrameProps extends React.HTMLProps<HTMLIFrameElement> {
  reportUrl: string;
}

export const ReportFrame: React.FunctionComponent<ReportFrameProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const [content, setContent] = React.useState('');

  React.useEffect(() => {
    let objUrl;
    const sub = context.api.getToken()
      .pipe(
        combineLatest(context.api.getAuthMethod()),
        mergeMap(([token, authMethod]) => {
          return fromFetch(props.reportUrl, {
            headers: new window.Headers({ 'Authorization': `${authMethod} ${token}` }),
            method: 'GET',
            mode: 'cors',
            credentials: 'include'
          });
        }),
        concatMap(resp => {
          if (resp.ok) {
            return resp.blob();
          } else {
            throw new Error('Response not OK');
          }
        })
      )
      .subscribe(
        report => {
          const blob = new Blob([report], { type: 'text/html' });
          objUrl = window.URL.createObjectURL(blob);
          setContent(objUrl);
        },
        err => {
          notifications.danger('Report loading failed', String(err));
          console.error(err);
        }
      );
    return () => {
      sub.unsubscribe();
      if (objUrl) {
        window.URL.revokeObjectURL(objUrl);
      }
    };
  }, [context.api]);

  const { reportUrl, ...rest } = props;
  return (<>
    <iframe src={content} {...rest} />
  </>);
};
