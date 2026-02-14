/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { ColumnConfig, DiagnosticsTable } from '@app/Diagnostics/DiagnosticsTable';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { CEL_SPEC_HREF } from '@app/Rules/utils';
import { LoadingProps } from '@app/Shared/Components/types';

import { NotificationCategory, NullableTarget, SmartTrigger } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { TableColumn, hashCode, portalRoot, sortResources } from '@app/utils/utils';
import {
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Dropdown,
  DropdownList,
  MenuToggleElement,
  MenuToggle,
  Checkbox,
  Button,
  OverflowMenuDropdownItem,
  OverflowMenu,
  OverflowMenuContent,
  OverflowMenuGroup,
  OverflowMenuItem,
  OverflowMenuControl,
  ValidatedOptions,
  Modal,
  ModalVariant,
  Form,
  FormGroup,
  TextArea,
  ActionGroup,
  SearchInput,
  Bullseye,
  EmptyState,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateBody,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { EllipsisVIcon, SearchIcon } from '@patternfly/react-icons';
import { ISortBy, SortByDirection, Tbody, Td, ThProps, Tr } from '@patternfly/react-table';
import { t } from 'i18next';
import _ from 'lodash';
import * as React from 'react';
import { Trans } from 'react-i18next';
import { first, forkJoin, Observable } from 'rxjs';

export const tableColumns: TableColumn[] = [
  {
    title: 'ID',
    keyPaths: ['id'],
    sortable: true,
  },
  {
    title: 'Trigger Condition',
    keyPaths: ['triggerCondition'],
    sortable: false,
    tooltip: t('Triggers.TARGET_DURATION_TOOLTIP'),
  },
  {
    title: 'Duration Constraint',
    keyPaths: ['durationConstraint'],
    sortable: true,
    tooltip: t('Triggers.DURATION_CONSTRAINT_TOOLTIP'),
  },
  {
    title: 'Template',
    keyPaths: ['recordingTemplateName'],
    sortable: true,
    tooltip: t('Triggers.TEMPLATE_TOOLTIP'),
  },
];

export interface SmartTriggersProps {
  target: Observable<NullableTarget>;
  isNestedTable: boolean;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

export const SmartTriggersTable: React.FC<SmartTriggersProps> = ({
  target: propsTarget,
  isNestedTable,
  toolbarBreakReference,
}) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [triggers, setTriggers] = React.useState<SmartTrigger[]>([]);
  const [filteredTriggers, setFilteredTriggers] = React.useState<SmartTrigger[]>([]);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [controlEnabled, setControlEnabled] = React.useState(false);
  const [filterText, setFilterText] = React.useState('');
  const [sortBy, setSortBy] = React.useState<ISortBy>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [actionLoadings, setActionLoadings] = React.useState<Record<ArchiveActions, boolean>>({ DELETE: false });

  const getSortParams = React.useCallback(
    (columnIndex: number): ThProps['sort'] => ({
      sortBy: sortBy,
      onSort: (_event, index, direction) => {
        setSortBy({
          index: index,
          direction: direction,
        });
      },
      columnIndex,
    }),
    [sortBy, setSortBy],
  );

  const handleTriggers = React.useCallback(
    (triggers: SmartTrigger[]) => {
      setTriggers(triggers);
      setIsLoading(false);
      setErrorMessage('');
    },
    [setTriggers, setIsLoading, setErrorMessage],
  );

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
  );

  const handleHeaderCheck = React.useCallback(
    (event, checked) => {
      setHeaderChecked(checked);
      setCheckedIndices(checked ? filteredTriggers.map((r) => hashCode(r.id)) : []);
    },
    [setHeaderChecked, setCheckedIndices, filteredTriggers],
  );

  const handlePostActions = React.useCallback(
    (action: ArchiveActions) => {
      setActionLoadings((old) => {
        const newActionLoadings = { ...old };
        newActionLoadings[action] = false;
        return newActionLoadings;
      });
    },
    [setActionLoadings],
  );

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe({
        next: (target) => setControlEnabled(target != null ? target.agent : false),
        error: () => setControlEnabled(false),
      }),
    );
  }, [addSubscription, context, setControlEnabled]);

  const handleDeleteTriggers = React.useCallback(() => {
    setActionLoadings((old) => ({ ...old, DELETE: true }));
    const tasks: Observable<boolean>[] = [];
    addSubscription(
      propsTarget.subscribe((t) => {
        if (!t) {
          return;
        }
        filteredTriggers.forEach((r: SmartTrigger) => {
          if (checkedIndices.includes(hashCode(r.id))) {
            tasks.push(context.api.deleteTrigger(r.id, t).pipe(first()));
          }
        });
        addSubscription(
          forkJoin(tasks).subscribe({
            next: () => handlePostActions('DELETE'),
            error: () => handlePostActions('DELETE'),
          }),
        );
      }),
    );
  }, [
    addSubscription,
    filteredTriggers,
    checkedIndices,
    context.api,
    propsTarget,
    setActionLoadings,
    handlePostActions,
  ]);

  const handleCreateTriggers = React.useCallback(
    (s: string) => {
      setActionLoadings((old) => ({ ...old, DELETE: true }));
      const tasks: Observable<boolean>[] = [];
      addSubscription(
        propsTarget.subscribe((t) => {
          if (!t) {
            return;
          }
          tasks.push(context.api.addTriggers(s, t).pipe(first()));
          addSubscription(
            forkJoin(tasks).subscribe({
              next: () => handlePostActions('DELETE'),
              error: () => handlePostActions('DELETE'),
            }),
          );
        }),
      );
    },
    [addSubscription, context.api, propsTarget, setActionLoadings, handlePostActions],
  );
  const handleRowCheck = React.useCallback(
    (checked, index) => {
      if (checked) {
        setCheckedIndices((ci) => [...ci, index]);
      } else {
        setHeaderChecked(false);
        setCheckedIndices((ci) => ci.filter((v) => v !== index));
      }
    },
    [setCheckedIndices, setHeaderChecked],
  );

  const refreshTriggers = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(
      context.target.target().subscribe((target) => {
        if (!target) {
          setIsLoading(false);
          return;
        }
        addSubscription(
          context.api.getTargetTriggers(target, true).subscribe({
            next: handleTriggers,
            error: handleError,
          }),
        );
      }),
    );
  }, [addSubscription, setIsLoading, handleError, handleTriggers, context.api, context.target]);

  React.useEffect(() => {
    setCheckedIndices((ci) => {
      const filteredTriggerIdx = new Set(filteredTriggers.map((r) => hashCode(r.id)));
      return ci.filter((idx) => filteredTriggerIdx.has(idx));
    });
  }, [filteredTriggers, setCheckedIndices]);

  React.useEffect(() => {
    setHeaderChecked(checkedIndices.length === filteredTriggers.length);
  }, [setHeaderChecked, checkedIndices, filteredTriggers.length]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.TriggerDeleted).subscribe((msg) => {
        setTriggers((old) => old.filter((t) => t.id !== msg.message.trigger));
      }),
    );
  }, [addSubscription, context.notificationChannel, setTriggers]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.TriggerCreated).subscribe(() => {
        refreshTriggers();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshTriggers]);

  React.useEffect(() => {
    refreshTriggers();
  }, [refreshTriggers]);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(
      () => refreshTriggers(),
      context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits(),
    );
    return () => window.clearInterval(id);
  }, [context.settings, refreshTriggers]);

  React.useEffect(() => {
    let filtered: SmartTrigger[];
    if (!filterText) {
      filtered = triggers;
    } else {
      const reg = new RegExp(_.escapeRegExp(filterText), 'i');
      filtered = triggers.filter((t: SmartTrigger) => reg.test(t.id));
    }

    setFilteredTriggers(
      sortResources(
        {
          index: sortBy.index ?? 0,
          direction: sortBy.direction ?? SortByDirection.asc,
        },
        filtered,
        tableColumns,
      ),
    );
  }, [filterText, triggers, sortBy, setFilteredTriggers]);

  const triggersToolbar = React.useMemo(
    () => (
      <SmartTriggersToolbar
        checkedIndices={checkedIndices}
        triggers={triggers}
        filteredTriggers={filteredTriggers}
        handleDelete={handleDeleteTriggers}
        handleUpload={handleCreateTriggers}
        setFilterText={setFilterText}
        controlEnabled={controlEnabled}
        actionLoadings={actionLoadings}
        toolbarBreakReference={toolbarBreakReference}
      />
    ),
    [
      controlEnabled,
      checkedIndices,
      triggers,
      filteredTriggers,
      handleDeleteTriggers,
      handleCreateTriggers,
      actionLoadings,
      toolbarBreakReference,
    ],
  );

  const columnConfig: ColumnConfig = React.useMemo(
    () => ({
      columns: tableColumns,
      onSort: getSortParams,
    }),
    [getSortParams],
  );

  if (controlEnabled) {
    return (
      <DiagnosticsTable
        tableTitle="Smart Triggers"
        toolbar={triggersToolbar}
        tableColumns={columnConfig}
        isHeaderChecked={headerChecked}
        onHeaderCheck={handleHeaderCheck}
        isLoading={isLoading}
        isEmpty={!triggers.length}
        isEmptyFilterResult={!filteredTriggers.length}
        isNestedTable={isNestedTable}
        errorMessage={errorMessage}
      >
        {filteredTriggers.map((r) => (
          <SmartTriggerRow
            key={r.id}
            trigger={r}
            index={hashCode(r.id)}
            sourceTarget={propsTarget}
            checkedIndices={checkedIndices}
            handleRowCheck={handleRowCheck}
          />
        ))}
      </DiagnosticsTable>
    );
  } else {
    return (
      <Bullseye>
        <EmptyState>
          <EmptyStateHeader
            titleText={<>Smart Triggers not supported</>}
            icon={<EmptyStateIcon icon={SearchIcon} />}
            headingLevel="h4"
          />
          <EmptyStateBody>
            Smart Triggers are not supported for the selected target. Only Cryostat agent targets support use of Smart
            Triggers.
          </EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }
};

