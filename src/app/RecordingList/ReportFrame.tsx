import * as React from 'react';
import { of } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { combineLatest, concatMap, first } from 'rxjs/operators';
import { ServiceContext } from '@app/Shared/Services/Services';

export interface ReportFrameProps {
  src: string;
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
        concatMap(([token, authMethod]) =>
          fromFetch(props.src, {
            headers: new window.Headers({ 'Authorization': `${authMethod} ${token}`, 'Content-Type': type }),
            method: 'GET',
            mode: 'cors',
            credentials: 'include'
          })
        ),
        concatMap(resp => {
          if (resp.ok) {
            return resp.blob();
          } else {
            return new window.Promise<Blob>((resolve, reject) => resolve());
          }
        })
      )
      .subscribe(report => {
        if (!!report) {
          const blob = new Blob([report], { type });
          objUrl = window.URL.createObjectURL(blob);
          setContent(objUrl);
        }
      });
    return () => {
      sub.unsubscribe();
      if (objUrl) {
        window.URL.revokeObjectURL(objUrl);
      }
    };
  }, [props.type, context.api]);

  return (<>
    <iframe src={content} {...props} />
  </>);
};
