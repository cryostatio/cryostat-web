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
import { LoadingPropsType } from '@app/Shared/ProgressIndicator';
import {
  DashboardConfigState,
  dashboardLayoutConfigReplaceCardIntent,
} from '@app/Shared/Redux/Configurations/DashboardConfigSlicer';
import { RootState, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Button,
  ContextSelector,
  ContextSelectorItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { DownloadIcon, PlusCircleIcon, UploadIcon } from '@patternfly/react-icons';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DashboardLayoutCreateModal } from './DashboardLayoutCreateModal';
import { DashboardLayoutUploadModal } from './DashboardLayoutUploadModal';

export interface DashboardLayoutConfigProps {
  children?: React.ReactNode;
}

export const DashboardLayoutConfig: React.FunctionComponent<DashboardLayoutConfigProps> = (props) => {
  const addSubscription = useSubscriptions();
  const dispatch = useDispatch<StateDispatch>();
  const context = React.useContext(ServiceContext);
  const layout = useSelector((state: RootState) => state.dashboardConfigs);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = React.useState(false);
  const [layouts, setLayouts] = React.useState<DashboardConfigState[]>([]);

  const handleUploadLayout = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      setIsUploadModalOpen(true);
    },
    [setIsUploadModalOpen]
  );

  const handleCreateLayout = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      setIsCreateModalOpen(true);
    },
    [setIsCreateModalOpen]
  );

  const handleDownloadLayout = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      setDownloading(true);
      setTimeout(() => {
        context.api.downloadDashboardLayout(layout);
        setDownloading(false);
      }, 500);
    },
    [context.api, setDownloading, layout]
  );

  const submitButtonLoadingProps = React.useMemo(
    () =>
      ({
        spinnerAriaValueText: 'Downloading dashboard layouts',
        spinnerAriaLabel: 'downloading-dashboard-layouts',
        isLoading: downloading,
      } as LoadingPropsType),
    [downloading]
  );

  React.useEffect(() => {
    addSubscription(
      context.settings.dashboardLayouts().subscribe((layouts) => {
        setLayouts(layouts);
      })
    );
  }, [addSubscription, context.settings]);

  const onLayoutSelect = React.useCallback(
    (_evt: any, selected: React.ReactNode) => {
      const found = layouts.find((l) => l.name === selected);
      if (found) {
        dispatch(dashboardLayoutConfigReplaceCardIntent(found.name, found.list));
      } else {
        console.error('layout not found ' + selected);
      }
      setIsSelectorOpen(false);
    },
    [dispatch, setIsSelectorOpen, layouts]
  );

  const onToggle = React.useCallback(
    (_evt: any, isOpen: boolean) => {
      setIsSelectorOpen(isOpen);
    },
    [setIsSelectorOpen]
  );

  return (
    <Toolbar style={{ zIndex: '9999' }}>
      <ToolbarContent>
        <ToolbarGroup>
          <ToolbarItem>
            <Button key="new" variant="primary" aria-label="New" onClick={handleCreateLayout} icon={<PlusCircleIcon />}>
              New
            </Button>
          </ToolbarItem>
          <ToolbarItem>
            <ContextSelector
              menuAppendTo={'parent'}
              toggleText={layout.name}
              isOpen={isSelectorOpen}
              onToggle={onToggle}
              onSelect={onLayoutSelect}
              isText
            >
              {layouts.map((l) => (
                <ContextSelectorItem key={l.name}>{l.name}</ContextSelectorItem>
              ))}
            </ContextSelector>
          </ToolbarItem>
          <ToolbarItem>
            <Button
              key="upload"
              variant="secondary"
              aria-label="Upload"
              onClick={handleUploadLayout}
              icon={<UploadIcon />}
            >
              Upload layout
            </Button>
          </ToolbarItem>
          <ToolbarItem>
            <Button
              key="download"
              variant="secondary"
              aria-label="Download layout"
              onClick={handleDownloadLayout}
              icon={<DownloadIcon />}
              {...submitButtonLoadingProps}
            >
              Download layout
            </Button>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
      <DashboardLayoutUploadModal visible={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} />
      <DashboardLayoutCreateModal visible={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </Toolbar>
  );
};
