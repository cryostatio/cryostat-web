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
import { DeleteWarningModal } from '@app/Modal/DeleteWarningModal';
import { DeleteOrDisableWarningType } from '@app/Modal/DeleteWarningUtils';
import { DashboardLayout } from '@app/Shared/Redux/Configurations/DashboardConfigSlice';
import {
  dashboardConfigDeleteLayoutIntent,
  dashboardConfigFavoriteLayoutIntent,
  dashboardConfigReplaceLayoutIntent,
  RootState,
  StateDispatch,
} from '@app/Shared/Redux/ReduxStore';
import { ServiceContext } from '@app/Shared/Services/Services';
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
  const [isDeleteWarningModalOpen, setIsDeleteWarningModalOpen] = React.useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = React.useState(false);
  const [oldName, setOldName] = React.useState<string | undefined>(undefined);
  const [selectDelete, setSelectDelete] = React.useState<string>('');

  const deleteRef = React.useRef<HTMLButtonElement>(null);

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

  const handleDeleteWarningModalOpen = React.useCallback(
    (_ev: React.MouseEvent<HTMLButtonElement, MouseEvent>, layout: string) => {
      setSelectDelete(layout);
      setIsDeleteWarningModalOpen(true);
    },
    [setSelectDelete, setIsDeleteWarningModalOpen]
  );

  const handleDeleteWarningModalClose = React.useCallback(() => {
    setIsDeleteWarningModalOpen(false);
    setSelectDelete('');
  }, [setIsDeleteWarningModalOpen]);

  const handleDeleteLayout = React.useCallback(() => {
    dispatch(dashboardConfigDeleteLayoutIntent(selectDelete));
    dispatch(dashboardConfigReplaceLayoutIntent(DEFAULT_DASHBOARD_NAME));
    setSelectDelete('');
  }, [dispatch, selectDelete]);

  const handleDeleteButton = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>, layout: string) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteDashboardLayout)) {
        handleDeleteWarningModalOpen(ev, layout);
      } else {
        setSelectDelete(layout);
        handleDeleteLayout();
      }
      if (deleteRef.current) deleteRef.current.blur();
    },
    [context.settings, handleDeleteWarningModalOpen, setSelectDelete, handleDeleteLayout]
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
      dispatch(dashboardConfigFavoriteLayoutIntent(layoutName));
    },
    [dispatch]
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
        handleDeleteButton(ev, itemId);
      } else if (actionId === 'fav') {
        handleFavoriteLayout(itemId);
      }
    },
    [handleRenameLayout, handleDeleteButton, handleFavoriteLayout]
  );

  const onToggle = React.useCallback(
    (_ev: React.MouseEvent<Element, MouseEvent>) => {
      setIsSelectorOpen((open) => !open);
    },
    [setIsSelectorOpen]
  );

  const newButton = React.useMemo(
    () => (
      <Button
        key="new"
        variant="primary"
        aria-label={t('DashboardLayoutConfig.NEW.LABEL')}
        onClick={handleCreateModalOpen}
        icon={<PlusCircleIcon />}
        data-quickstart-id="dashboard-new-btn"
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
        data-quickstart-id="dashboard-rename-btn"
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
        data-quickstart-id="dashboard-upload-btn"
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
        data-quickstart-id="dashboard-download-btn"
      >
        {t('DOWNLOAD', { ns: 'common' })}
      </Button>
    ),
    [t, handleDownloadLayout]
  );

  const deleteButton = React.useMemo(
    () => (
      <Button
        ref={deleteRef}
        key="delete"
        variant="danger"
        isAriaDisabled={currLayout.name === DEFAULT_DASHBOARD_NAME}
        aria-label={t('DashboardLayoutConfig.DELETE.LABEL')}
        onClick={(ev) => handleDeleteButton(ev, currLayout.name)}
        icon={<TrashIcon />}
        data-quickstart-id="dashboard-delete-btn"
      >
        {t('DELETE', { ns: 'common' })}
      </Button>
    ),
    [t, handleDeleteButton, currLayout.name]
  );

  const menuGroups = React.useCallback(
    (label: string, favoriteGroup: boolean) => {
      const layouts = dashboardConfigs.layouts.filter(favoriteGroup ? (l: DashboardLayout) => l.favorite : () => true);
      if (layouts.length === 0) {
        return null;
      }
      return (
        <MenuGroup label={label} labelHeadingLevel="h3">
          <MenuList>
            {layouts.map((l) => (
              <MenuItem
                key={l.name}
                itemId={l.name}
                isSelected={l.name === currLayout.name}
                isFavorited={l.favorite}
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
    [t, currLayout.name, dashboardConfigs.layouts]
  );

  const onOpenChange = React.useCallback(
    (_isOpen: boolean) => {
      if (isDeleteWarningModalOpen || isCreateModalOpen || isUploadModalOpen) {
        return;
      }
      setIsSelectorOpen(false);
    },
    [setIsSelectorOpen, isDeleteWarningModalOpen, isCreateModalOpen, isUploadModalOpen]
  );

  const menuDropdown = React.useMemo(() => {
    return (
      <Dropdown
        isOpen={isSelectorOpen}
        onOpenChange={onOpenChange}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            id="dashboard-layout-dropdown-toggle"
            onClick={onToggle}
            data-quickstart-id="dashboard-layout-selector"
          >
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
          <MenuContent maxMenuHeight="21.5em" id="dashboard-layout-menu-content">
            {menuGroups(t('DashboardLayoutConfig.MENU.FAVORITES'), true)}
            <Divider />
            {menuGroups(t('DashboardLayoutConfig.MENU.OTHERS'), false)}
          </MenuContent>
        </Menu>
      </Dropdown>
    );
  }, [t, onLayoutSelect, onActionClick, onOpenChange, onToggle, menuGroups, isSelectorOpen, currLayout.name]);

  const toolbarContent = React.useMemo(() => {
    return (
      <ToolbarContent style={{ paddingLeft: '24px' }}>
        <ToolbarItem>{newButton}</ToolbarItem>
        <ToolbarGroup>
          <ToolbarItem spacer={{ default: 'spacerNone' }}>{menuDropdown}</ToolbarItem>
          <ToolbarItem>{renameButton}</ToolbarItem>
        </ToolbarGroup>
        <ToolbarGroup variant="button-group">
          <ToolbarItem>{uploadButton}</ToolbarItem>
          <ToolbarItem>{downloadButton}</ToolbarItem>
          <ToolbarItem>{deleteButton}</ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    );
  }, [newButton, menuDropdown, renameButton, uploadButton, downloadButton, deleteButton]);

  const deleteWarningModal = React.useMemo(() => {
    return (
      <DeleteWarningModal
        warningType={DeleteOrDisableWarningType.DeleteDashboardLayout}
        visible={isDeleteWarningModalOpen}
        onClose={handleDeleteWarningModalClose}
        onAccept={handleDeleteLayout}
      />
    );
  }, [isDeleteWarningModalOpen, handleDeleteWarningModalClose, handleDeleteLayout]);

  return (
    <Toolbar>
      {toolbarContent}
      <DashboardLayoutUploadModal visible={isUploadModalOpen} onClose={handleUploadModalClose} />
      <DashboardLayoutCreateModal visible={isCreateModalOpen} onClose={handleCreateModalClose} oldName={oldName} />
      {deleteWarningModal}
    </Toolbar>
  );
};