export interface SmartTriggerRowProps {
  trigger: SmartTrigger;
  index: number;
  sourceTarget: Observable<NullableTarget>;
  checkedIndices: number[];
  handleRowCheck: (checked: boolean, rowIdx: string | number) => void;
}

export const SmartTriggerRow: React.FC<SmartTriggerRowProps> = ({ trigger, index, checkedIndices, handleRowCheck }) => {
  const handleCheck = React.useCallback(
    (_, checked: boolean) => {
      handleRowCheck(checked, index);
    },
    [index, handleRowCheck],
  );

  const parentRow = React.useMemo(() => {
    return (
      <Tr key={`${index}_parent`}>
        <Td key={`smart-trigger-table-row-${index}_0`}>
          <Checkbox
            name={`smart-trigger-table-row-${index}-check`}
            onChange={handleCheck}
            isChecked={checkedIndices.includes(index)}
            id={`smart-trigger-table-row-${index}-check`}
            data-quickstart-id="smart-triggers-check-box"
          />
        </Td>
        <Td key={`smart-trigger-table-row-${index}_1`} dataLabel={tableColumns[0].title}>
          {trigger.id}
        </Td>
        <Td key={`smart-trigger-table-row-${index}_2`} dataLabel={tableColumns[1].title}>
          {trigger.triggerCondition}
        </Td>
        <Td key={`smart-trigger-table-row-${index}_3`} dataLabel={tableColumns[2].title}>
          {trigger.durationConstraint != '' ? trigger.durationConstraint : 'None'}
        </Td>
        <Td key={`smart-trigger-table-row-${index}_4`} dataLabel={tableColumns[3].title}>
          {trigger.recordingTemplateName}
        </Td>
      </Tr>
    );
  }, [trigger, index, checkedIndices, handleCheck]);

  return <Tbody key={index}>{parentRow}</Tbody>;
};

