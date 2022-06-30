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
import { forkJoin, merge, Observable } from 'rxjs';

import { TableComposable, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { CreateJmxCredentialModal } from './CreateJmxCredentialModal';
import { SecurityCard } from './SecurityPanel';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { LoadingView } from '@app/LoadingView/LoadingView';
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteWarningType } from '@app/Modal/DeleteWarningUtils';

export const StoreJmxCredentials = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();

  const [credentials, setCredentials] = React.useState([] as StoredCredential[]);
  const [headerChecked, setHeaderChecked] = React.useState(false);
  const [checkedIndices, setCheckedIndices] = React.useState([] as number[]);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [warningModalOpen, setWarningModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const tableColumns: string[] = ['Target Alias', 'Connect URL'];
  const tableTitle = 'Stored Credentials';

  const refreshStoredTargetsList = React.useCallback(() => {
    setIsLoading(true);
    addSubscription(context.api.getStoredJmxCredentials().subscribe((credentials: StoredCredential[]) => {
      setCredentials(credentials);
      setIsLoading(false);
    }));
  }, [context, context.api, setCredentials]);

  React.useEffect(() => {
    refreshStoredTargetsList();
  }, []);

  React.useEffect(() => {
    const targetsChanged = context.notificationChannel.messages(NotificationCategory.TargetJvmDiscovery);
    const credentialAdd = context.notificationChannel.messages(NotificationCategory.TargetCredentialsStored);
    const sub = merge(targetsChanged, credentialAdd).subscribe(() => {
      refreshStoredTargetsList();
    });
    return () => sub.unsubscribe();
  }, [context, context.notificationChannel, refreshStoredTargetsList]);

  React.useEffect(() => {
    const sub = context.notificationChannel.messages(NotificationCategory.TargetCredentialsDeleted).subscribe((v) => {
      setCredentials(old => old.filter(c => c.matchExpression !== v.message.target));
    });
    return () => sub.unsubscribe();
  }, [context, context.notificationChannel, setCredentials]);

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
      setCheckedIndices(checked ? Array.from(new Array(targetRows.length), (x, i) => i) : []);
    },
    [setHeaderChecked, setCheckedIndices, credentials]
  );

  const handleDeleteCredentials = () => {
    const tasks: Observable<any>[] = [];
    const rows: [string, Target][] = [];
    for (const credential of credentials) {
      for (const target of credential.targets) {
        rows.push([credential.matchExpression, target]);
      }
    }
    rows.forEach((r: [string, Target], idx) => {
      if (checkedIndices.includes(idx)) {
        handleRowCheck(false, idx);
        tasks.push(context.api.deleteTargetCredentials(r[1].connectUrl));
        context.target.deleteCredentials(r[1].connectUrl);
      }
    });
    addSubscription(forkJoin(tasks).subscribe());
  };

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

  const disableDeletionDialog = React.useCallback(() => {
    context.settings.setDeletionDialogsEnabledFor(DeleteWarningType.DeleteJMXCredentials, false);
  }, [context, context.settings]);

  const TargetCredentialsToolbar = () => {
    const buttons = React.useMemo(() => {
      const arr = [
        <Button variant="primary" aria-label="add-jmx-credential" onClick={() => setShowAuthModal(true)}>
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

    const items = storedTargets.filter((t, i) => checkedIndices.indexOf(i) != -1).map((t) => t.alias);

    const deleteCredentialModal = React.useMemo(() => {
      return <DeleteWarningModal 
      warningType={DeleteWarningType.DeleteJMXCredentials}
      items={items}
      visible={warningModalOpen} 
      onAccept={handleDeleteCredentials} 
      onClose={handleWarningModalClose}
      disableDialog={disableDeletionDialog}
      />
    }, [checkedIndices]);

    return (
      <Toolbar id="target-credentials-toolbar">
        <ToolbarContent>{buttons}</ToolbarContent>
        { deleteCredentialModal }
      </Toolbar>
    );
  };

  const CredentialsTableRow = (props) => {
    const handleCheck = (checked) => {
      handleRowCheck(checked, props.index);
    };

    return (
      <Tbody key={props.index}>
        <Tr key={`${props.index}`}>
          <Td key={`credentials-table-row-${props.index}_0`}>
            <Checkbox
              name={`credentials-table-row-${props.index}-check`}
              onChange={handleCheck}
              isChecked={checkedIndices.includes(props.index)}
              id={`credentials-table-row-${props.index}-check`}
              aria-label={`credentials-table-row-${props.index}-check`}
            />
          </Td>
          <Td key={`credentials-table-row-${props.index}_1`} dataLabel={tableColumns[0]}>
            {props.target.alias}
          </Td>
          <Td key={`credentials-table-row-${props.index}_2`} dataLabel={tableColumns[1]}>
            {props.target.connectUrl}
          </Td>
        </Tr>
      </Tbody>
    );
  };

  const targetRows = React.useMemo(() => {
    const rows: JSX.Element[] = [];
    for (const credential of credentials) {
      for (const target of credential.targets) {
        const idx = rows.length;
        rows.push(<CredentialsTableRow key={idx} matchExpression={credential.matchExpression} target={target} index={idx} />);
      }
    }
    return rows;
  }, [credentials, checkedIndices]);

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
        {targetRows}
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
  description: `Targets for which Cryostat has stored JMX credentials are listed here.
    If a Target JVM requires JMX authentication, Cryostat will use stored credentials
    when attempting to open JMX connections to the target.`,
  content: StoreJmxCredentials,
};
