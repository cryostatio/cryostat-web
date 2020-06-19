import * as React from 'react';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Button, Card, CardActions, CardBody, CardHeader, CardHeaderMain, Grid, GridItem, Select, SelectOption, SelectVariant, Text, TextVariants } from '@patternfly/react-core';
import { ContainerNodeIcon, Spinner2Icon } from '@patternfly/react-icons';
import { filter, first, map } from 'rxjs/operators';

export interface TargetSelectProps {
  isCompact?: boolean;
}

interface Target {
  connectUrl: string;
  alias: string;
  port: number;
}

export const TargetSelect: React.FunctionComponent<TargetSelectProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [selected, setSelected] = React.useState('');
  const [targets, setTargets] = React.useState([]);
  const [expanded, setExpanded] = React.useState(false);
  const [isLoading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const sub = context.commandChannel.onResponse('scan-targets').pipe(map(msg => msg.payload)).subscribe(targets => {
      setTargets(targets);
      setLoading(false);
    });
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  React.useEffect(() => {
    const sub = context.commandChannel.isReady()
      .pipe(filter(v => !!v), first())
      .subscribe(refreshTargetList);
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  React.useLayoutEffect(() => {
    const sub = context.commandChannel.target().subscribe(setSelected);
    return () => sub.unsubscribe();
  }, [context.commandChannel]);

  const refreshTargetList = () => {
    setLoading(true);
    context.commandChannel.sendControlMessage('scan-targets')
  };

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
        <GridItem span={props.isCompact ? 4 : 8}>
          <Card>
            <CardHeader>
              <CardHeaderMain>
                <Text component={TextVariants.h4}>
                  Target JVM
                </Text>
              </CardHeaderMain>
              <CardActions>
                <Button
                  isDisabled={isLoading}
                  onClick={refreshTargetList}
                  variant="control"
                  icon={<Spinner2Icon />}
                />
              </CardActions>
            </CardHeader>
            <CardBody>
              <Select
                toggleIcon={<ContainerNodeIcon />}
                variant={SelectVariant.single}
                selections={selected}
                onSelect={onSelect}
                onToggle={setExpanded}
                isDisabled={isLoading}
                isOpen={expanded}
                aria-label="Select Input"
              >
              {
                ([<SelectOption key='placeholder' value='Select Target...' isPlaceholder={true} />])
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
