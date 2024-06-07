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
import { Notification } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import useDayjs from '@app/utils/hooks/useDayjs';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  NotificationDrawer,
  NotificationDrawerBody,
  NotificationDrawerGroup,
  NotificationDrawerGroupList,
  NotificationDrawerHeader,
  NotificationDrawerList,
  NotificationDrawerListItem,
  NotificationDrawerListItemBody,
  NotificationDrawerListItemHeader,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { combineLatest } from 'rxjs';

const countUnreadNotifications = (notifications: Notification[]) => {
  return notifications.filter((n) => !n.read).length;
};

export interface NotificationDrawerCategory {
  title: string;
  isExpanded: boolean;
  notifications: Notification[];
  unreadCount: number;
}

export interface NotificationCenterProps {
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const [dayjs, datetimeContext] = useDayjs();
  const context = React.useContext(NotificationsContext);
  const addSubscription = useSubscriptions();

  const [totalUnreadNotificationsCount, setTotalUnreadNotificationsCount] = React.useState(0);
  const [isHeaderDropdownOpen, setHeaderDropdownOpen] = React.useState(false);
  const [drawerCategories, setDrawerCategories] = React.useState([
    { title: 'Completed actions', isExpanded: true, notifications: [] as Notification[], unreadCount: 0 },
    { title: 'Cryostat status', isExpanded: false, notifications: [] as Notification[], unreadCount: 0 },
    { title: 'Problems', isExpanded: true, notifications: [] as Notification[], unreadCount: 0 },
  ] as NotificationDrawerCategory[]);

  React.useEffect(() => {
    addSubscription(
      combineLatest([
        context.actionsNotifications(),
        context.cryostatStatusNotifications(),
        context.problemsNotifications(),
      ]).subscribe((notificationLists) => {
        setDrawerCategories((drawerCategories) => {
          return drawerCategories.map((category: NotificationDrawerCategory, idx) => {
            category.notifications = notificationLists[idx];
            category.unreadCount = countUnreadNotifications(notificationLists[idx]);
            return category;
          });
        });
      }),
    );
  }, [addSubscription, context, setDrawerCategories]);

  React.useEffect(() => {
    addSubscription(
      context.unreadNotifications().subscribe((s) => {
        setTotalUnreadNotificationsCount(s.length);
      }),
    );
  }, [addSubscription, context, context.unreadNotifications, setTotalUnreadNotificationsCount]);

  const handleToggleDropdown = React.useCallback(() => {
    setHeaderDropdownOpen((v) => !v);
  }, [setHeaderDropdownOpen]);

  const handleToggleExpandCategory = React.useCallback(
    (categoryIdx) => {
      setDrawerCategories((drawerCategories) => {
        return drawerCategories.map((category: NotificationDrawerCategory, idx) => {
          category.isExpanded = idx === categoryIdx ? !category.isExpanded : false;
          return category;
        });
      });
    },
    [setDrawerCategories],
  );

  const handleMarkAllRead = React.useCallback(() => {
    context.markAllRead();
  }, [context]);

  const handleClearAll = React.useCallback(() => {
    context.clearAll();
  }, [context]);

  const markRead = React.useCallback(
    (key?: string) => {
      context.setRead(key);
    },
    [context],
  );

  const timestampToDateTimeString = (timestamp?: number): string => {
    if (!timestamp) {
      return '';
    }
    return dayjs(timestamp).tz(datetimeContext.timeZone.full).format('L LTS z');
  };

  const drawerDropdownItems = React.useMemo(
    () => [
      <DropdownItem key="markAllRead" onClick={handleMarkAllRead} component="button">
        Mark all read
      </DropdownItem>,
      <DropdownItem key="clearAll" onClick={handleClearAll} component="button">
        Clear all
      </DropdownItem>,
    ],
    [handleMarkAllRead, handleClearAll],
  );

  return (
    <>
      <NotificationDrawer>
        <NotificationDrawerHeader count={totalUnreadNotificationsCount} onClose={onClose}>
          <Dropdown
            isPlain
            onSelect={handleToggleDropdown}
            toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
              <MenuToggle
                ref={toggleRef}
                variant="plain"
                onClick={() => setHeaderDropdownOpen((open) => !open)}
                isExpanded={isHeaderDropdownOpen}
              >
                <EllipsisVIcon />
              </MenuToggle>
            )}
            isOpen={isHeaderDropdownOpen}
            popperProps={{
              position: 'right',
            }}
          >
            <DropdownList>{drawerDropdownItems}</DropdownList>
          </Dropdown>
        </NotificationDrawerHeader>
        <NotificationDrawerBody>
          <NotificationDrawerGroupList>
            {drawerCategories.map(({ title, isExpanded, notifications, unreadCount }, idx) => (
              <NotificationDrawerGroup
                title={title}
                isExpanded={isExpanded}
                count={unreadCount}
                onExpand={() => handleToggleExpandCategory(idx)}
                key={idx}
              >
                <NotificationDrawerList isHidden={!isExpanded}>
                  {notifications.map(({ key, title, message, variant, timestamp, read }) => (
                    <NotificationDrawerListItem key={key} variant={variant} onClick={() => markRead(key)} isRead={read}>
                      <NotificationDrawerListItemHeader title={title} variant={variant} />
                      <NotificationDrawerListItemBody timestamp={timestampToDateTimeString(timestamp)}>
                        <Text component={TextVariants.p}>{message?.toString()}</Text>
                      </NotificationDrawerListItemBody>
                    </NotificationDrawerListItem>
                  ))}
                </NotificationDrawerList>
              </NotificationDrawerGroup>
            ))}
          </NotificationDrawerGroupList>
        </NotificationDrawerBody>
      </NotificationDrawer>
    </>
  );
};
