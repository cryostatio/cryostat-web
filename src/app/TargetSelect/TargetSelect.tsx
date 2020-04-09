import * as React from 'react';
import { filter, first } from 'rxjs/operators';
import { Select, SelectOption, SelectVariant } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';

interface Target {
  connectUrl: string;
  alias: string;
  port: number;
}

export const TargetSelect = (props) => {
  const context = React.useContext(ServiceContext);
  const [selected, setSelected] = React.useState('');
  const [targets, setTargets] = React.useState([]);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('scan-targets').subscribe(msg => setTargets(msg.payload));
    return () => sub.unsubscribe();
  }, []);

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('connect').pipe(filter(m => m.status === 0)).subscribe(m => setSelected(m.payload));
    return () => sub.unsubscribe();
  }, []);

  React.useEffect(() => {
    const sub = context.commandChannel.isReady()
      .pipe(filter(v => !!v), first())
      .subscribe(() => context.commandChannel.sendMessage('scan-targets', []));
    return () => sub.unsubscribe();
  }, []);

  const connect = (target: Target) => {
    context.commandChannel.sendMessage('connect', [ target.connectUrl ]);
  };

  const disconnect = () => {
    setSelected('');
    context.commandChannel.sendMessage('disconnect');
  };

  const onSelect = (evt, selection, isPlaceholder) => {
    if (isPlaceholder) {
      disconnect();
    } else {
      connect(selection);
    }
    // FIXME setting the expanded state to false seems to cause an "unmounted component" error
    // in the browser console
    setExpanded(false);
  };

  return (
    <div>
      <div>Active Connection: {selected}</div>
      <Select
        variant={SelectVariant.single}
        selections={selected}
        onSelect={onSelect}
        onToggle={setExpanded}
        isExpanded={expanded}
      >
      {
        [<SelectOption key='placeholder' value='Select Target...' isPlaceholder={true} />]
          .concat(
            targets.map((t: Target) => (
              <SelectOption
                key={t.connectUrl}
                value={t}
                isPlaceholder={false}
              >{t.alias}</SelectOption>
            ))
        )
      }
      </Select>
    </div>
  );

}