export type ArchiveActions = 'DELETE';

export interface SmartTriggersTableToolbarProps {
  checkedIndices: number[];
  triggers: SmartTrigger[];
  filteredTriggers: SmartTrigger[];
  handleDelete: () => void;
  handleUpload: (s: string) => void;
  setFilterText: (s: string) => void;
  controlEnabled: boolean;
  actionLoadings: Record<ArchiveActions, boolean>;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

const SmartTriggersToolbar: React.FC<SmartTriggersTableToolbarProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [actionToggleOpen, setActionToggleOpen] = React.useState(false);

  const handleActionToggle = React.useCallback(() => setActionToggleOpen((old) => !old), [setActionToggleOpen]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const handleUploadModalClose = React.useCallback(() => {
    setUploadModalOpen(false);
  }, [setUploadModalOpen]);

  const handleUploadModalOpen = React.useCallback(() => {
    setUploadModalOpen(true);
  }, [setUploadModalOpen]);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteSmartTrigger)) {
      setWarningModalOpen(true);
    } else {
      props.handleDelete();
    }
  }, [context.settings, setWarningModalOpen, props]);

  const deleteSmartTriggerWarningModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteSmartTrigger}
        visible={warningModalOpen}
        onAccept={props.handleDelete}
        onClose={handleWarningModalClose}
      />
    );
  }, [warningModalOpen, props.handleDelete, handleWarningModalClose]);

  const createSmartTriggerModal = React.useMemo(() => {
    return (
      <CreateSmartTriggersModal
        isOpen={uploadModalOpen}
        onAccept={props.handleUpload}
        onClose={handleUploadModalClose}
      />
    );
  }, [uploadModalOpen, props.handleUpload, handleUploadModalClose]);

  const actionLoadingProps = React.useMemo<Record<ArchiveActions, LoadingProps>>(
    () => ({
      DELETE: {
        spinnerAriaValueText: 'Deleting',
        spinnerAriaLabel: 'deleting-smart-trigger',
        isLoading: props.actionLoadings['DELETE'],
      } as LoadingProps,
      CREATE: {
        spinnerAriaValueText: 'Creating',
        spinnerAriaLabel: 'creating-smart-triggers',
        isLoading: props.actionLoadings['CREATE'],
      } as LoadingProps,
    }),
    [props],
  );

  const buttons = React.useMemo(() => {
    return [
      {
        default: (
          <Button
            variant="danger"
            onClick={handleDeleteButton}
            isDisabled={!props.checkedIndices.length || props.actionLoadings['DELETE']}
            {...actionLoadingProps['DELETE']}
          >
            {props.actionLoadings['DELETE'] ? 'Deleting' : 'Delete'}
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Delete'} isShared onClick={handleDeleteButton}>
            {props.actionLoadings['DELETE'] ? 'Deleting' : 'Delete'}
          </OverflowMenuDropdownItem>
        ),
        key: 'Delete',
      },
      {
        default: (
          <Button
            variant="secondary"
            onClick={handleUploadModalOpen}
            isDisabled={!props.controlEnabled}
            {...actionLoadingProps['CREATE']}
          >
            {props.actionLoadings['CREATE'] ? 'Creating' : 'Create'}
          </Button>
        ),
        collapsed: (
          <OverflowMenuDropdownItem key={'Create'} isShared onClick={handleUploadModalOpen}>
            {props.actionLoadings['CREATE'] ? 'Creating' : 'Create'}
          </OverflowMenuDropdownItem>
        ),
        key: 'Create',
      },
    ];
  }, [
    handleDeleteButton,
    handleUploadModalOpen,
    props.checkedIndices.length,
    props.actionLoadings,
    props.controlEnabled,
    actionLoadingProps,
  ]);

  return (
    <Toolbar id="smart-triggers-toolbar" aria-label="smart-triggers-toolbar">
      <ToolbarContent>
        <ToolbarGroup variant="filter-group">
          <ToolbarItem>
            <SearchInput
              style={{ minWidth: '36ch' }}
              name="smartTriggersFilter"
              id="smartTriggersFilter"
              type="search"
              placeholder={t('Triggers.SEARCH_PLACEHOLDER')}
              aria-label={t('Triggers.ARIA_LABELS.SEARCH_INPUT')}
              onChange={(_, value: string) => props.setFilterText(value)}
            />
          </ToolbarItem>
        </ToolbarGroup>
        <ToolbarItem variant="separator" className="smart-triggers-toolbar-separator" />
        <ToolbarGroup variant="button-group" style={{ alignSelf: 'start' }}>
          <ToolbarItem variant="overflow-menu">
            <OverflowMenu
              breakpoint="sm"
              breakpointReference={
                props.toolbarBreakReference ||
                (() => document.getElementById('smart-triggers-toolbar') || document.body)
              }
            >
              <OverflowMenuContent>
                <OverflowMenuGroup groupType="button">
                  {buttons.map((b) => (
                    <OverflowMenuItem key={b.key}>{b.default}</OverflowMenuItem>
                  ))}
                </OverflowMenuGroup>
              </OverflowMenuContent>
              <OverflowMenuControl>
                <Dropdown
                  onSelect={() => setActionToggleOpen(false)}
                  toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                    <MenuToggle variant="plain" ref={toggleRef} onClick={() => handleActionToggle()}>
                      <EllipsisVIcon />
                    </MenuToggle>
                  )}
                  onOpenChange={setActionToggleOpen}
                  onOpenChangeKeys={['Escape']}
                  isOpen={actionToggleOpen}
                  popperProps={{
                    appendTo: portalRoot,
                    enableFlip: true,
                  }}
                >
                  <DropdownList>{buttons.map((b) => b.collapsed)}</DropdownList>
                </Dropdown>
              </OverflowMenuControl>
            </OverflowMenu>
          </ToolbarItem>
        </ToolbarGroup>
        {deleteSmartTriggerWarningModal}
        {createSmartTriggerModal}
      </ToolbarContent>
    </Toolbar>
  );
};

