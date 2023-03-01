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
import {
  dashboardConfigDeleteLayoutIntent,
  dashboardConfigReplaceLayoutIntent,
  RootState,
  StateDispatch,
} from '@app/Shared/Redux/ReduxStore';
import { ServiceContext } from '@app/Shared/Services/Services';
import {
  Button,
  ContextSelector,
  ContextSelectorItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { DownloadIcon, PlusCircleIcon, TrashIcon, UploadIcon } from '@patternfly/react-icons';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DashboardLayoutCreateModal } from './DashboardLayoutCreateModal';
import { DashboardLayoutUploadModal } from './DashboardLayoutUploadModal';
import { DEFAULT_DASHBOARD_NAME } from './DashboardUtils';

export interface DashboardLayoutConfigProps {
  children?: React.ReactNode;
}

export const DashboardLayoutConfig: React.FunctionComponent<DashboardLayoutConfigProps> = (_props) => {
  const dispatch = useDispatch<StateDispatch>();
  const context = React.useContext(ServiceContext);
  const dashboardConfigs = useSelector((state: RootState) => state.dashboardConfigs);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = React.useState(false);

  const currLayout = React.useMemo(() => dashboardConfigs.layouts[dashboardConfigs.current], [dashboardConfigs]);

  const handleUploadLayout = React.useCallback(
    (_ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      setIsUploadModalOpen(true);
    },
    [setIsUploadModalOpen]
  );

  const handleCreateLayout = React.useCallback(
    (_ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      setIsCreateModalOpen(true);
    },
    [setIsCreateModalOpen]
  );

  const handleDownloadLayout = React.useCallback(
    (_ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      context.api.downloadDashboardLayout(currLayout);
    },
    [context.api, currLayout]
  );

  const handleDeleteLayout = React.useCallback(
    (_ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      dispatch(dashboardConfigDeleteLayoutIntent(currLayout.name));
      dispatch(dashboardConfigReplaceLayoutIntent(DEFAULT_DASHBOARD_NAME));
    },
    [dispatch, currLayout.name]
  );

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const onLayoutSelect = React.useCallback(
    (_evt: any, selected: React.ReactNode) => {
      const found = dashboardConfigs.layouts.find((l) => l.name === selected);
      if (found) {
        dispatch(dashboardConfigReplaceLayoutIntent(found.name));
      } else {
        console.error('layout not found ' + selected);
      }
      setIsSelectorOpen(false);
    },
    [dispatch, setIsSelectorOpen, dashboardConfigs]
  );

  const onToggle = React.useCallback(
    (_evt: any, isOpen: boolean) => {
      setIsSelectorOpen(isOpen);
    },
    [setIsSelectorOpen]
  );
  /* eslint-enable  @typescript-eslint/no-explicit-any */

  const handleUploadModalClose = React.useCallback(() => {
    setIsUploadModalOpen(false);
  }, [setIsUploadModalOpen]);

  const handleCreateModalClose = React.useCallback(() => {
    setIsCreateModalOpen(false);
  }, [setIsCreateModalOpen]);

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
              toggleText={currLayout.name}
              isOpen={isSelectorOpen}
              onToggle={onToggle}
              onSelect={onLayoutSelect}
              isText
            >
              {dashboardConfigs.layouts.map((l) => (
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
              Upload
            </Button>
          </ToolbarItem>
          <ToolbarItem>
            <Button
              key="download"
              variant="secondary"
              aria-label="Download layout"
              onClick={handleDownloadLayout}
              icon={<DownloadIcon />}
            >
              Download
            </Button>
          </ToolbarItem>
          <ToolbarItem>
            <Button
              key="delete"
              variant="danger"
              isAriaDisabled={currLayout.name === DEFAULT_DASHBOARD_NAME}
              aria-label="Delete layout"
              onClick={handleDeleteLayout}
              icon={<TrashIcon />}
            >
              Delete
            </Button>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
      <DashboardLayoutUploadModal visible={isUploadModalOpen} onClose={handleUploadModalClose} />
      <DashboardLayoutCreateModal visible={isCreateModalOpen} onClose={handleCreateModalClose} />
    </Toolbar>
  );
};
