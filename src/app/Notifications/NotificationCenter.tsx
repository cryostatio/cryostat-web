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
import { Dropdown, DropdownItem, DropdownPosition, KebabToggle,
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
  const [notifications, setNotifications] = React.useState([] as Notification[]);
  const [actionsExpanded, setActionsExpanded] = React.useState(true);
  const [networkInfoExpanded, setNetworkInfoExpanded] = React.useState(true);
  const [problemsExpanded, setProblemsExpanded] = React.useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [unreadActionsCount, setUnreadActionsCount] = React.useState(0);
  const [unreadNetworkInfoCount, setUnreadNetworkInfoCount] = React.useState(0);
  const [unreadProblemsCount, setUnreadProblemsCount] = React.useState(0);

  const [isHeaderDropdownOpen, setHeaderDropdownOpen] = React.useState(false);

  React.useEffect(() => {
    const sub = context.notifications().subscribe(setNotifications);
    return () => sub.unsubscribe();
  }, [context, context.notifications, notifications, setNotifications]);

  React.useEffect(() => {
    const sub = context.unreadNotifications().subscribe(s => {
      setUnreadNotificationsCount(s.length)});
    return () => sub.unsubscribe();
  }, [context, context.unreadNotifications, unreadNotificationsCount, setUnreadNotificationsCount]);

  // TODO reduce duplication
  React.useEffect(() => {
    const sub = context.actionsNotifications().subscribe(setActionsNotifications);
    return () => sub.unsubscribe();
  }, [context, context.actionsNotifications, notifications, setActionsNotifications]);

  React.useEffect(() => {
    const sub = context.networkInfoNotifications().subscribe(setNetworkInfoNotifications);
    return () => sub.unsubscribe();
  }, [context, context.networkInfoNotifications, notifications, setNetworkInfoNotifications]);

  React.useEffect(() => {
    const sub = context.problemsNotifications().subscribe(setProblemsNotifications);
    return () => sub.unsubscribe();
  }, [context, context.problemsNotifications, notifications, setProblemsNotifications]);

  React.useEffect(() => {
    const sub = context.unreadActionsNotifications().subscribe(s => {
      setUnreadActionsCount(s.length)});
    return () => sub.unsubscribe();
  }, [context, context.unreadActionsNotifications, unreadNotificationsCount, setUnreadActionsCount]);

  React.useEffect(() => {
    const sub = context.unreadNetworkInfoNotifications().subscribe(s => {
      setUnreadNetworkInfoCount(s.length)});
    return () => sub.unsubscribe();
  }, [context, context.unreadNetworkInfoNotifications, unreadNotificationsCount, setUnreadNetworkInfoCount]);

  React.useEffect(() => {
    const sub = context.unreadProblemsNotifications().subscribe(s => {
      setUnreadProblemsCount(s.length)});
    return () => sub.unsubscribe();
  }, [context, context.unreadProblemsNotifications, unreadNotificationsCount, setUnreadProblemsCount]);

  const handleToggleDropdown = React.useCallback(() => {
    setHeaderDropdownOpen(v => !v);
  }, []);

  const handleToggleDrawerGroup = React.useCallback((setGroupExpanded) => {
    setGroupExpanded(v => !v);
  },[]); // dependencies?

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

  const NotificationDrawerGroupItems = ({title, isExpanded, notifications, count, onExpand}) => (
    <NotificationDrawerGroup
      title={title}
      isExpanded={isExpanded}
      count={count}
      onExpand={() => handleToggleDrawerGroup(onExpand)}
    >
      <NotificationDrawerList isHidden={!isExpanded}>
            {
              notifications.map(({ key, title, message, variant, timestamp, read }) => (
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
  );

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
      <NotificationDrawerGroupList>
        <NotificationDrawerGroupItems
          title="Completed Actions"
          isExpanded={actionsExpanded}
          notifications={actionsNotifications}
          count={unreadActionsCount}
          onExpand={setActionsExpanded}
        />
        <NotificationDrawerGroupItems
          title="Network Info"
          isExpanded={networkInfoExpanded}
          notifications={networkInfoNotifications}
          count={unreadNetworkInfoCount}
          onExpand={setNetworkInfoExpanded}
        />
        <NotificationDrawerGroupItems
          title="Problems"
          isExpanded={problemsExpanded}
          notifications={problemsNotifications}
          count={unreadProblemsCount}
          onExpand={setProblemsExpanded}
        />
      </NotificationDrawerGroupList>
      </NotificationDrawerBody>
    </NotificationDrawer>
  </>);

};
