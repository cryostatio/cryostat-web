import * as React from 'react';
import { BreadcrumbPage, BreadcrumbTrail } from '@app/BreadcrumbPage/BreadcrumbPage';
import { ServiceContext } from '@app/Shared/Services/Services';
import { TargetSelect } from '@app/TargetSelect/TargetSelect';
import { map } from 'rxjs/operators';
import { NoTargetSelected } from './NoTargetSelected';

interface TargetViewProps {
  pageTitle: string;
  compactSelect?: boolean;
  breadcrumbs?: BreadcrumbTrail[];
}

export const TargetView: React.FunctionComponent<TargetViewProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [connected, setConnected] = React.useState(false);

  React.useLayoutEffect(() => {
    const sub = context.commandChannel.target().pipe(map(t => !!t)).subscribe(setConnected);
    return () => sub.unsubscribe();
  }, [context.commandChannel])

  return (<>
    <BreadcrumbPage pageTitle={props.pageTitle} breadcrumbs={props.breadcrumbs}>
      <TargetSelect isCompact={props.compactSelect == null ? true : props.compactSelect} />
      { connected ? props.children : <NoTargetSelected /> }
    </BreadcrumbPage>
  </>);

}
