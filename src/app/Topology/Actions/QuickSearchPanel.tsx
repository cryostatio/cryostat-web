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
import { NotificationsContext } from '@app/Notifications/Notifications';
import { ServiceContext } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { useFeatureLevel } from '@app/utils/useFeatureLevel';
import { portalRoot } from '@app/utils/utils';
import {
  Bullseye,
  Button,
  EmptyState,
  EmptyStateIcon,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  Menu,
  MenuContent,
  MenuItem,
  MenuList,
  Modal,
  ModalProps,
  SearchInput,
  Sidebar,
  SidebarContent,
  SidebarPanel,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { css } from '@patternfly/react-styles';
import { useHover } from '@patternfly/react-topology';
import React from 'react';
import { Link, useHistory } from 'react-router-dom';
import QuickSearchIcon from '../Shared/QuickSearchIcon';
import quickSearches, { QuickSearchId, quickSearchIds } from './quicksearches/all-quick-searches';
import { QuickSearchItem } from './utils';

export const QuickSearchTabContent: React.FC<{ item?: QuickSearchItem }> = ({ item, ...props }) => {
  const history = useHistory();
  const services = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);

  const handleActionClick = React.useCallback(() => {
    item?.createAction && item.createAction({ history, services, notifications });
  }, [item, history, services, notifications]);

  return item ? (
    <Stack {...props} hasGutter>
      <StackItem>
        <h2 className={css('topology__quicksearch__tab-content-title')}>{item.name}</h2>
      </StackItem>
      <StackItem>
        <span className={css('topology__quicksearch__tab-content-description-short')}>{item.descriptionShort}</span>
      </StackItem>
      <StackItem>
        <Button variant="primary" onClick={handleActionClick}>
          {item.actionText ? item.actionText : 'Create'}
        </Button>
      </StackItem>
      <StackItem>{item.descriptionFull}</StackItem>
    </Stack>
  ) : null;
};

export const QuickSearchTabTitle: React.FC<{ item: QuickSearchItem }> = ({ item, ...props }) => {
  return (
    <Flex {...props}>
      <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
        <div className={css('topology__quicksearch__tab-icon')}>
          <Bullseye>{item.icon}</Bullseye>
        </div>
      </FlexItem>
      <Flex
        direction={{ default: 'column' }}
        flex={{ default: 'flex_1' }}
        alignSelf={{ default: 'alignSelfFlexStart' }}
      >
        <FlexItem spacer={{ default: 'spacerNone' }}>
          <TabTitleText className={css('topology__quicksearch__tab-text')}>{item.name}</TabTitleText>
        </FlexItem>
        <FlexItem>
          <LabelGroup>
            {item.labels
              ? item.labels.map(({ content, color, icon }) => (
                  <Label color={color} icon={icon} key={content}>
                    {content}
                  </Label>
                ))
              : null}
          </LabelGroup>
        </FlexItem>
      </Flex>
    </Flex>
  );
};

export interface QuickSearchPanelProps {}

export const QuickSearchPanel: React.FC<QuickSearchPanelProps> = ({ ...props }) => {
  const [activeTab, setActiveTab] = React.useState<QuickSearchId>(quickSearchIds[0] || '');
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');

  const activeLevel = useFeatureLevel();

  const handleTabChange = React.useCallback(
    (_, eventKey: string | number) => setActiveTab(`${eventKey}`),
    [setActiveTab]
  );

  const handleSearch = React.useCallback(
    (input: string) => {
      setSearchText(input);
    },
    [setSearchText]
  );

  const filteredQuicksearches = React.useMemo(() => {
    let items = quickSearches.filter((qs) => activeLevel <= qs.featureLevel);
    if (searchText && searchText !== '') {
      const regex = new RegExp(searchText, 'i');
      items = items.filter(({ name, descriptionFull = '', descriptionShort = '', labels = [] }) => {
        let matchResult = regex.test(name) || regex.test(descriptionFull) || regex.test(descriptionShort);

        matchResult = matchResult || labels.reduce((acc, curr) => acc || regex.test(curr.content), false);

        return matchResult;
      });
    }

    return items;
  }, [searchText, activeLevel]);

  const matchedItem = React.useMemo(() => {
    return filteredQuicksearches.find((qs) => qs.id === activeTab);
  }, [filteredQuicksearches, activeTab]);

  React.useEffect(() => {
    if (!matchedItem && filteredQuicksearches.length) {
      setActiveTab(filteredQuicksearches[0].id);
    }
  }, [filteredQuicksearches, matchedItem]);

  return (
    <Stack hasGutter>
      <StackItem>
        <SearchInput
          placeholder="Add to view..."
          value={searchText}
          onChange={handleSearch}
          onClear={() => handleSearch('')}
        />
      </StackItem>
      {filteredQuicksearches.length ? (
        <StackItem>
          <Sidebar {...props} tabIndex={0} style={{ height: 'max-content' }} hasGutter>
            <SidebarPanel variant="sticky">
              <Tabs
                isVertical
                unmountOnExit
                expandable={{ default: 'nonExpandable', md: 'nonExpandable', lg: 'nonExpandable', sm: 'expandable' }}
                isExpanded={isExpanded}
                toggleText={isExpanded ? 'Close Tabs' : 'Open Tabs'}
                onToggle={setIsExpanded}
                activeKey={activeTab}
                onSelect={handleTabChange}
                role={'region'}
              >
                {filteredQuicksearches.map((qs, index) => (
                  <Tab
                    className={css('topology__quicksearch__tab')}
                    eventKey={qs.id}
                    key={index}
                    isDisabled={qs.disabled}
                    title={<QuickSearchTabTitle item={qs} />}
                  />
                ))}
              </Tabs>
            </SidebarPanel>
            <SidebarContent>
              <QuickSearchTabContent item={matchedItem} />
            </SidebarContent>
          </Sidebar>
        </StackItem>
      ) : (
        <Bullseye>
          <EmptyState>
            <EmptyStateIcon icon={SearchIcon} />
            <Title headingLevel="h4" size="lg">
              No Results
            </Title>
          </EmptyState>
        </Bullseye>
      )}
    </Stack>
  );
};

