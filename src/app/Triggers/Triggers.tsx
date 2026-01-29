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

import { ErrorView } from '@app/ErrorView/ErrorView';
import { isAuthFail } from '@app/ErrorView/types';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/types';
import { LoadingView } from '@app/Shared/Components/LoadingView';
import { LoadingProps } from '@app/Shared/Components/types';
import { NotificationCategory, NullableTarget, SmartTrigger, Target } from '@app/Shared/Services/api.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { hashCode, portalRoot, sortResources, TableColumn } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  ActionGroup,
  Button,
  Checkbox,
  Dropdown,
  DropdownList,
  EmptyState,
  EmptyStateHeader,
  EmptyStateIcon,
  Form,
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalVariant,
  OverflowMenu,
  OverflowMenuContent,
  OverflowMenuControl,
  OverflowMenuDropdownItem,
  OverflowMenuGroup,
  OverflowMenuItem,
  SearchInput,
  TextArea,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { EllipsisVIcon, SearchIcon } from '@patternfly/react-icons';
import {
  ISortBy,
  SortByDirection,
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
} from '@patternfly/react-table';
import { t } from 'i18next';
import _ from 'lodash';
import React from 'react';
import { concatMap, first, forkJoin, Observable, of } from 'rxjs';

export type SmartTriggerActions = 'REMOVE';

export interface TriggersTableProps {
  target: Observable<NullableTarget>;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

export const tableColumns: TableColumn[] = [
  {
    title: t('RAW_EXPRESSION'),
    keyPaths: ['rawExpression'],
    sortable: true,
    tooltip: t('Triggers.EXPRESSION_TOOLTIP'),
  },
  {
    title: t('TEMPLATE'),
    keyPaths: ['recordingTemplate'],
    sortable: true,
    tooltip: t('Triggers.TEMPLATE_TOOLTIP'),
  },
  {
    title: t('DURATION_CONSTRAINT'),
    keyPaths: ['durationConstraint'],
    sortable: true,
    tooltip: t('Triggers.DURATION_CONSTRAINT_TOOLTIP'),
  },
  {
    title: t('TARGET_DURATION'),
    keyPaths: ['targetDuration'],
    sortable: true,
    tooltip: t('Triggers.TARGET_DURATION_TOOLTIP'),
  },
  {
    title: t('TRIGGER_CONDITION'),
    keyPaths: ['triggerCondition'],
    sortable: false,
    tooltip: t('Triggers.TARGET_DURATION_TOOLTIP'),
  },
];

export type ArchiveActions = 'DELETE';

export const TriggersTable: React.FC<TriggersTableProps> = ({ toolbarBreakReference }) => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const { t } = useCryostatTranslation();

  const [isLoading, setIsLoading] = React.useState(false);
  const [sortBy, setSortBy] = React.useState({} as ISortBy);
  const [triggers, setTriggers] = React.useState([] as SmartTrigger[]);
  const [filteredTriggers, setFilteredTriggers] = React.useState<SmartTrigger[]>([]);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [filterText, setFilterText] = React.useState('');
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [actionLoadings, setActionLoadings] = React.useState<Record<SmartTriggerActions, boolean>>({ REMOVE: false });
  const [controlEnabled, setControlEnabled] = React.useState(false);

  React.useEffect(() => {
      addSubscription(
        context.target.target().subscribe({
          next: (target) => setControlEnabled(target != null ? target.agent : false),
          error: () => setControlEnabled(false),
        }),
      );
  }, [addSubscription, context, setControlEnabled]);

  const authRetry = React.useCallback(() => {
    context.target.setAuthRetry();
  }, [context.target]);

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

