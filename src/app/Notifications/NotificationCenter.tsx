import * as React from 'react';
import { Alert, AlertActionCloseButton, AlertGroup, AlertVariant, Text, TextVariants } from '@patternfly/react-core';
import { Notification, NotificationsContext } from './Notifications';

export const NotificationCenter = () => {
  const context = React.useContext(NotificationsContext);

  const [notifications, setNotifications] = React.useState([] as Notification[]);

  const removeNotificationByKey = (notifications, key) => {
    const idx = notifications.findIndex(n => n.key === key);
    if (idx < 0) {
      return notifications;
    }
    const before = notifications.slice(0, idx);
    const after = notifications.slice(idx + 1, notifications.length);
    return before.concat(after);
  };

  const addNotification = (notification: Notification) => {
    setNotifications([...notifications, notification]);
    if (notification.timeout) {
      window.setTimeout(() => setNotifications(removeNotificationByKey(notifications, notification.key)), notification.timeout);
    }
  };

  React.useEffect(() => {
    const sub = context.watch().subscribe(notification => addNotification(notification));
    return () => sub.unsubscribe();
  });

  return (<>
    <AlertGroup isToast>
    {
      notifications.map(({key, title, message, variant}) => (
        <Alert
          isLiveRegion
          variant={AlertVariant[variant]}
          title={title}
          key={key}
          actionClose={
            <AlertActionCloseButton
              title={title}
              variantLabel={`${variant} alert`}
              onClose={() => setNotifications(removeNotificationByKey(notifications, key))}
            />
          }
        >
          <Text component={TextVariants.p}>{message}</Text>
        </Alert>
      ))
    }
    </AlertGroup>
  </>);

};
