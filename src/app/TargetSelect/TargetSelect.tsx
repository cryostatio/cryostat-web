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
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationsContext } from '@app/Notifications/Notifications';
import { NO_TARGET, Target } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Button,
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardHeaderMain,
  Select,
  SelectOption,
  SelectVariant,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { ContainerNodeIcon, PlusCircleIcon, Spinner2Icon, TrashIcon } from '@patternfly/react-icons';
import { of } from 'rxjs';
import { catchError, first } from 'rxjs/operators';
import { CreateTargetModal } from './CreateTargetModal';
import _ from 'lodash';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';

export const CUSTOM_TARGETS_REALM = 'Custom Targets';
export interface TargetSelectProps {}

export const TargetSelect: React.FunctionComponent<TargetSelectProps> = (props) => {
  const TARGET_KEY = 'target';
  const notifications = React.useContext(NotificationsContext);
  const context = React.useContext(ServiceContext);
  const [selected, setSelected] = React.useState(NO_TARGET);
  const [targets, setTargets] = React.useState([] as Target[]);
  const [expanded, setExpanded] = React.useState(false);
  const [isLoading, setLoading] = React.useState(false);
  const [isModalOpen, setModalOpen] = React.useState(false);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);

  const addSubscription = useSubscriptions();

  const setCachedTargetSelection = React.useCallback(
    (target) => localStorage.setItem(TARGET_KEY, JSON.stringify(target)),
    [localStorage]
  );

  const removeCachedTargetSelection = React.useCallback(() => {
    localStorage.removeItem(TARGET_KEY);
  }, [localStorage]);

  const getCachedTargetSelection = React.useCallback(() => {
    const cachedTarget = localStorage.getItem(TARGET_KEY);
    return cachedTarget ? JSON.parse(cachedTarget) : NO_TARGET;
  }, [localStorage]);

  const selectTargetFromCache = React.useCallback(
    (targets) => {
      if (targets.length === 0) {
        return;
      }

      try {
        const cachedTarget = getCachedTargetSelection();
        const cachedTargetExists = targets.some((target) => _.isEqual(cachedTarget, target));

        if (cachedTargetExists) {
          context.target.setTarget(cachedTarget);
        } else {
          removeCachedTargetSelection();
        }
      } catch (error) {
        context.target.setTarget(NO_TARGET);
        removeCachedTargetSelection();
      }
    },
    [context, context.target, getCachedTargetSelection, removeCachedTargetSelection]
  );

  const onSelect = React.useCallback(
    (evt, selection, isPlaceholder) => {
      if (isPlaceholder) {
        context.target.setTarget(NO_TARGET);
        removeCachedTargetSelection();
      } else {
        if (selection != selected) {
          try {
            context.target.setTarget(selection);
            setCachedTargetSelection(selection);
          } catch (error) {
            notifications.danger('Cannot set target', (error as any).message);
            context.target.setTarget(NO_TARGET);
          }
        }
      }
      setExpanded(false);
    },
    [
      context,
      context.target,
      selected,
      notifications,
      setExpanded,
      removeCachedTargetSelection,
      setCachedTargetSelection,
    ]
  );

  const selectNone = React.useCallback(() => {
    onSelect(undefined, undefined, true);
  }, [onSelect]);

  const refreshTargetList = React.useCallback(() => {
    setLoading(true);
    addSubscription(context.targets.queryForTargets().subscribe(() => setLoading(false)));
  }, [addSubscription, context, context.targets, setLoading]);

  React.useEffect(() => {
    addSubscription(
      context.targets.targets().subscribe((targets) => {
        setTargets(targets);
        selectTargetFromCache(targets);
      })
    );
  }, [addSubscription, context, context.targets, setTargets, selectTargetFromCache]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.TargetJvmDiscovery).subscribe((v) => {
        const evt: TargetDiscoveryEvent = v.message.event;
        if (evt.kind === 'LOST') {
          const target: Target = {
            connectUrl: evt.serviceRef.connectUrl,
            alias: evt.serviceRef.alias,
          };
          context.target
            .target()
            .pipe(first())
            .subscribe((currentTarget) => {
              if (currentTarget.connectUrl === target.connectUrl && currentTarget.alias === target.alias) {
                selectNone();
              }
            });
        }
      })
    );
  }, [addSubscription, context, context.notificationChannel, context.target, selectNone]);

  React.useLayoutEffect(() => {
    addSubscription(context.target.target().subscribe(setSelected));
  }, [addSubscription, context, context.target, setSelected]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshTargetList(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits()
    );
    return () => window.clearInterval(id);
  }, [context, context.target, context.settings, refreshTargetList]);

  const showCreateTargetModal = React.useCallback(() => {
    setModalOpen(true);
  }, [setModalOpen]);

  const createTarget = React.useCallback(
    (target: Target) => {
      setLoading(true);
      addSubscription(
        context.api
          .createTarget(target)
          .pipe(
            first(),
            catchError(() => of(false))
          )
          .subscribe((success) => {
            setLoading(false);
            setModalOpen(false);
            if (!success) {
              notifications.danger('Target Creation Failed');
            }
          })
      );
    },
    [addSubscription, context, context.api, notifications, setLoading, setModalOpen]
  );
  const deletionDialogsEnabled = React.useMemo(
    () => context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteCustomTargets),
    [context, context.settings, context.settings.deletionDialogsEnabledFor]
  );

  const deleteTarget = React.useCallback(() => {
    setLoading(true);
    addSubscription(
      context.api
        .deleteTarget(selected)
        .pipe(first())
        .subscribe(
          () => {
            selectNone();
            setLoading(false);
          },
          () => {
            setLoading(false);
            let id: string;
            if (selected.alias === selected.connectUrl) {
              id = selected.alias;
            } else {
              id = `${selected.alias} [${selected.connectUrl}]`;
            }
            notifications.danger('Target Deletion Failed', `The selected target (${id}) could not be deleted`);
          }
        )
    );
  }, [addSubscription, context, context.api, notifications, selected, setLoading, selectNone]);

  const handleDeleteButton = React.useCallback(() => {
    if (deletionDialogsEnabled) {
      setWarningModalOpen(true);
    } else {
      deleteTarget();
    }
  }, [deletionDialogsEnabled, setWarningModalOpen, deleteTarget]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleCreateModalClose = React.useCallback(() => {
    setModalOpen(false);
  }, [setModalOpen]);

  const deleteArchivedWarningModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteWarningType.DeleteCustomTargets}
        visible={warningModalOpen}
        onAccept={deleteTarget}
        onClose={handleWarningModalClose}
      />
    );
  }, [warningModalOpen, deleteTarget, handleWarningModalClose]);

  const selectOptions = React.useMemo(
    () =>
      [
        <SelectOption key="placeholder" value="Select Target..." isPlaceholder={true} itemCount={targets.length} />,
      ].concat(
        targets.map((t: Target) =>
          t.alias == t.connectUrl || !t.alias ? (
            <SelectOption key={t.connectUrl} value={t} isPlaceholder={false}>{`${t.connectUrl}`}</SelectOption>
          ) : (
            <SelectOption
              key={t.connectUrl}
              value={t}
              isPlaceholder={false}
            >{`${t.alias} (${t.connectUrl})`}</SelectOption>
          )
        )
      ),
    [targets]
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardHeaderMain>
            <Text component={TextVariants.h4}>Target JVM</Text>
          </CardHeaderMain>
          <CardActions>
            <Button
              aria-label="Create target"
              isDisabled={isLoading}
              onClick={showCreateTargetModal}
              variant="control"
              icon={<PlusCircleIcon />}
            />
            <Button
              aria-label="Delete target"
              isDisabled={
                isLoading || selected == NO_TARGET || selected.annotations?.cryostat['REALM'] !== CUSTOM_TARGETS_REALM
              }
              onClick={handleDeleteButton}
              variant="control"
              icon={<TrashIcon />}
            />
            <Button
              aria-label="Refresh targets"
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
            {selectOptions}
          </Select>
        </CardBody>
      </Card>
      <CreateTargetModal
        visible={isModalOpen}
        onSubmit={createTarget}
        onDismiss={handleCreateModalClose}
      ></CreateTargetModal>
      {deleteArchivedWarningModal}
    </>
  );
};

interface TargetDiscoveryEvent {
  kind: 'LOST' | 'FOUND';
  serviceRef: Target;
}