  const handleError = React.useCallback(
    (error) => {
      setIsLoading(false);
      setErrorMessage(error.message);
    },
    [setIsLoading, setErrorMessage],
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

  const handleDeleteTriggers = React.useCallback(() => {
    setActionLoadings((old) => ({ ...old, DELETE: true }));
    const tasks: Observable<boolean>[] = [];
    addSubscription(
      context.target.target().subscribe((t) => {
        if (!t) {
          return;
        }
        filteredTriggers.forEach((r: SmartTrigger) => {
          if (checkedIndices.includes(hashCode(r.rawExpression))) {
            tasks.push(context.api.deleteTrigger(r.rawExpression, t).pipe(first()));
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
    setActionLoadings,
    handlePostActions,
  ]);

  const handleHeaderCheck = React.useCallback(
      (event, checked) => {
        setHeaderChecked(checked);
        setCheckedIndices(checked ? filteredTriggers.map((r) => hashCode(r.rawExpression)) : []);
      },
      [setHeaderChecked, setCheckedIndices, filteredTriggers],
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

    const handleTriggers = React.useCallback(
    (triggers: SmartTrigger[]) => {
      setTriggers(triggers);
      setIsLoading(false);
      setErrorMessage('');
    },
    [setTriggers, setIsLoading, setErrorMessage],
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
                context.api.getTargetTriggers(target).subscribe({
                    next: handleTriggers,
                    error: handleError
                }))
        })
    )
  }, [addSubscription, setIsLoading, context.api, context.target]);

  React.useEffect(() => {
      addSubscription(
        context.target.target().subscribe((target) => {
          setFilterText('');
          refreshTriggers();
        }),
      );
  }, [context.target, addSubscription]);

  React.useEffect(() => {
    let filtered: SmartTrigger[];
    if (!filterText) {
      filtered = triggers;
    } else {
      const reg = new RegExp(_.escapeRegExp(filterText), 'i');
      filtered = triggers.filter(
        (t: SmartTrigger) =>
          reg.test(t.rawExpression) ||
          reg.test(t.recordingTemplate) ||
          reg.test(t.durationConstraint) ||
          reg.test(t.targetDuration) ||
          reg.test(t.triggerCondition),
      );
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

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpDeleted).subscribe((msg) => {
        setTriggers((old) => old.filter((t) => t.rawExpression !== msg.message.trigger));
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshTriggers]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ThreadDumpSuccess).subscribe(() => {
        refreshTriggers();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshTriggers]);

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

  const triggerRows = React.useMemo(() => {
    return filteredTriggers.map((trigger: SmartTrigger, index) => (
      <TriggerRow
        trigger={trigger}
        index={index}
        sourceTarget={context.target.target()}
        checkedIndices={[]}
        handleRowCheck={handleRowCheck}
      />
    ));
  }, [handleRowCheck, context.target, filteredTriggers]);

  const triggersToolbar = React.useMemo(
    () => (
      <TriggersToolbar
        checkedIndices={checkedIndices}
        setFilterText={setFilterText}
        triggers={triggers}
        triggersEnabled={controlEnabled}
        propsTarget={context.target.target()}
        handleDelete={handleDeleteTriggers}
        actionLoadings={actionLoadings}
        toolbarBreakReference={toolbarBreakReference}
      />
    ),
    [checkedIndices, triggers, handleDeleteTriggers, context.target, actionLoadings, toolbarBreakReference],
  );

  if (errorMessage != '') {
    return (
      <ErrorView
        title={'Error retrieving active smart triggers'}
        message={`${errorMessage}. Note: Smart triggers require a Cryostat agent connection to be used`}
        retry={isAuthFail(errorMessage) ? authRetry : undefined}
      />
    );
  } else if (isLoading) {
    return <LoadingView />;
  } else {
    return (
      <>
        {triggersToolbar}
        {triggerRows.length ? (
          <Table aria-label="Smart Triggers table" variant={TableVariant.compact}>
            <Thead>
              <Tr>
                {tableColumns.map(({ title, sortable }, index) => (
                  <Th key={`smart-triggers-header-${title}`} 
                      sort={sortable ? getSortParams(index) : undefined}
                      select={{
                        onSelect: handleHeaderCheck,
                        isSelected: headerChecked,
                      }}>
                    {title}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>{triggerRows}</Tbody>
          </Table>
        ) : (
          <EmptyState>
            <EmptyStateHeader
              titleText="No active Smart Triggers"
              icon={<EmptyStateIcon icon={SearchIcon} />}
              headingLevel="h4"
            />
          </EmptyState>
        )}
      </>
    );
  }
};

export interface TriggerRowProps {
  trigger: SmartTrigger;
  index: number;
  sourceTarget: Observable<NullableTarget>;
  checkedIndices: number[];
  handleRowCheck: (checked: boolean, rowIdx: string | number) => void;
}

export const TriggerRow: React.FC<TriggerRowProps> = ({ trigger, index, checkedIndices, handleRowCheck }) => {
  const handleCheck = React.useCallback(
    (_, checked: boolean) => {
      handleRowCheck(checked, index);
    },
    [index, handleRowCheck],
  );

  const parentRow = React.useMemo(() => {
    return (
      <Tr key={`smart-trigger-${index}`}>
        <Td key={`smart-trigger-table-row-${index}_0`}>
          <Checkbox
            name={`smart-trigger-table-row-${index}-check`}
            onChange={handleCheck}
            isChecked={checkedIndices.includes(index)}
            id={`smart-trigger-table-row-${index}-check`}
            data-quickstart-id={`smart-trigger-check-box`}
          />
        </Td>
        <Td key={`smart-trigger-expression-${index}`} dataLabel={tableColumns[0].title}>
          {trigger.rawExpression}
        </Td>
        <Td key={`smart-trigger-template-${index}`} dataLabel={tableColumns[1].title}>
          {trigger.recordingTemplate}
        </Td>
        <Td key={`smart-trigger-duration-constraint-${index}`} width={25} dataLabel={tableColumns[3].title}>
          {trigger.durationConstraint}
        </Td>
        <Td key={`smart-trigger-target-duration-${index}`} dataLabel={tableColumns[4].title}>
          {trigger.targetDuration}
        </Td>
        <Td key={`smart-trigger-condition-${index}`} dataLabel={tableColumns[5].title}>
          {trigger.triggerCondition}
        </Td>
      </Tr>
    );
  }, [trigger, index, checkedIndices, handleCheck]);

  return <Tbody key={index}>{parentRow}</Tbody>;
};

export interface TriggersTableToolbarProps {
  checkedIndices: number[];
  triggers: SmartTrigger[];
  propsTarget: Observable<NullableTarget>;
  triggersEnabled: boolean;
  handleDelete: () => void;
  setFilterText: (s: string) => void;
  actionLoadings: Record<SmartTriggerActions, boolean>;
  toolbarBreakReference?: HTMLElement | (() => HTMLElement);
}

const TriggersToolbar: React.FC<TriggersTableToolbarProps> = (props) => {
  const context = React.useContext(ServiceContext);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [actionToggleOpen, setActionToggleOpen] = React.useState(false);
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);

  const handleFilterTextChange = React.useCallback(
    (_, value: string) => props.setFilterText(value),
    [props],
  );

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
    if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteThreadDump)) {
      setWarningModalOpen(true);
    } else {
      props.handleDelete();
    }
  }, [context.settings, setWarningModalOpen, props]);

  const deleteTriggerWarningModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteSmartTrigger}
        visible={warningModalOpen}
        onAccept={props.handleDelete}
        onClose={handleWarningModalClose}
      />
    );
  }, [warningModalOpen, props.handleDelete, handleWarningModalClose]);

  const createTriggersModal = React.useMemo(() => {
    return (
      <CreateSmartTriggersModal isOpen={uploadModalOpen} target={props.propsTarget} onClose={handleUploadModalClose} />
    );
  }, [uploadModalOpen, props.propsTarget, handleUploadModalClose]);

  const actionLoadingProps = React.useMemo<Record<ArchiveActions, LoadingProps>>(
    () => ({
      DELETE: {
        spinnerAriaValueText: 'Deleting',
        spinnerAriaLabel: 'deleting-smart-triggers',
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
            isDisabled={!props.checkedIndices.length || props.actionLoadings['DELETE'] || !props.triggersEnabled}
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
          <Button variant="secondary" onClick={handleUploadModalOpen} isDisabled={/*!props.triggersEnabled*/ false} {...actionLoadingProps['CREATE']}>
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
              onChange={handleFilterTextChange}
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
        {deleteTriggerWarningModal}
        {createTriggersModal}
      </ToolbarContent>
    </Toolbar>
  );
};

export interface CreateSmartTriggersModalProps {
  isOpen: boolean;
  target: Observable<NullableTarget>;
  onClose: () => void;
}

export const CreateSmartTriggersModal: React.FC<CreateSmartTriggersModalProps> = ({
  onClose,
  target: propsTarget,
  ...props
}) => {
  const addSubscription = useSubscriptions();
  const context = React.useContext(ServiceContext);
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
      reset();
      onClose();
    }
  }, [uploading, abortRef, reset, onClose]);

  const handleSubmit = React.useCallback(() => {
    submitRef.current && submitRef.current.click();
    addSubscription(
        context.target.target().subscribe((target) => {
            if (!target) {
                return;
            }
            context.api.addTriggers(expressionInput, target);
        })
    )
  }, [addSubscription, context.api, expressionInput, submitRef]);

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
        <ActionGroup>
          <>
            <Button
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
