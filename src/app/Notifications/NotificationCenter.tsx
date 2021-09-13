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
import { AlertVariant, Dropdown, DropdownItem, DropdownPosition, KebabToggle,
  NotificationDrawer, NotificationDrawerBody, NotificationDrawerGroup, NotificationDrawerGroupList, NotificationDrawerHeader,
  NotificationDrawerList, NotificationDrawerListItem,
  NotificationDrawerListItemBody, NotificationDrawerListItemHeader, Text,
  TextVariants } from '@patternfly/react-core';
import { Notification, NotificationsContext } from './Notifications';

export interface NotificationCenterProps {
  onClose: () => void;
}

export const NotificationCenter: React.FunctionComponent<NotificationCenterProps> = props => {
  const context = React.useContext(NotificationsContext);

  const [actionsNotifications, setActionsNotifications] = React.useState([] as Notification[]);
  const [networkInfoNotifications, setNetworkInfoNotifications] = React.useState([] as Notification[]);
  const [problemsNotifications, setProblemsNotifications] = React.useState([] as Notification[]);

  const [expandedCategories, setExpandedCategories] = React.useState([false, false, false]);
  const [selectedCategoryIdx, setSelectedCategoryIdx] = React.useState(0);

  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [unreadActionsCount, setUnreadActionsCount] = React.useState(0);
  const [unreadNetworkInfoCount, setUnreadNetworkInfoCount] = React.useState(0);
  const [unreadProblemsCount, setUnreadProblemsCount] = React.useState(0);

  const [isHeaderDropdownOpen, setHeaderDropdownOpen] = React.useState(false);

  React.useEffect(() => {
    const sub = context.notifications().subscribe(notifications => {
      sortNotificationsByCategory(notifications);
    });
    return () => sub.unsubscribe();
  },[context, context.notifications]);

  React.useEffect(() => {
    const sub = context.unreadNotifications().subscribe(s => {
      setUnreadNotificationsCount(s.length)});
    return () => sub.unsubscribe();
  }, [context, context.unreadNotifications, setUnreadNotificationsCount]);

  const sortNotificationsByCategory = notifications => {
    let updatedActionsNotifications = [] as Notification[];
    let updatedNetworkInfoNotifications = [] as Notification[];;
    let updatedProblemsNotifications = [] as Notification[];;

    notifications.forEach((msg) => {
      if(isProblemNotification(msg)) {
        updatedProblemsNotifications = [...updatedProblemsNotifications, msg];
      } else if(isNetworkInfoNotification(msg)) {
        updatedNetworkInfoNotifications = [...updatedNetworkInfoNotifications, msg];
      } else {
        updatedActionsNotifications = [...updatedActionsNotifications, msg];
      }
    });

    setActionsNotifications(updatedActionsNotifications);
    setNetworkInfoNotifications(updatedNetworkInfoNotifications);
    setProblemsNotifications(updatedProblemsNotifications);

    setUnreadActionsCount(countUnreadNotifications(updatedActionsNotifications));
    setUnreadNetworkInfoCount(countUnreadNotifications(updatedNetworkInfoNotifications));
    setUnreadProblemsCount(countUnreadNotifications(updatedProblemsNotifications));

  };

  const isProblemNotification = (msg) => (
    (msg.variant === AlertVariant.warning) || (msg.variant === AlertVariant.danger)
  );

  const isNetworkInfoNotification = (msg) => (
    (msg.category === 'WsClientActivity' || msg.category === 'TargetJvmDiscovery')
      && (msg.variant === AlertVariant.info)
  );

  const countUnreadNotifications = (notifications: Notification[]) => {
    return notifications.filter(n => !n.read).length;
  }

  const handleToggleDropdown = React.useCallback(() => {
    setHeaderDropdownOpen(v => !v);
  }, [setHeaderDropdownOpen]);

  const handleExpandCategory = React.useCallback((categoryIdx) => {
    setSelectedCategoryIdx(categoryIdx);
  }, [setSelectedCategoryIdx]);

  // Expands the first category by default unless
  // there are unread errors/warnings
  React.useEffect(() => {
    if(unreadProblemsCount > 0) {
      setExpandedCategories([false, false, true]);
      return;
    }

    const newExpandedCategory = expandedCategories.map((isExpanded, idx) => {
      return idx === selectedCategoryIdx ? !isExpanded : false;
    });
    setExpandedCategories(newExpandedCategory);
  }, [setExpandedCategories, selectedCategoryIdx, unreadProblemsCount]);

  const handleMarkAllRead = React.useCallback(() => {
    context.markAllRead();
  }, [context, context.markAllRead]);

  const handleClearAll = React.useCallback(() => {
    context.clearAll();
  }, [context, context.clearAll]);

  const markRead = React.useCallback((key?: string) => {
    context.setRead(key);
  }, [context, context.setRead]);

  const timestampToDateTimeString = (timestamp?: number): string => {
    if (!timestamp) {
      return '';
    }
    var date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  const drawerDropdownItems = [
    <DropdownItem key="markAllRead" onClick={handleMarkAllRead} component="button">
      Mark all read
    </DropdownItem>,
    <DropdownItem key="clearAll" onClick={handleClearAll} component="button">
      Clear all
    </DropdownItem>,
  ];

  const NotificationDrawerCategories = () => {
    const notificationCategories = ["Completed Actions", "Network Info", "Problems"];
    const sortedNotifications = [actionsNotifications, networkInfoNotifications, problemsNotifications];
    const unreadCategoriesCount = [unreadActionsCount, unreadNetworkInfoCount, unreadProblemsCount];

    return <NotificationDrawerGroupList>
      { notificationCategories.map((title, idx) => (
        <NotificationDrawerGroup
          title={title}
          isExpanded={expandedCategories[idx]}
          count={unreadCategoriesCount[idx]}
          onExpand={() => handleExpandCategory(idx)}
        >
        <NotificationDrawerList isHidden={!expandedCategories[idx]}>
              {
                sortedNotifications[idx].map(({ key, title, message, variant, timestamp, read }) => (
                  <NotificationDrawerListItem key={key} variant={variant} onClick={() => markRead(key)} isRead={read} >
                    <NotificationDrawerListItemHeader title={title} variant={variant} />
                    <NotificationDrawerListItemBody timestamp={timestampToDateTimeString(timestamp)} >
                      <Text component={TextVariants.p}>{message}</Text>
                    </NotificationDrawerListItemBody>
                  </NotificationDrawerListItem>
                ))
              }
        </NotificationDrawerList>
        </NotificationDrawerGroup>
      ))}
    </NotificationDrawerGroupList>;
};

  return (<>
    <NotificationDrawer>
      <NotificationDrawerHeader count={unreadNotificationsCount} onClose={props.onClose} >
        <Dropdown
          isPlain
          onSelect={handleToggleDropdown}
          toggle={(<KebabToggle onToggle={handleToggleDropdown} />)}
          isOpen={isHeaderDropdownOpen}
          position={DropdownPosition.right}
          dropdownItems={drawerDropdownItems}
        />
      </NotificationDrawerHeader>
      <NotificationDrawerBody>
        <NotificationDrawerCategories />
      </NotificationDrawerBody>
    </NotificationDrawer>
  </>);

};
