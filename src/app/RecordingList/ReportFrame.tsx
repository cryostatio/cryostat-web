import * as React from 'react';
import { of } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { combineLatest, concatMap, first, mergeMap } from 'rxjs/operators';
import { ServiceContext } from '@app/Shared/Services/Services';

export interface ReportFrameProps {
  reportUrl: string;
  type?: string;
  width: string;
  height: string;
  onLoad: () => void;
  hidden: boolean;
}

export const ReportFrame: React.FunctionComponent<ReportFrameProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [content, setContent] = React.useState('');

  React.useEffect(() => {
    const type = props.type || 'text/html';
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
            // TODO log this or something
            throw new Error('Response not OK');
          }
        })
      )
      .subscribe(report => {
        const blob = new Blob([report], { type });
        objUrl = window.URL.createObjectURL(blob);
        setContent(objUrl);
      });
    return () => {
      sub.unsubscribe();
      if (objUrl) {
        window.URL.revokeObjectURL(objUrl);
      }
    };
  }, [props.type, context.api]);

  const { reportUrl, ...rest } = props;
  return (<>
    <iframe src={content} {...rest} />
  </>);
};
