/*
 * Copyright (c) 2020 Red Hat, Inc.
 * 
 * The Universal Permissive License (UPL), Version 1.0
 * 
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 * 
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 * 
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 * 
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
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
}

export const TargetSelect: React.FunctionComponent<TargetSelectProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [selected, setSelected] = React.useState('');
  const [targets, setTargets] = React.useState([] as Target[]);
  const [expanded, setExpanded] = React.useState(false);
  const [isLoading, setLoading] = React.useState(true);

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
    context.api.doGet<Target[]>(`targets`).subscribe(targets => {
      setTargets(targets);
      setLoading(false);
    });
  };

  const onSelect = (evt, selection, isPlaceholder) => {
    if (isPlaceholder) {
      context.commandChannel.setTarget('');
    } else {
      let identifier = selection.connectUrl;
      context.commandChannel.setTarget(identifier);
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
                      >{`${t.alias} (${t.connectUrl})`}</SelectOption>
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
