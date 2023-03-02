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
  Dropdown,
  DropdownToggle,
  Menu,
  MenuContent,
  MenuItem,
  MenuItemAction,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { DownloadIcon, PencilAltIcon, PlusCircleIcon, TrashIcon, UploadIcon } from '@patternfly/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const dashboardConfigs = useSelector((state: RootState) => state.dashboardConfigs);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = React.useState(false);
  const [oldName, setOldName] = React.useState<string | undefined>(undefined);

  const currLayout = React.useMemo(() => dashboardConfigs.layouts[dashboardConfigs.current], [dashboardConfigs]);

  const handleUploadModalOpen = React.useCallback(
    (_ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      setIsUploadModalOpen(true);
    },
    [setIsUploadModalOpen]
  );

  const handleUploadModalClose = React.useCallback(() => {
    setIsUploadModalOpen(false);
  }, [setIsUploadModalOpen]);

  const handleDownloadLayout = React.useCallback(
    (_ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      context.api.downloadDashboardLayout(currLayout);
    },
    [context.api, currLayout]
  );

  const handleCreateModalOpen = React.useCallback(
    (_ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      setOldName(undefined);
      setIsCreateModalOpen(true);
    },
    [setOldName, setIsCreateModalOpen]
  );

  const handleCreateModalClose = React.useCallback(() => {
    setIsCreateModalOpen(false);
  }, [setIsCreateModalOpen]);

  const handleDeleteLayout = React.useCallback(
    (layoutName: string) => {
      dispatch(dashboardConfigDeleteLayoutIntent(layoutName));
      dispatch(dashboardConfigReplaceLayoutIntent(DEFAULT_DASHBOARD_NAME));
    },
    [dispatch]
  );

  const handleRenameLayout = React.useCallback(
    (oldName: string) => {
      setOldName(oldName);
      setIsCreateModalOpen(true);
    },
    [setOldName, setIsCreateModalOpen]
  );

  const onFocus = React.useCallback(() => {
    const element = document.getElementById('dashboard-layout-dropdown-toggle');
    if (element) element.focus();
  }, []);

  const onLayoutSelect = React.useCallback(
    (_event: React.MouseEvent<Element, MouseEvent> | undefined, itemId: number | string | undefined) => {
      const found = dashboardConfigs.layouts.find((l) => l.name === itemId);
      if (found) {
        dispatch(dashboardConfigReplaceLayoutIntent(found.name));
      } else {
        console.error('layout not found ' + itemId);
      }
      onFocus();
      setIsSelectorOpen(false);
    },
    [dispatch, onFocus, setIsSelectorOpen, dashboardConfigs]
  );

  const onActionClick = React.useCallback(
    (_evt: React.MouseEvent<HTMLButtonElement, MouseEvent>, itemId: string, actionId: string) => {
      if (actionId === 'rename') {
        handleRenameLayout(itemId);
      } else if (actionId === 'delete') {
        handleDeleteLayout(itemId);
      } else {
        console.error('unknown action ' + actionId);
      }
    },
    [handleRenameLayout, handleDeleteLayout]
  );

  const onToggle = React.useCallback(() => {
    setIsSelectorOpen((open) => !open);
  }, [setIsSelectorOpen]);

  const newButton = React.useMemo(
    () => (
      <Button
        key="new"
        variant="primary"
        aria-label={t('DashboardLayoutConfig.NEW.LABEL')}
        onClick={handleCreateModalOpen}
        icon={<PlusCircleIcon />}
      >
        {t('NEW', { ns: 'common' })}
      </Button>
    ),
    [t, handleCreateModalOpen]
  );

  const renameButton = React.useMemo(
    () => (
      <Button
        key="rename"
        variant="plain"
        isAriaDisabled={currLayout.name === DEFAULT_DASHBOARD_NAME}
        aria-label={t('DashboardLayoutConfig.RENAME.LABEL')}
        onClick={() => handleRenameLayout(currLayout.name)}
        icon={<PencilAltIcon />}
      />
    ),
    [t, handleRenameLayout, currLayout.name]
  );

  const uploadButton = React.useMemo(
    () => (
      <Button
        key="upload"
        variant="secondary"
        aria-label={t('DashboardLayoutConfig.UPLOAD.LABEL')}
        onClick={handleUploadModalOpen}
        icon={<UploadIcon />}
      >
        {t('UPLOAD', { ns: 'common' })}
      </Button>
    ),
    [t, handleUploadModalOpen]
  );

  const downloadButton = React.useMemo(
    () => (
      <Button
        key="download"
        variant="secondary"
        aria-label={t('DashboardLayoutConfig.DOWNLOAD.LABEL')}
        onClick={handleDownloadLayout}
        icon={<DownloadIcon />}
      >
        {t('DOWNLOAD', { ns: 'common' })}
      </Button>
    ),
    [t, handleDownloadLayout]
  );

  const deleteButton = React.useMemo(
    () => (
      <Button
        key="delete"
        variant="danger"
        isAriaDisabled={currLayout.name === DEFAULT_DASHBOARD_NAME}
        aria-label={t('DashboardLayoutConfig.DELETE.LABEL')}
        onClick={() => handleDeleteLayout(currLayout.name)}
        icon={<TrashIcon />}
      >
        {t('DELETE', { ns: 'common' })}
      </Button>
    ),
    [t, handleDeleteLayout, currLayout.name]
  );

  const menuToggle = React.useMemo(
    () => (
      <DropdownToggle id="dashboard-layout-dropdown-toggle" onToggle={onToggle}>
        {currLayout.name}
      </DropdownToggle>
    ),
    [onToggle, currLayout.name]
  );

  const menuItems = React.useMemo(() => {
    return dashboardConfigs.layouts.map((l) => (
      <MenuItem
        key={l.name}
        itemId={l.name}
        actions={
          <>
            <MenuItemAction
              icon={<PencilAltIcon />}
              actionId="rename"
              aria-label={t('DashboardLayoutConfig.RENAME.LABEL')}
            />
            <MenuItemAction
              icon={<TrashIcon />}
              actionId="delete"
              aria-label={t('DashboardLayoutConfig.DELETE.LABEL')}
            />
          </>
        }
      >
        {l.name}
      </MenuItem>
    ));
  }, [t, dashboardConfigs.layouts]);

  const menuDropdown = React.useMemo(() => {
    return (
      <Dropdown id="dashboard-layout-dropdown" isOpen={isSelectorOpen} toggle={menuToggle}>
        <Menu
          aria-label={t('DashboardLayoutConfig.MENU.LABEL')}
          isScrollable
          onSelect={onLayoutSelect}
          onActionClick={onActionClick}
        >
          <MenuContent maxMenuHeight="10em">{menuItems}</MenuContent>
        </Menu>
      </Dropdown>
    );
  }, [t, onLayoutSelect, onActionClick, menuToggle, menuItems, isSelectorOpen]);

  const toolbarContent = React.useMemo(() => {
    return (
      <ToolbarContent>
        <ToolbarGroup>
          <ToolbarItem>{newButton}</ToolbarItem>
          <ToolbarItem spacer={{ default: 'spacerNone' }}>{menuDropdown}</ToolbarItem>
          <ToolbarItem spacer={{ default: 'spacerNone' }}>{renameButton}</ToolbarItem>
          <ToolbarItem>{uploadButton}</ToolbarItem>
          <ToolbarItem>{downloadButton}</ToolbarItem>
          <ToolbarItem>{deleteButton}</ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    );
  }, [newButton, menuDropdown, renameButton, uploadButton, downloadButton, deleteButton]);

  return (
    <Toolbar style={{ zIndex: '9999' }}>
      {toolbarContent}
      <DashboardLayoutUploadModal visible={isUploadModalOpen} onClose={handleUploadModalClose} />
      <DashboardLayoutCreateModal visible={isCreateModalOpen} onClose={handleCreateModalClose} oldName={oldName} />
    </Toolbar>
  );
};
