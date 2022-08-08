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
import { Target } from '@app/Shared/Services/Target.service';
import { StoredCredential } from '@app/Shared/Services/Api.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Button,
  Checkbox,
  EmptyState,
  EmptyStateIcon,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { forkJoin, Observable } from 'rxjs';

import { TableComposable, Tbody, Th, Thead, Tr } from '@patternfly/react-table';
import { CreateJmxCredentialModal } from './CreateJmxCredentialModal';
import { SecurityCard } from '../SecurityPanel';
import { CredentialsTableRow } from './CredentialsTableRow';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';

import _ from 'lodash';
import { TargetDiscoveryEvent } from '@app/Shared/Services/Targets.service';

export const StoreJmxCredentials = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [credentials, setCredentials] = React.useState([] as StoredCredential[]);
  const [expandedCredentials, setExpandedCredentials] = React.useState([] as StoredCredential[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const tableColumns: string[] = ['Match Expression', 'Count'];
  const tableTitle = 'Stored Credentials';

  const handleTargetNotification = React.useCallback((target: Target, kind: string) => {
    setCredentials(old => {
      let updated = [...old];
      for (let i = 0; i < updated.length; i++) {
        let match: boolean = eval(updated[i].matchExpression);
        if (match) {
          updated[i].numMatchingTargets += (kind === 'FOUND' ? 1 : -1);
        }
      }
      return updated;
    });
  }, [setCredentials]);

  const refreshStoredCredentials = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(context.api.getCredentials().subscribe((credentials: StoredCredential[]) => {
      setCredentials(credentials);
      setIsLoading(false);
    }));
  }, [addSubscription, context, context.api, setIsLoading, setCredentials]);

  React.useEffect(() => {
    refreshStoredCredentials();
  }, []);

  React.useEffect(() => {
    if (!context.settings.autoRefreshEnabled()) {
      return;
    }
    const id = window.setInterval(() => refreshStoredCredentials(), context.settings.autoRefreshPeriod() * context.settings.autoRefreshUnits());
    return () => window.clearInterval(id);
  }, [context.target, context.settings, refreshStoredCredentials]);

  React.useEffect(() => {
    addSubscription(context.notificationChannel.messages(NotificationCategory.CredentialsStored).subscribe((v) => {
      setCredentials(old => old.concat([v.message]));
    }));
  }, [addSubscription ,context, context.notificationChannel, setCredentials]);

  React.useEffect(() => {
    addSubscription(context.notificationChannel.messages(NotificationCategory.CredentialsDeleted).subscribe((v) => {
      setCredentials(old => old.filter(c => c.matchExpression !== v.message.matchExpression));
    }));
  }, [addSubscription, context, context.notificationChannel, setCredentials]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.TargetJvmDiscovery)
      .subscribe(
        v => {
          const evt: TargetDiscoveryEvent = v.message.event;
          const target: Target = evt.serviceRef;
          if (evt.kind === 'FOUND' || evt.kind === 'LOST') {
            handleTargetNotification(target, evt.kind);
          }
        }
      )
    );
  }, [addSubscription, context, context.notificationChannel, handleTargetNotification])

  const handleRowCheck = React.useCallback(
    (checked, index) => {
      if (checked) {
        setCheckedIndices((ci) => [...ci, index]);
      } else {
        setHeaderChecked(false);
        setCheckedIndices((ci) => ci.filter((v) => v !== index));
      }
    },
    [setCheckedIndices, setHeaderChecked]
  );

  const handleHeaderCheck = React.useCallback(
    (event, checked) => {
      setHeaderChecked(checked);
      setCheckedIndices(checked ? Array.from(new Array(matchExpressionRows.length), (x, i) => i) : []);
    },
    [setHeaderChecked, setCheckedIndices, credentials]
  );

  const handleDeleteCredentials = React.useCallback(() => {
    const tasks: Observable<any>[] = [];
    credentials.forEach((credential, idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        tasks.push(context.api.deleteCredentials(credential.id));
      }
    });
    addSubscription(forkJoin(tasks).subscribe());
  }, [credentials, checkedIndices, handleRowCheck, context, context.api, addSubscription]);

  const handleAuthModalOpen = React.useCallback(() => {
    setShowAuthModal(true);
  }, [setShowAuthModal]);

  const handleAuthModalClose = React.useCallback(() => {
    setShowAuthModal(false);
  }, [setShowAuthModal]);

  const handleDeleteButton = React.useCallback(() => {
    if (context.settings.deletionDialogsEnabledFor(DeleteWarningType.DeleteJMXCredentials)) {
      setWarningModalOpen(true);
    }
    else {
      handleDeleteCredentials();
    }
  }, [context, context.settings, setWarningModalOpen, handleDeleteCredentials]);

  const handleWarningModalClose = React.useCallback(() => {
    setWarningModalOpen(false);
  }, [setWarningModalOpen]);

  const TargetCredentialsToolbar = () => {
    const buttons = React.useMemo(() => {
      const arr = [
        <Button variant="primary" aria-label="add-jmx-credential" onClick={handleAuthModalOpen}>
          Add
        </Button>,
        <Button key="delete" variant="danger" aria-label="delete-selected-jmx-credential" onClick={handleDeleteButton} isDisabled={!checkedIndices.length}>
          Delete
        </Button>,
      ];
      return (
        <>
          {arr.map((btn, idx) => (
            <ToolbarItem key={idx}>{btn}</ToolbarItem>
          ))}
        </>
      );
    }, [checkedIndices]);

    const deleteCredentialModal = React.useMemo(() => {
      return <DeleteWarningModal
        warningType={DeleteWarningType.DeleteJMXCredentials}
        visible={warningModalOpen}
        onAccept={handleDeleteCredentials}
        onClose={handleWarningModalClose}
      />
    }, [checkedIndices]);

    return (
      <Toolbar id="target-credentials-toolbar">
        <ToolbarContent>{buttons}</ToolbarContent>
        { deleteCredentialModal }
      </Toolbar>
    );
  };

  const handleCheck = React.useCallback((checked, index) => {
    handleRowCheck(checked, index);
  }, [handleRowCheck]);

  const handleToggleExpanded = React.useCallback((index) => {
    const credential: StoredCredential = credentials[index];
    const idx = expandedCredentials.indexOf(credential);
    setExpandedCredentials(expandedCredentials => idx >=0 ? [...expandedCredentials.slice(0, idx), ...expandedCredentials.slice(idx + 1, expandedCredentials.length)] : [...expandedCredentials, credential]);
  }, [credentials, expandedCredentials])

  const matchExpressionRows = React.useMemo(() => {
    const rows: JSX.Element[] = [];
    for (var i = 0; i < credentials.length; i++) {
      rows.push(<CredentialsTableRow
        key={i}
        index={i}
        label={tableColumns[0]}
        colSpan={tableColumns.length+2}
        id={credentials[i].id}
        matchExpression={credentials[i].matchExpression}
        count={credentials[i].numMatchingTargets}
        isChecked={checkedIndices.includes(i)}
        isExpanded={expandedCredentials.includes(credentials[i])}
        handleCheck={(state: boolean, index: number) => handleCheck(state, index)}
        handleToggleExpanded={(index: number) => handleToggleExpanded(index)}
      />);
    }
    return rows;
  }, [credentials, expandedCredentials, checkedIndices]);

  let content: JSX.Element;
  if (isLoading) {
    content = (<>
      <LoadingView />
    </>);
  } else if (credentials.length === 0) {
    content = (<>
      <EmptyState>
        <EmptyStateIcon icon={SearchIcon} />
        <Title headingLevel="h4" size="lg">
          No {tableTitle}
        </Title>
      </EmptyState>
    </>);
  } else {
    content = (<>
      <TableComposable aria-label={tableTitle}>
        <Thead>
          <Tr>
            <Th key="table-header-expand"/>
            <Th
              key="table-header-check-all"
              select={{
                onSelect: handleHeaderCheck,
                  isSelected: headerChecked,
              }}
            />
            {tableColumns.map((key, idx) => (
              <Th key={`table-header-${key}`}>{key}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {matchExpressionRows}
        </Tbody>
      </TableComposable>
    </>);
  }

  return (<>
    <TargetCredentialsToolbar />
    { content }
    <CreateJmxCredentialModal visible={showAuthModal} onClose={handleAuthModalClose} />
  </>);
};

export const StoreJmxCredentialsCard: SecurityCard = {
  title: 'Store JMX Credentials',
  description: `Credentials that Cryostat uses to connect to target JVMs over JMX are stored here.`,
  content: StoreJmxCredentials,
};
