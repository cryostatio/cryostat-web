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
import { DashboardLayout } from '@app/Shared/Redux/Configurations/DashboardConfigSlice';
import {
  dashboardConfigDeleteLayoutIntent,
  dashboardConfigReplaceLayoutIntent,
  RootState,
  StateDispatch,
} from '@app/Shared/Redux/ReduxStore';
import { ServiceContext } from '@app/Shared/Services/Services';
import { getFromLocalStorage, saveToLocalStorage } from '@app/utils/LocalStorage';
import {
  Button,
  Divider,
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuItemAction,
  MenuList,
  MenuToggle,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { Dropdown } from '@patternfly/react-core/dist/js/next';
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
  const [favorites, setFavorites] = React.useState<string[]>(getFromLocalStorage('LAYOUT_FAVORITES', ['Default']));

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

  const handleFavoriteLayout = React.useCallback(
    (layoutName: string) => {
      setFavorites((old) => {
        const newFavs = old.includes(layoutName) ? old.filter((f) => f !== layoutName) : [...old, layoutName];
        saveToLocalStorage('LAYOUT_FAVORITES', newFavs);
        return newFavs;
      });
    },
    [setFavorites]
  );

  const onFocus = React.useCallback(() => {
    const element = document.getElementById('dashboard-layout-dropdown-toggle');
    if (element) element.focus();
  }, []);

  const onLayoutSelect = React.useCallback(
    (_ev: React.MouseEvent<Element, MouseEvent> | undefined, itemId: number | string | undefined) => {
      const found = dashboardConfigs.layouts.find((l) => l.name === itemId);
      if (found) {
        dispatch(dashboardConfigReplaceLayoutIntent(found.name));
      } else {
        console.error('layout not found ' + itemId);
      }
      onFocus();
    },
    [dispatch, onFocus, dashboardConfigs]
  );

  const onActionClick = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>, itemId: string, actionId: string) => {
      ev.stopPropagation(); // prevent the dropdown from closing
      if (actionId === 'rename') {
        handleRenameLayout(itemId);
      } else if (actionId === 'delete') {
        handleDeleteLayout(itemId);
      } else if (actionId === 'fav') {
        handleFavoriteLayout(itemId);
      }
    },
    [handleRenameLayout, handleDeleteLayout, handleFavoriteLayout]
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

  const menuGroups = React.useCallback(
    (label: string, isFavorited: boolean, filter: (l: DashboardLayout) => boolean) => {
      return (
        <MenuGroup label={label} labelHeadingLevel="h3">
          <MenuList>
            {dashboardConfigs.layouts.filter(filter).map((l) => (
              <MenuItem
                key={l.name}
                itemId={l.name}
                isSelected={l.name === currLayout.name}
                isFavorited={isFavorited}
                actions={
                  <>
                    <MenuItemAction
                      icon={<PencilAltIcon />}
                      actionId="rename"
                      isDisabled={l.name === DEFAULT_DASHBOARD_NAME}
                      aria-label={t('DashboardLayoutConfig.RENAME.LABEL')}
                    />
                    <MenuItemAction
                      icon={<TrashIcon />}
                      actionId="delete"
                      isDisabled={l.name === DEFAULT_DASHBOARD_NAME}
                      aria-label={t('DashboardLayoutConfig.DELETE.LABEL')}
                    />
                  </>
                }
              >
                {l.name}
              </MenuItem>
            ))}
          </MenuList>
        </MenuGroup>
      );
    },
    [dashboardConfigs.layouts, t, currLayout.name]
  );

  const menuDropdown = React.useMemo(() => {
    return (
      <Dropdown
        isOpen={isSelectorOpen}
        onOpenChange={onToggle}
        toggle={(toggleRef) => (
          <MenuToggle ref={toggleRef} id="dashboard-layout-dropdown-toggle" onClick={onToggle}>
            {currLayout.name}
          </MenuToggle>
        )}
      >
        <Menu
          aria-label={t('DashboardLayoutConfig.MENU.LABEL')}
          isScrollable
          onSelect={onLayoutSelect}
          onActionClick={onActionClick}
        >
          <MenuContent maxMenuHeight="16em" id="dashboard-layout-menu-content">
            {menuGroups(t('DashboardLayoutConfig.MENU.FAVORITES'), true, (l) => favorites.includes(l.name))}
            <Divider />
            {menuGroups(t('DashboardLayoutConfig.MENU.OTHERS'), false, (l) => !favorites.includes(l.name))}
          </MenuContent>
        </Menu>
      </Dropdown>
    );
  }, [t, onLayoutSelect, onActionClick, onToggle, menuGroups, favorites, isSelectorOpen, currLayout.name]);

  const toolbarContent = React.useMemo(() => {
    return (
      <ToolbarContent style={{ paddingLeft: '24px' }}>
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
    <Toolbar>
      {toolbarContent}
      <DashboardLayoutUploadModal visible={isUploadModalOpen} onClose={handleUploadModalClose} />
      <DashboardLayoutCreateModal visible={isCreateModalOpen} onClose={handleCreateModalClose} oldName={oldName} />
    </Toolbar>
  );
};