export interface QuickSearchModalProps extends Partial<ModalProps> {}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  variant = 'medium',
  ..._props
}) => {
  const activeLevel = useFeatureLevel();

  const guide = React.useMemo(() => {
    if (activeLevel === FeatureLevel.PRODUCTION) {
      return null;
    }
    return (
      <span>
        For quickstarts on how to create these entities, visit <Link to={'/quickstarts'}>Quick Starts</Link>.
      </span>
    );
  }, [activeLevel]);
  return (
    <Modal
      appendTo={portalRoot}
      isOpen={isOpen}
      onClose={onClose}
      variant={variant}
      titleIconVariant={QuickSearchIcon}
      title={'Topology Entity Catalog'}
      className={'topology__quick-search-modal'}
      description={<div>Select an entity to add to view. {guide}</div>}
    >
      <QuickSearchPanel />
    </Modal>
  );
};

export interface QuickSearchContextMenuProps {
  id: string;
}

// A fly-out menu when right-click on visualization area
export const QuickSearchContextMenu: React.FC<QuickSearchContextMenuProps> = ({ id, ...props }) => {
  const [hover, hoverRef] = useHover(0, 100); // delay 100s to allow mouse moving to flyout menu

  return (
    <div id={id} className={'topology__quick-search__context-menu'}>
      <Menu {...props} containsFlyout>
        <MenuContent>
          <MenuList>
            <MenuItem
              isFocused
              ref={hoverRef}
              itemId={'Add to View'}
              flyoutMenu={<QuickSearchFlyoutMenu isShow={hover} />}
            >
              Add to View
            </MenuItem>
          </MenuList>
        </MenuContent>
      </Menu>
    </div>
  );
};

export interface QuickSearchFlyoutMenuProps {
  isShow?: boolean;
}

export const QuickSearchFlyoutMenu: React.FC<QuickSearchFlyoutMenuProps> = ({ isShow, ...props }) => {
  const history = useHistory();
  const services = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);
  const activeLevel = useFeatureLevel();

  const [hover, hoverRef] = useHover(0, 0);

  const filteredQuicksearches = React.useMemo(
    () => quickSearches.filter((qs) => activeLevel <= qs.featureLevel),
    [activeLevel]
  );

  const items = React.useMemo(() => {
    return filteredQuicksearches.map(({ id, icon, name, createAction = () => undefined }) => (
      <MenuItem
        key={id}
        itemId={id}
        icon={
          <div style={{ height: '1em', width: '1em' }}>
            <Bullseye>{icon}</Bullseye>
          </div>
        }
        onClick={() => createAction({ history, services, notifications })}
      >
        {name}
      </MenuItem>
    ));
  }, [filteredQuicksearches, history, services, notifications]);

  return isShow || hover ? (
    <Menu
      {...props}
      id={`quick-searches-menu`}
      key={`quick-searches-menu`}
      isScrollable
      ref={hoverRef as React.Ref<HTMLDivElement>}
    >
      <MenuContent>
        <MenuList>{items}</MenuList>
      </MenuContent>
    </Menu>
  ) : null;
};
