import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Card, CardBody, CardHeader, Grid, GridItem, Select, SelectOption, SelectVariant, Text, TextVariants } from '@patternfly/react-core';
import { ContainerNodeIcon } from '@patternfly/react-icons';
import { filter, first } from 'rxjs/operators';

export interface TargetSelectProps {
  isCompact?: boolean;
  allowDisconnect?: boolean;
}

interface Target {
  connectUrl: string;
  alias: string;
  port: number;
}

export const TargetSelect = (props: TargetSelectProps) => {
  const context = React.useContext(ServiceContext);
  const [selected, setSelected] = React.useState('');
  const [targets, setTargets] = React.useState([]);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('scan-targets').subscribe(msg => setTargets(msg.payload));
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  React.useEffect(() => {
    const sub = context.commandChannel.isReady()
      .pipe(filter(v => !!v), first())
      .subscribe(() => context.commandChannel.sendControlMessage('scan-targets'));
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  React.useEffect(() => {
    const sub = context.commandChannel.target().subscribe(t => setSelected(t));
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  const onSelect = (evt, selection, isPlaceholder) => {
    if (isPlaceholder) {
      context.commandChannel.setTarget('');
    } else {
      context.commandChannel.setTarget(selection.connectUrl);
    }
    // FIXME setting the expanded state to false seems to cause an "unmounted component" error
    // in the browser console
    setExpanded(false);
  };

  return (<>
      <Grid>
        <GridItem span={props.isCompact ? 2 : 8}>
          <Card>
            <CardHeader>
              <Text component={TextVariants.h4}>
                Target JVM
              </Text>
            </CardHeader>
            <CardBody>
              <Select
                toggleIcon={<ContainerNodeIcon />}
                variant={SelectVariant.single}
                selections={selected}
                onSelect={onSelect}
                onToggle={setExpanded}
                isExpanded={expanded}
                aria-label="Select Input"
              >
              {
                (props.allowDisconnect ? [<SelectOption key='placeholder' value='Select Target...' isPlaceholder={true} />] : [])
                  .concat(
                    targets.map((t: Target) => (
                      <SelectOption
                        key={t.connectUrl}
                        value={t}
                        isPlaceholder={false}
                      >{`${t.alias} (${t.connectUrl}:${t.port})`}</SelectOption>
                    ))
                )
              }
              </Select>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
  </>);

}
