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
import { isEqualTarget, NO_TARGET, Target } from '@app/Shared/Services/Target.service';
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
import { ContainerNodeIcon, PlusCircleIcon, TrashIcon } from '@patternfly/react-icons';
import { of } from 'rxjs';
import { catchError, first } from 'rxjs/operators';
import { CreateTargetModal } from './CreateTargetModal';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { getFromLocalStorage, removeFromLocalStorage, saveToLocalStorage } from '@app/utils/LocalStorage';

export const CUSTOM_TARGETS_REALM = 'Custom Targets';
export interface TargetSelectProps {}

export const TargetSelect: React.FunctionComponent<TargetSelectProps> = (props) => {
  const notifications = React.useContext(NotificationsContext);
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [selected, setSelected] = React.useState(NO_TARGET);
  const [targets, setTargets] = React.useState([] as Target[]);
  const [expanded, setExpanded] = React.useState(false);
  const [isLoading, setLoading] = React.useState(false);
  const [isModalOpen, setModalOpen] = React.useState(false);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);

  const setCachedTargetSelection = React.useCallback(
    (target) => saveToLocalStorage('TARGET', target),
    [saveToLocalStorage]
  );

  const removeCachedTargetSelection = React.useCallback(
    () => removeFromLocalStorage('TARGET'),
    [removeFromLocalStorage]
  );

  const getCachedTargetSelection = React.useCallback(
    () => getFromLocalStorage('TARGET', NO_TARGET),
    [getFromLocalStorage]
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
    [context.target, selected, notifications, setExpanded, removeCachedTargetSelection, setCachedTargetSelection]
  );

  const selectNone = React.useCallback(() => {
    onSelect(undefined, NO_TARGET, true);
  }, [onSelect]);

  const selectTargetFromCache = React.useCallback(
    (targets) => {
      if (targets.length) {
        const cachedTarget = getCachedTargetSelection();
        const cachedTargetExists = targets.some((target: Target) => isEqualTarget(cachedTarget, target));
        if (cachedTargetExists) {
          context.target.setTarget(cachedTarget);
        } else {
          selectNone();
          removeCachedTargetSelection();
        }
      } else {
        selectNone();
        removeCachedTargetSelection();
      }
    },
    [context.target, isEqualTarget, getCachedTargetSelection, removeCachedTargetSelection, selectNone]
  );

  React.useEffect(() => {
    addSubscription(
      context.targets.targets().subscribe((targets) => {
        // Target Discovery notifications will trigger an event here.
        setTargets(targets);
        selectTargetFromCache(targets);
      })
    );
  }, [addSubscription, context.targets, setTargets, selectTargetFromCache]);

  React.useEffect(() => {
    addSubscription(context.target.target().subscribe(setSelected));
  }, [addSubscription, context.target, setSelected]);

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
    [addSubscription, context.api, notifications, setLoading, setModalOpen]
  );

  const deleteTarget = React.useCallback(() => {
    setLoading(true);
    addSubscription(
      context.api
        .deleteTarget(selected)
        .pipe(first())
        .subscribe({
          next: () => setLoading(false),
          error: () => {
            setLoading(false);
            const id =
              !selected.alias || selected.alias === selected.connectUrl
                ? selected.connectUrl
                : `${selected.alias} [${selected.connectUrl}]`;
            notifications.danger('Target Deletion Failed', `The selected target (${id}) could not be deleted`);
          },
        })
    );
  }, [addSubscription, context.api, notifications, selected, setLoading]);

  const deletionDialogsEnabled = React.useMemo(
    () => context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteCustomTargets),
    [context.settings]
  );

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
        <SelectOption key="placeholder" value="Select target..." isPlaceholder={true} itemCount={targets.length} />,
      ].concat(
        targets.map((t: Target) => (
          <SelectOption key={t.connectUrl} value={t} isPlaceholder={false}>
            {!t.alias || t.alias === t.connectUrl ? `${t.connectUrl}` : `${t.alias} (${t.connectUrl})`}
          </SelectOption>
        ))
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
          </CardActions>
        </CardHeader>
        <CardBody>
          <Select
            toggleIcon={<ContainerNodeIcon />}
            variant={SelectVariant.single}
            onSelect={onSelect}
            onToggle={setExpanded}
            selections={selected.alias || selected.connectUrl}
            isDisabled={isLoading}
            isOpen={expanded}
            aria-label="Select Target"
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
