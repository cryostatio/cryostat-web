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
import * as _ from 'lodash';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationCenter } from '@app/Notifications/NotificationCenter';
import { IAppRoute, navGroups, routes } from '@app/routes';
import { Alert, AlertGroup, AlertVariant, AlertActionCloseButton,
  Brand, Button, Dropdown, DropdownGroup, DropdownItem, DropdownToggle, Nav, NavGroup, NavItem, NavList, NotificationBadge, Page, PageHeader,
  PageHeaderTools, PageHeaderToolsGroup, PageHeaderToolsItem, PageSidebar, SkipToContent
} from '@patternfly/react-core';
import { BellIcon, CaretDownIcon, CogIcon, HelpIcon, UserIcon } from '@patternfly/react-icons';
import { map, } from 'rxjs/operators';
import { matchPath, NavLink, useHistory, useLocation } from 'react-router-dom';
import { Notification, Notifications, NotificationsContext } from '@app/Notifications/Notifications';
import { AuthModal } from './AuthModal';
import { SslErrorModal } from './SslErrorModal';
import { AboutCryostatModal } from '@app/About/AboutCryostatModal';
import cryostatLogoHorizontal from '@app/assets/logo-cryostat-3-horizontal.svg';
import { SessionState } from '@app/Shared/Services/Login.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';

interface IAppLayout {
  children: React.ReactNode;
}

