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

import { BreadcrumbPage } from '@app/BreadcrumbPage/BreadcrumbPage';
import { FeatureFlag } from '@app/Shared/Components/FeatureFlag';
import { FeatureLevelBadge } from '@app/Shared/Components/FeatureLevelBadge';
import { modalPrefillClearIntent, RootState } from '@app/Shared/Redux/ReduxStore';
import { NotificationCategory, RecordingDirectory } from '@app/Shared/Services/api.types';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { getActiveTab, switchTab } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Card,
  CardBody,
  Tab,
  Tabs,
  TabTitleText,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { SimpleDropdown, SimpleDropdownItem } from '@patternfly/react-templates';
import * as React from 'react';
import { Trans } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { Queries } from './queries/Queries';
import { Views } from './views/Views';

enum RecordingAnalyticsTab {
  QUERIES = 'queries',
  VIEWS = 'views',
}

export const RecordingAnalytics: React.FC = () => {
  const { t } = useCryostatTranslation();
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const modalPrefill = useSelector((state: RootState) => state.modalPrefill);
  const { search, pathname } = location;

  const [jvmId, setJvmId] = React.useState('');
  const [recordingDirectories, setRecordingDirectories] = React.useState([] as RecordingDirectory[]);
  const [filename, setFilename] = React.useState('');

  const refreshRecordingDirectories = React.useCallback(() => {
    addSubscription(
      context.api.doGet<RecordingDirectory[]>('fs/recordings', 'beta').subscribe((v) => {
        setRecordingDirectories(v);
      }),
    );
  }, [addSubscription, context.api]);

  React.useEffect(() => {
    refreshRecordingDirectories();
  }, [refreshRecordingDirectories]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingCreated).subscribe(() => {
        refreshRecordingDirectories();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshRecordingDirectories]);

  React.useEffect(() => {
    addSubscription(
      context.notificationChannel.messages(NotificationCategory.ArchivedRecordingDeleted).subscribe(() => {
        refreshRecordingDirectories();
      }),
    );
  }, [addSubscription, context.notificationChannel, refreshRecordingDirectories]);

  React.useEffect(() => {
    const stateData = location.state as Record<string, unknown> | null;
    const reduxData = modalPrefill.route === location.pathname ? (modalPrefill.data as Record<string, unknown>) : null;

    const prefillJvmId = (stateData?.jvmId || reduxData?.jvmId) as string | undefined;
    const prefillFilename = (stateData?.filename || reduxData?.filename) as string | undefined;

    if (prefillJvmId && recordingDirectories.some((d) => d.jvmId === prefillJvmId)) {
      setJvmId(prefillJvmId);

      if (prefillFilename) {
        const directory = recordingDirectories.find((d) => d.jvmId === prefillJvmId);
        if (directory && directory.recordings.some((r) => r.name === prefillFilename)) {
          setFilename(prefillFilename);
        }
      }

      dispatch(modalPrefillClearIntent());
      if (location.state) {
        navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
      }
    }
  }, [
    recordingDirectories,
    location.state,
    location.pathname,
    location.search,
    location.hash,
    modalPrefill,
    dispatch,
    navigate,
  ]);

  const jvmIds = React.useMemo(() => recordingDirectories.map((e) => e.jvmId), [recordingDirectories]);

  const filenames = React.useMemo(() => {
    const directory = recordingDirectories.find((d) => d.jvmId === jvmId);
    return directory ? directory.recordings.map((r) => r.name) : [];
  }, [recordingDirectories, jvmId]);

  const jvmIdItems = React.useMemo(() => {
    const a: SimpleDropdownItem[] = jvmIds
      .map(
        (id) =>
          ({
            value: id,
            onClick: () => {
              setJvmId(id);
              setFilename('');
            },
            content: id,
          }) as SimpleDropdownItem,
      )
      .concat([
        {
          value: '',
          isDivider: true,
        },
        {
          value: 'Clear Selection',
          onClick: () => {
            setJvmId('');
            setFilename('');
          },
          content: 'Clear Selection',
        },
      ]);
    return a;
  }, [jvmIds]);

  const filenameItems = React.useMemo(() => {
    const a: SimpleDropdownItem[] = filenames
      .map(
        (f) =>
          ({
            value: f,
            onClick: () => setFilename(f),
            content: f,
          }) as SimpleDropdownItem,
      )
      .concat([
        {
          value: '',
          isDivider: true,
        },
        {
          value: 'Clear Selection',
          onClick: () => setFilename(''),
          content: 'Clear Selection',
        },
      ]);
    return a;
  }, [filenames]);

  const activeTab = React.useMemo(
    () => getActiveTab(search, 'tab', Object.values(RecordingAnalyticsTab), RecordingAnalyticsTab.QUERIES),
    [search],
  );

  const onTabSelect = React.useCallback(
    (_: React.MouseEvent, key: string | number) =>
      switchTab(navigate, pathname, search, { tabKey: 'tab', tabValue: `${key}` }),
    [navigate, pathname, search],
  );

  return (
    <BreadcrumbPage pageTitle="Analytics">
      <Card isFullHeight>
        <CardBody isFilled>
          <Toolbar>
            <ToolbarContent>
              <ToolbarGroup>
                <ToolbarItem>
                  <SimpleDropdown toggleContent={jvmId || 'JVM ID'} initialItems={jvmIdItems} />
                </ToolbarItem>
                <ToolbarItem>
                  <SimpleDropdown
                    toggleContent={filename || 'Filename'}
                    isDisabled={!jvmId}
                    initialItems={filenameItems}
                  />
                </ToolbarItem>
              </ToolbarGroup>
            </ToolbarContent>
          </Toolbar>
          <Tabs id="recording-analytics" activeKey={activeTab} onSelect={onTabSelect}>
            <Tab
              eventKey={RecordingAnalyticsTab.QUERIES}
              title={<TabTitleText>{t('RecordingAnalytics.QUERIES_TAB_TITLE')}</TabTitleText>}
            >
              <Queries jvmId={jvmId} filename={filename} />
            </Tab>
            <FeatureFlag level={FeatureLevel.BETA}>
              <Tab
                eventKey={RecordingAnalyticsTab.VIEWS}
                title={
                  <TabTitleText>
                    <Trans t={t} components={[<FeatureLevelBadge />]}>
                      RecordingAnalytics.VIEWS_TAB_TITLE
                    </Trans>
                  </TabTitleText>
                }
              >
                <Views jvmId={jvmId} filename={filename} />
              </Tab>
            </FeatureFlag>
          </Tabs>
        </CardBody>
      </Card>
    </BreadcrumbPage>
  );
};

export default RecordingAnalytics;
