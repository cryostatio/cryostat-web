/*
 * Copyright The Cryostat Authors
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
import * as _ from 'lodash';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { Button, Card, CardActions, CardBody, CardHeader, CardHeaderMain, Grid,
  GridItem, Select, SelectOption, SelectVariant, Text, TextVariants
} from '@patternfly/react-core';
import { ContainerNodeIcon, PlusCircleIcon, Spinner2Icon, TrashIcon } from '@patternfly/react-icons';
import { of } from 'rxjs';
import { catchError, first } from 'rxjs/operators';

import { CreateTargetModal } from './CreateTargetModal';

export interface TargetSelectProps {
  isCompact?: boolean;
}

const NOTIFICATION_CATEGORY = 'TargetJvmDiscovery';

export const TargetSelect: React.FunctionComponent<TargetSelectProps> = (props) => {
  const notifications = React.useContext(NotificationsContext);
  const context = React.useContext(ServiceContext);
  const [selected, setSelected] = React.useState(NO_TARGET);
  const [targets, setTargets] = React.useState([] as Target[]);
  const [expanded, setExpanded] = React.useState(false);
  const [isLoading, setLoading] = React.useState(false);
  const [isModalOpen, setModalOpen] = React.useState(false);
  const addSubscription = useSubscriptions();

  React.useEffect(() => {
    const sub = context.targets.targets().subscribe(setTargets);
    return () => sub.unsubscribe();
  }, [context, context.targets, setTargets]);

  const refreshTargetList = React.useCallback(() => {
    setLoading(true);
    addSubscription(
      context.api.doGet<Target[]>(`targets`)
      .pipe(first())
      .subscribe(targets => {
        setTargets(targets);
        setLoading(false);
      })
    );
  }, [context.api]);

  const selectNone = () => {
    onSelect(undefined, undefined, true);
  };

  React.useEffect(() => {
    const sub = context.notificationChannel.messages(NOTIFICATION_CATEGORY)
      .subscribe(v => {
        const evt: TargetDiscoveryEvent = v.message.event;
        switch (evt.kind) {
          case 'FOUND':
            break;
          case 'LOST':
            if (selected.connectUrl === evt.serviceRef.connectUrl) {
              notifications.warning('Target Disappeared', `The selected target "${selected.alias}" disappeared.`);
              selectNone();
            }
            break;
          default:
            notifications.danger(`Bad ${NOTIFICATION_CATEGORY} message received`, `Unknown event type ${evt.kind}`);
            break;
        }
      });
    return () => sub.unsubscribe();
  }, [context.notificationChannel, notifications, NOTIFICATION_CATEGORY, selectNone, selected]);

  React.useLayoutEffect(() => {
    addSubscription(
      context.target.target().subscribe(setSelected)
    );
  }, [context.target]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(() => refreshTargetList(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, [context.target, context.settings, refreshTargetList]);

  const onSelect = (evt, selection, isPlaceholder) => {
    if (isPlaceholder) {
      context.target.setTarget(NO_TARGET);
    } else {
      if (selection != selected) {
        try {
          context.target.setTarget(selection);
        } catch (error) {
          notifications.danger("Cannot set target", error.message)
          context.target.setTarget(NO_TARGET);
        }
      }
    }
    // FIXME setting the expanded state to false seems to cause an "unmounted component" error
    // in the browser console
    setExpanded(false);
  };

  const showCreateTargetModal = React.useCallback(() => {
    setModalOpen(true);
  }, [setModalOpen]);

  const createTarget = React.useCallback((target: Target) => {
    setLoading(true);
    addSubscription(
      context.api.createTarget(target)
        .pipe(first(), catchError(() => of(false)))
        .subscribe(success => {
          setLoading(false);
          setModalOpen(false);
          if (success) {
            notifications.info('Target Created');
          } else {
            notifications.danger('Target Creation Failed');
          }
        })
    );
  }, [context.api, notifications, setModalOpen]);

  const deleteTarget = React.useCallback(() => {
    setLoading(true);
    addSubscription(
      context.api.deleteTarget(selected)
      .pipe(first())
      .subscribe(() => {
        setLoading(false);
      }, () => {
        setLoading(false);
        let id: string;
        if (selected.alias === selected.connectUrl) {
          id = selected.alias;
        } else {
          id = `${selected.alias} [${selected.connectUrl}]`
        }
        notifications.danger('Target Deletion Failed', `The selected target (${id}) could not be deleted`);
      })
    );
  }, [context.api, selected]);

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
                  onClick={showCreateTargetModal}
                  variant="control"
                  icon={<PlusCircleIcon />}
                />
                <Button
                  isDisabled={isLoading || (selected == NO_TARGET)}
                  onClick={deleteTarget}
                  variant="control"
                  icon={<TrashIcon />}
                />
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
                selections={selected.alias || selected.connectUrl}
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
                      (t.alias == t.connectUrl) || !t.alias ?
                        <SelectOption
                          key={t.connectUrl}
                          value={t}
                          isPlaceholder={false}
                        >{`${t.connectUrl}`}</SelectOption>
                      :
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
      <CreateTargetModal
        visible={isModalOpen}
        onSubmit={(target) => createTarget(target)}
        onDismiss={() => setModalOpen(false)}
      ></CreateTargetModal>
  </>);

}

interface TargetDiscoveryEvent {
  kind: 'LOST' | 'FOUND';
  serviceRef: Target;
}
