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
import {
  dashboardConfigCreateLayoutIntent,
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
  Dropdown as PF4Dropdown,
  DropdownItem as PF4DropdownItem,
  DropdownToggle,
  DropdownToggleAction,
  Menu,
  MenuContent,
  MenuFooter,
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
import { Dropdown, DropdownItem, DropdownList } from '@patternfly/react-core/dist/js/next';
import {
  EllipsisVIcon,
  FileIcon,
  PencilAltIcon,
  PficonTemplateIcon,
  PlusCircleIcon,
  TrashIcon,
  UploadIcon,
} from '@patternfly/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { AddCard } from './AddCard';
import { BlankLayout } from './cryostat-dashboard-templates';
import {
  DashboardLayout,
  DEFAULT_DASHBOARD_NAME,
  getUniqueIncrementingName,
  LayoutTemplateContext,
  SelectedLayoutTemplate,
} from './dashboard-utils';
import { DashboardLayoutCreateModal } from './DashboardLayoutCreateModal';
import { DashboardLayoutSetAsTemplateModal } from './DashboardLayoutSetAsTemplateModal';
import { LayoutTemplateUploadModal } from './LayoutTemplateUploadModal';

export interface DashboardLayoutToolbarProps {
  children?: React.ReactNode;
}

const DefaultSelectedTemplate: SelectedLayoutTemplate = {
  template: BlankLayout,
  category: 'Suggested',
};

export const DashboardLayoutToolbar: React.FunctionComponent<DashboardLayoutToolbarProps> = (_props) => {
  const dispatch = useDispatch<StateDispatch>();
  const context = React.useContext(ServiceContext);
  const { t } = useTranslation();
  const dashboardConfigs = useSelector((state: RootState) => state.dashboardConfigs);

  const [selectedTemplate, setSelectedTemplate] = React.useState<SelectedLayoutTemplate>({
    template: BlankLayout,
    category: 'Suggested',
  });

  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);

  // layout selector
  const [isSelectorOpen, setIsSelectorOpen] = React.useState(false);

  // create new / rename layout modal
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [oldName, setOldName] = React.useState<string | undefined>(undefined);

  // create new layout dropdown
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = React.useState(false);

  // delete layout
  const [isDeleteWarningModalOpen, setIsDeleteWarningModalOpen] = React.useState(false);
  const [selectDelete, setSelectDelete] = React.useState<string>('');

  // toolbar kebab
  const [isKebabOpen, setIsKebabOpen] = React.useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = React.useState(false);
  const [isDownloadModal, setIsDownloadModal] = React.useState(false);

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

  const handleCreateModalOpen = React.useCallback(
    (_ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      setOldName(undefined);
      setIsCreateModalOpen(true);
      setIsSelectorOpen(false);
      setSelectedTemplate(DefaultSelectedTemplate);
    },
    [setOldName, setIsCreateModalOpen, setIsSelectorOpen]
  );

  const handleCreateModalClose = React.useCallback(() => {
    setIsCreateModalOpen(false);
    setSelectedTemplate(DefaultSelectedTemplate);
  }, [setIsCreateModalOpen, setSelectedTemplate]);

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
  }, [dispatch, setSelectDelete, selectDelete]);

  const handleDeleteButton = React.useCallback(
    (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>, layout: string) => {
      if (context.settings.deletionDialogsEnabledFor(DeleteOrDisableWarningType.DeleteDashboardLayout)) {
        handleDeleteWarningModalOpen(ev, layout);
      } else {
        dispatch(dashboardConfigDeleteLayoutIntent(layout));
        dispatch(dashboardConfigReplaceLayoutIntent(DEFAULT_DASHBOARD_NAME));
      }
      if (deleteRef.current) deleteRef.current.blur();
    },
    [context.settings, dispatch, handleDeleteWarningModalOpen]
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
      setIsSelectorOpen(false);
      onFocus();
    },
    [dispatch, setIsSelectorOpen, onFocus, dashboardConfigs]
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

  const onCreateDropdownSelect = React.useCallback(() => {
    setIsCreateDropdownOpen(false);
  }, [setIsCreateDropdownOpen]);

  const createBlankLayout = React.useCallback(() => {
    const name = getUniqueIncrementingName(
      'Custom',
      dashboardConfigs.layouts.map((l) => l.name)
    );

    const template: DashboardLayout = {
      name,
      cards: [],
      favorite: false,
    };
    dispatch(dashboardConfigCreateLayoutIntent(template));
    dispatch(dashboardConfigReplaceLayoutIntent(name));
    setIsCreateDropdownOpen(false);
  }, [dispatch, dashboardConfigs, setIsCreateDropdownOpen]);

  const createTemplateDropdownItems = React.useMemo(
    () => [
      <PF4DropdownItem key="action" onClick={createBlankLayout} autoFocus icon={<FileIcon />}>
        Blank Layout
      </PF4DropdownItem>,
      <PF4DropdownItem key="template" onClick={handleCreateModalOpen} icon={<PficonTemplateIcon />}>
        Choose Template
      </PF4DropdownItem>,
      <PF4DropdownItem key="upload" onClick={handleUploadModalOpen} icon={<UploadIcon />}>
        Upload Template
      </PF4DropdownItem>,
    ],
    [createBlankLayout, handleCreateModalOpen, handleUploadModalOpen]
  );

  const createTemplateButton = React.useMemo(
    () => (
      <PF4Dropdown
        onSelect={onCreateDropdownSelect}
        toggle={
          <DropdownToggle
            id="dashboard-layout-create-dropdown-toggle"
            splitButtonItems={[
              <DropdownToggleAction
                key="action"
                onClick={(_e) => {
                  createBlankLayout();
                  setIsSelectorOpen(false);
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <PlusCircleIcon style={{ marginRight: 'var(--pf-global--spacer--sm)' }} />
                  {t('DashboardLayoutToolbar.NEW_LAYOUT')}
                </span>
              </DropdownToggleAction>,
            ]}
            toggleVariant="primary"
            splitButtonVariant="action"
            onToggle={(open) => setIsCreateDropdownOpen(open)}
          />
        }
        isOpen={isCreateDropdownOpen}
        dropdownItems={createTemplateDropdownItems}
      />
    ),
    [
      t,
      createBlankLayout,
      setIsSelectorOpen,
      onCreateDropdownSelect,
      setIsCreateDropdownOpen,
      isCreateDropdownOpen,
      createTemplateDropdownItems,
    ]
  );

  const renameButton = React.useMemo(
    () => (
      <Button
        key="rename"
        variant="plain"
        isAriaDisabled={currLayout.name === DEFAULT_DASHBOARD_NAME}
        aria-label={t('DashboardLayoutToolbar.RENAME.LABEL')}
        onClick={() => handleRenameLayout(currLayout.name)}
        icon={<PencilAltIcon />}
        data-quickstart-id="dashboard-rename-btn"
      />
    ),
    [t, handleRenameLayout, currLayout.name]
  );

  const deleteButton = React.useMemo(
    () => (
      <Button
        ref={deleteRef}
        key="delete"
        variant="danger"
        isAriaDisabled={currLayout.name === DEFAULT_DASHBOARD_NAME}
        aria-label={t('DashboardLayoutToolbar.DELETE.LABEL')}
        onClick={(ev) => handleDeleteButton(ev, currLayout.name)}
        icon={<TrashIcon />}
        data-quickstart-id="dashboard-delete-btn"
      >
        {t('DELETE', { ns: 'common' })}
      </Button>
    ),
    [t, handleDeleteButton, currLayout.name]
  );

  const dropdownItems = React.useMemo(() => {
    return (
      <DropdownList>
        <DropdownItem key="template" itemId={'template'}>
          {t('DashboardLayoutToolbar.SET_AS_TEMPLATE')}
        </DropdownItem>
        <DropdownItem key="download" itemId={'download'}>
          {t('DashboardLayoutToolbar.DOWNLOAD_AS_TEMPLATE')}
        </DropdownItem>
      </DropdownList>
    );
  }, [t]);

  const handleDownloadTemplateModalOpen = React.useCallback(() => {
    setIsDownloadModal(true);
    setIsTemplateModalOpen(true);
  }, [setIsDownloadModal, setIsTemplateModalOpen]);

  const handleSetAsTemplateModalOpen = React.useCallback(() => {
    setIsDownloadModal(false);
    setIsTemplateModalOpen(true);
  }, [setIsTemplateModalOpen]);

  const handleTemplateModalClose = React.useCallback(() => {
    setIsTemplateModalOpen(false);
  }, [setIsTemplateModalOpen]);

  const onKebabSelect = React.useCallback(
    (_event: React.MouseEvent<Element, MouseEvent> | undefined, itemId: string | number | undefined) => {
      switch (itemId) {
        case 'template':
          handleSetAsTemplateModalOpen();
          break;
        case 'download':
          handleDownloadTemplateModalOpen();
          break;
        default:
          console.error('unknown item id ' + itemId);
      }
      setIsKebabOpen(false);
    },
    [handleSetAsTemplateModalOpen, handleDownloadTemplateModalOpen, setIsKebabOpen]
  );

  const kebabDropdown = React.useMemo(
    () => (
      <Dropdown
        isOpen={isKebabOpen}
        onSelect={onKebabSelect}
        minWidth="12em"
        onOpenChange={(isOpen) => {
          setIsKebabOpen(isOpen);
        }}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            aria-label={t('DashboardLayoutToolbar.MENU.LABEL')}
            variant="plain"
            onClick={() => setIsKebabOpen(!isKebabOpen)}
            isExpanded={isKebabOpen}
            data-quickstart-id="layout-toolbar-kebab-btn"
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
      >
        {dropdownItems}
      </Dropdown>
    ),
    [t, onKebabSelect, setIsKebabOpen, isKebabOpen, dropdownItems]
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
                      aria-label={t('DashboardLayoutToolbar.RENAME.LABEL')}
                    />
                    <MenuItemAction
                      icon={<TrashIcon />}
                      actionId="delete"
                      isDisabled={l.name === DEFAULT_DASHBOARD_NAME}
                      aria-label={t('DashboardLayoutToolbar.DELETE.LABEL')}
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
      setIsSelectorOpen(_isOpen);
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
          aria-label={t('DashboardLayoutToolbar.MENU.LABEL')}
          isScrollable
          onSelect={onLayoutSelect}
          onActionClick={onActionClick}
        >
          <MenuContent maxMenuHeight="21.5em" id="dashboard-layout-menu-content">
            {menuGroups(t('DashboardLayoutToolbar.MENU.FAVORITES'), true)}
            <Divider />
            {menuGroups(t('DashboardLayoutToolbar.MENU.OTHERS'), false)}
          </MenuContent>
          <Divider />
          <MenuFooter>{createTemplateButton}</MenuFooter>
        </Menu>
      </Dropdown>
    );
  }, [
    t,
    onLayoutSelect,
    onActionClick,
    onOpenChange,
    onToggle,
    menuGroups,
    createTemplateButton,
    isSelectorOpen,
    currLayout.name,
  ]);

  const toolbarContent = React.useMemo(() => {
    return (
      <ToolbarContent style={{ paddingLeft: '24px' }}>
        <ToolbarItem>
          <AddCard variant="icon-button" />
        </ToolbarItem>
        <ToolbarGroup>
          <ToolbarItem spacer={{ default: 'spacerNone' }}>{menuDropdown}</ToolbarItem>
          <ToolbarItem>{renameButton}</ToolbarItem>
        </ToolbarGroup>
        <ToolbarGroup variant="button-group">
          <ToolbarItem>{deleteButton}</ToolbarItem>
          <ToolbarItem>{kebabDropdown}</ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    );
  }, [menuDropdown, renameButton, deleteButton, kebabDropdown]);

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
    <LayoutTemplateContext.Provider
      value={{
        selectedTemplate: selectedTemplate,
        setSelectedTemplate: setSelectedTemplate,
        isUploadModalOpen: isUploadModalOpen,
        setIsUploadModalOpen: setIsUploadModalOpen,
      }}
    >
      <Toolbar>
        {toolbarContent}
        <DashboardLayoutCreateModal visible={isCreateModalOpen} onClose={handleCreateModalClose} oldName={oldName} />
        <LayoutTemplateUploadModal visible={isUploadModalOpen} onClose={handleUploadModalClose} />
        <DashboardLayoutSetAsTemplateModal
          visible={isTemplateModalOpen}
          onClose={handleTemplateModalClose}
          downloadModal={isDownloadModal}
        />
        {deleteWarningModal}
      </Toolbar>
    </LayoutTemplateContext.Provider>
  );
};