const AppLayout: React.FunctionComponent<IAppLayout> = ({children}) => {
  const serviceContext = React.useContext(ServiceContext);
  const notificationsContext = React.useContext(NotificationsContext);
  const routerHistory = useHistory();
  const logoProps = {
    href: '/'
  };
  const [isNavOpen, setIsNavOpen] = React.useState(true);
  const [isMobileView, setIsMobileView] = React.useState(true);
  const [isNavOpenMobile, setIsNavOpenMobile] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showSslErrorModal, setShowSslErrorModal] = React.useState(false);
  const [aboutModalOpen, setAboutModalOpen] = React.useState(false);
  const [isNotificationDrawerExpanded, setNotificationDrawerExpanded] = React.useState(false);
  const [showUserIcon, setShowUserIcon] = React.useState(false);
  const [showUserInfoDropdown, setShowUserInfoDropdown] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [notifications, setNotifications] = React.useState([] as Notification[]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [errorNotificationsCount, setErrorNotificationsCount] = React.useState(0);
  const location = useLocation();

  React.useEffect(() => {
    const sub = serviceContext.target.authFailure().subscribe(() => {
      setShowAuthModal(true);
    });
    return () => sub.unsubscribe();
  }, [serviceContext.target]);

  React.useEffect(() => {
    const sub = notificationsContext.notifications().subscribe(setNotifications);
    return () => sub.unsubscribe();
  }, []);

  React.useEffect(() => {
    const sub = notificationsContext.unreadNotifications().subscribe(s => setUnreadNotificationsCount(s.length));
    return () => sub.unsubscribe();
  }, [notificationsContext, notificationsContext.unreadNotifications, unreadNotificationsCount, setUnreadNotificationsCount]);

  React.useEffect(() => {
    const sub = notificationsContext
      .unreadNotifications()
      .pipe(map((notifications: Notification[]) =>
        _.filter(notifications, n => n.variant === AlertVariant.danger || n.variant === AlertVariant.warning)
      ))
      .subscribe(s => setErrorNotificationsCount(s.length));
    return () => sub.unsubscribe();
  }, [notificationsContext, notificationsContext.unreadNotifications, unreadNotificationsCount, setUnreadNotificationsCount]);

  const dismissAuthModal = () => {
    setShowAuthModal(false);
  };
  const handleMarkNotificationRead = React.useCallback(key => {
    notificationsContext.setRead(key, true);
  }, [notificationsContext]);

  React.useEffect(() => {
    const sub = serviceContext.target.sslFailure().subscribe(() => {
      setShowSslErrorModal(true);
    });
    return () => sub.unsubscribe();
  }, [serviceContext.target]);

  const dismissSslErrorModal = () => {
    setShowSslErrorModal(false);
  }

  const onNavToggleMobile = () => {
    setIsNavOpenMobile(!isNavOpenMobile);
  };
  const onNavToggle = () => {
    setIsNavOpen(!isNavOpen);
  }
  const onPageResize = (props: { mobileView: boolean; windowSize: number }) => {
    setIsMobileView(props.mobileView);
  };
  const mobileOnSelect = (selected) => {
    if(isMobileView) setIsNavOpenMobile(false)
  };
  const handleSettingsButtonClick = () => {
    routerHistory.push('/settings');
  };
  const handleNotificationCenterToggle = () => {
    setNotificationDrawerExpanded(!isNotificationDrawerExpanded);
  };
  const handleCloseNotificationCenter = () => {
    setNotificationDrawerExpanded(false);
  };
  const handleAboutModalToggle = () => {
    setAboutModalOpen(!aboutModalOpen);
  };

  React.useEffect(() => {
    const sub = serviceContext.login.getSessionState().subscribe(sessionState => {
      setShowUserIcon(sessionState === SessionState.USER_SESSION);
    });
    return () => sub.unsubscribe();
  }, [serviceContext.target]);

  const handleLogout = React.useCallback(() => {
      const sub = serviceContext.login.setLoggedOut().subscribe();
      return () => sub.unsubscribe();
  }, [serviceContext.login]);

  const handleUserInfoToggle = React.useCallback(() =>
    setShowUserInfoDropdown(v => !v),
    [setShowUserInfoDropdown]);

  React.useEffect(() => {
    const sub = serviceContext.login.getUsername().subscribe(setUsername);
    return () => sub.unsubscribe();
  }, [serviceContext, serviceContext.login]);

  const userInfoItems = [
    <DropdownGroup key={0}>
      <DropdownItem onClick={handleLogout}>Logout</DropdownItem>
    </DropdownGroup>
  ];

  const UserInfoToggle = (
    <DropdownToggle onToggle={handleUserInfoToggle} toggleIndicator={CaretDownIcon}>
      {username || <UserIcon color="white" size="sm"/>}
    </DropdownToggle>
  );

  const HeaderTools = (<>
    <PageHeaderTools>
      <PageHeaderToolsGroup>
        <PageHeaderToolsItem visibility={{ default: 'visible' }} isSelected={isNotificationDrawerExpanded} >
          <NotificationBadge
            count={unreadNotificationsCount}
            variant={errorNotificationsCount > 0 ? 'attention' : unreadNotificationsCount === 0 ? 'read' : 'unread'}
            onClick={handleNotificationCenterToggle} aria-label='Notifications'
            >
            <BellIcon />
          </NotificationBadge>
        </PageHeaderToolsItem>
        <PageHeaderToolsItem>
          <Button
            onClick={handleSettingsButtonClick}
            variant='link'
            icon={<CogIcon color='white 'size='sm' />}
          />
          <Button
            onClick={handleAboutModalToggle}
            variant='link'
            icon={<HelpIcon color='white' size='sm' />}
          />
        </PageHeaderToolsItem>
        <PageHeaderToolsItem visibility={{default: showUserIcon ? 'visible' : 'hidden'}} >
            <Dropdown
              isPlain={true}
              isOpen={showUserInfoDropdown}
              toggle={UserInfoToggle}
              dropdownItems={userInfoItems}
            />
          </PageHeaderToolsItem>
      </PageHeaderToolsGroup>
    </PageHeaderTools>
  </>);
  const Header = (<>
    <PageHeader
      logo={<Brand alt="Cryostat" src={cryostatLogoHorizontal} className="cryostat-logo" />}
      logoProps={logoProps}
      showNavToggle
      isNavOpen={isNavOpen}
      onNavToggle={isMobileView ? onNavToggleMobile : onNavToggle}
      headerTools={HeaderTools}
    />
    <AboutCryostatModal
      isOpen={aboutModalOpen}
      onClose={handleAboutModalToggle}
    />
  </>);

  const isActiveRoute = (route: IAppRoute): boolean => {
    const match = matchPath(location.pathname, route.path);
    if (match && match.isExact) {
      return true;
    } else if (route.children) {
      let childMatch = false;
      for (const r of route.children) {
        childMatch = childMatch || isActiveRoute(r);
      }
      return childMatch;
    }
    return false;
  };

  const Navigation = (
    <Nav id="nav-primary-simple" theme="dark" variant="default" onSelect={mobileOnSelect}>
      <NavList id="nav-list-simple">
        {navGroups.map((title) => {
          return (
          <NavGroup title={title}>
            {routes.filter(route => route.navGroup === title)
              .map((route, idx) => {
                return (
                route.label && (
                <NavItem key={`${route.label}-${idx}`} id={`${route.label}-${idx}`} isActive={isActiveRoute(route)}>
                  <NavLink exact to={route.path} activeClassName="pf-m-current">{route.label}</NavLink>
                </NavItem>
                ));
              })}
          </NavGroup>
          );
        })}
      </NavList>
    </Nav>
  );
  const Sidebar = (
    <PageSidebar
      theme="dark"
      nav={Navigation}
      isNavOpen={isMobileView ? isNavOpenMobile : isNavOpen} />
  );
  const PageSkipToContent = (
    <SkipToContent href="#primary-app-container">
      Skip to Content
    </SkipToContent>
  );
  const NotificationDrawer = React.useMemo(() => (<NotificationCenter onClose={handleCloseNotificationCenter} />), []);
  return (<>
    <AlertGroup isToast>
      {
        notifications
          .filter(n => !n.read && (Notifications.isProblemNotification(n) || n.variant === AlertVariant.success))
          .filter(n => serviceContext.settings.notificationsEnabledFor(NotificationCategory[n.category || '']))
          .sort((prev, curr) => {
            if(!prev.timestamp) return -1;
            if(!curr.timestamp) return 1;
            return prev.timestamp - curr.timestamp;
          })
          .map(( { key, title, message, variant } ) => (
            <Alert
              variant={variant}
              title={title}
              actionClose={<AlertActionCloseButton onClose={() => handleMarkNotificationRead(key)} />}
              timeout={true}
            >{message}
            </Alert>
        ))
      }
    </AlertGroup>
    <Page
      mainContainerId="primary-app-container"
      header={Header}
      sidebar={Sidebar}
      notificationDrawer={NotificationDrawer}
      isNotificationDrawerExpanded={isNotificationDrawerExpanded}
      onPageResize={onPageResize}
      skipToContent={PageSkipToContent}>
      {children}
    </Page>
    <AuthModal visible={showAuthModal} onDismiss={dismissAuthModal} onSave={dismissAuthModal}/>
    <SslErrorModal visible={showSslErrorModal} onDismiss={dismissSslErrorModal}/>
  </>);
}

export { AppLayout };