export interface CreateSmartTriggersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (s: string) => void;
}

export const CreateSmartTriggersModal: React.FC<CreateSmartTriggersModalProps> = ({ onClose, ...props }) => {
  const submitRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to submit trigger div
  const abortRef = React.useRef<HTMLDivElement>(null); // Use ref to refer to abort trigger div

  const [uploading, setUploading] = React.useState(false);

  const expressionRegex = RegExp('\\[(.*(&&)*|(\\|\\|)*)\\]~([\\w\\-]+)(?:\\.jfc)?');

  const [expressionInput, setExpressionInput] = React.useState('');
  const [expressionValid, setExpressionValid] = React.useState(ValidatedOptions.default);

  const reset = React.useCallback(() => {
    setUploading(false);
  }, [setUploading]);

  const handleClose = React.useCallback(() => {
    if (uploading) {
      abortRef.current && abortRef.current.click();
    } else {
      setExpressionInput('');
      reset();
      onClose();
    }
  }, [uploading, abortRef, reset, onClose]);

  const handleSubmit = React.useCallback(() => {
    submitRef.current && submitRef.current.click();
    props.onAccept(expressionInput);
    setUploading(false);
    onClose();
    setExpressionInput('');
  }, [props, onClose, expressionInput, submitRef]);

  const submitButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Submitting',
        spinnerAriaLabel: 'submitting-custom-smart-trigger',
        isLoading: uploading,
      }) as LoadingProps,
    [uploading],
  );

  return (
    <Modal
      isOpen={props.isOpen}
      variant={ModalVariant.large}
      showClose={true}
      onClose={handleClose}
      title="Create custom Smart Trigger"
      description="Create a customized Smart Trigger. This is a specialized tool available in the Cryostat Agent that listens for a condition to be met for a specified Mbean, after which a recording will be started with the specified template. This is only available for targets using the Cryostat Agent."
    >
      <Form>
        <FormGroup label="Smart Trigger definition" isRequired fieldId="definition">
          <TextArea
            value={expressionInput}
            isRequired
            type="text"
            id="expr"
            aria-describedby="expr-helper"
            onChange={(_event, v) => {
              setExpressionInput(v);
              expressionRegex.test(v)
                ? setExpressionValid(ValidatedOptions.success)
                : setExpressionValid(ValidatedOptions.error);
            }}
            validated={expressionValid}
            autoFocus
            autoResize
            resizeOrientation="vertical"
          />
        </FormGroup>
        <FormHelperText>
          <Trans t={t} components={{ a: <a target="_blank" href={CEL_SPEC_HREF} /> }}>
            Triggers.DEFINITION_HELPER_TEXT
          </Trans>
        </FormHelperText>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('Triggers.DEFINITION_HINT')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant={expressionValid}>
              {expressionValid === ValidatedOptions.error ? t('Triggers.DEFINITION_HINT_BODY') : ''}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
        <ActionGroup>
          <>
            <Button
              aria-label="submit-button"
              variant="primary"
              onClick={handleSubmit}
              isDisabled={expressionValid != ValidatedOptions.success}
              {...submitButtonLoadingProps}
            >
              {uploading ? 'Submitting' : 'Submit'}
            </Button>
            <Button variant="link" onClick={handleClose}>
              Cancel
            </Button>
          </>
        </ActionGroup>
      </Form>
    </Modal>
  );
};
