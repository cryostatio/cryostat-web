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
import { AboutCryostatModal } from '@app/About/AboutCryostatModal';
import cryostatLogo from '@app/assets/cryostat_logo_hori_rgb_reverse.svg';
import build from '@app/build.json';
import { NotificationCenter } from '@app/Notifications/NotificationCenter';
import { Notification, NotificationsContext } from '@app/Notifications/Notifications';
import { IAppRoute, navGroups, routes } from '@app/routes';
import { DynamicFeatureFlag, FeatureFlag } from '@app/Shared/FeatureFlag/FeatureFlag';
import { SessionState } from '@app/Shared/Services/Login.service';
import { NotificationCategory } from '@app/Shared/Services/NotificationChannel.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { openTabForUrl } from '@app/utils/utils';
import {
  Alert,
  AlertGroup,
  AlertVariant,
  AlertActionCloseButton,
  Brand,
  Button,
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownToggle,
  Nav,
  NavGroup,
  NavItem,
  NavList,
  NotificationBadge,
  Page,
  PageSidebar,
  SkipToContent,
  Label,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  PageToggleButton,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  BarsIcon,
  BellIcon,
  CaretDownIcon,
  CogIcon,
  ExternalLinkAltIcon,
  PlusCircleIcon,
  QuestionCircleIcon,
  UserIcon,
} from '@patternfly/react-icons';
import _ from 'lodash';
import * as React from 'react';
import { matchPath, Link, NavLink, useHistory, useLocation } from 'react-router-dom';
import { map } from 'rxjs/operators';
import { AuthModal } from './AuthModal';
import { SslErrorModal } from './SslErrorModal';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FunctionComponent<AppLayoutProps> = ({ children }) => {
  const serviceContext = React.useContext(ServiceContext);
  const notificationsContext = React.useContext(NotificationsContext);
  const addSubscription = useSubscriptions();
  const routerHistory = useHistory();
  const [isNavOpen, setIsNavOpen] = React.useState(true);
  const [isMobileView, setIsMobileView] = React.useState(true);
  const [isNavOpenMobile, setIsNavOpenMobile] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showSslErrorModal, setShowSslErrorModal] = React.useState(false);
  const [aboutModalOpen, setAboutModalOpen] = React.useState(false);
  const [isNotificationDrawerExpanded, setNotificationDrawerExpanded] = React.useState(false);
  const [showUserIcon, setShowUserIcon] = React.useState(false);
  const [showUserInfoDropdown, setShowUserInfoDropdown] = React.useState(false);
  const [showHelpDropdown, setShowHelpDropdown] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [notifications, setNotifications] = React.useState([] as Notification[]);
  const [visibleNotificationsCount, setVisibleNotificationsCount] = React.useState(5);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [errorNotificationsCount, setErrorNotificationsCount] = React.useState(0);
  const location = useLocation();

  React.useEffect(() => {
    addSubscription(
      serviceContext.target.authFailure().subscribe(() => {
        setShowAuthModal(true);
      })
    );
  }, [serviceContext.target, setShowAuthModal, addSubscription]);

  React.useEffect(() => {
    addSubscription(notificationsContext.notifications().subscribe((n) => setNotifications([...n])));
  }, [notificationsContext, addSubscription]);

  React.useEffect(() => {
    addSubscription(notificationsContext.drawerState().subscribe(setNotificationDrawerExpanded));
  }, [addSubscription, notificationsContext, setNotificationDrawerExpanded]);

  React.useEffect(() => {
    addSubscription(serviceContext.settings.visibleNotificationsCount().subscribe(setVisibleNotificationsCount));
  }, [addSubscription, serviceContext.settings, setVisibleNotificationsCount]);

  const notificationsToDisplay = React.useMemo(() => {
    return notifications
      .filter((n) => !n.read && !n.hidden)
      .filter((n) => serviceContext.settings.notificationsEnabledFor(NotificationCategory[n.category || '']))
      .sort((prev, curr) => {
        if (!prev.timestamp) return -1;
        if (!curr.timestamp) return 1;
        return prev.timestamp - curr.timestamp;
      });
  }, [notifications, serviceContext.settings]);

  const overflowMessage = React.useMemo(() => {
    if (isNotificationDrawerExpanded) {
      return '';
    }
    const overflow = notificationsToDisplay.length - visibleNotificationsCount;
    if (overflow > 0) {
      return `View ${overflow} more`;
    }
    return '';
  }, [isNotificationDrawerExpanded, notificationsToDisplay, visibleNotificationsCount]);

  React.useEffect(() => {
    addSubscription(notificationsContext.unreadNotifications().subscribe((s) => setUnreadNotificationsCount(s.length)));
  }, [notificationsContext, unreadNotificationsCount, setUnreadNotificationsCount, addSubscription]);

  React.useEffect(() => {
    addSubscription(
      notificationsContext
        .unreadNotifications()
        .pipe(
          map((notifications: Notification[]) =>
            _.filter(notifications, (n) => n.variant === AlertVariant.danger || n.variant === AlertVariant.warning)
          )
        )
        .subscribe((s) => setErrorNotificationsCount(s.length))
    );
  }, [
    notificationsContext,
    notificationsContext.unreadNotifications,
    unreadNotificationsCount,
    setUnreadNotificationsCount,
    addSubscription,
  ]);

  const dismissAuthModal = React.useCallback(() => {
    setShowAuthModal(false);
  }, [setShowAuthModal]);

  const authModalOnSave = React.useCallback(() => {
    serviceContext.target.setAuthRetry();
    dismissAuthModal();
  }, [serviceContext.target, dismissAuthModal]);

  const handleMarkNotificationRead = React.useCallback(
    (key) => () => notificationsContext.setRead(key, true),
    [notificationsContext]
  );

  const handleTimeout = React.useCallback(
    (key) => () => notificationsContext.setHidden(key),
    [notificationsContext]
  );

  React.useEffect(() => {
    addSubscription(
      serviceContext.target.sslFailure().subscribe(() => {
        setShowSslErrorModal(true);
      })
    );
  }, [serviceContext.target, serviceContext.target.sslFailure, setShowSslErrorModal, addSubscription]);

  const dismissSslErrorModal = React.useCallback(() => setShowSslErrorModal(false), [setShowSslErrorModal]);

  const onNavToggleMobile = React.useCallback(() => {
    setIsNavOpenMobile((isNavOpenMobile) => !isNavOpenMobile);
  }, [setIsNavOpenMobile]);

  const onNavToggle = React.useCallback(() => {
    setIsNavOpen((isNavOpen) => !isNavOpen);
  }, [setIsNavOpen]);

  const onPageResize = React.useCallback(
    (props: { mobileView: boolean; windowSize: number }) => {
      setIsMobileView(props.mobileView);
    },
    [setIsMobileView]
  );

  const mobileOnSelect = React.useCallback(
    (_selected) => {
      if (isMobileView) {
        setIsNavOpenMobile(false);
      }
    },
    [isMobileView, setIsNavOpenMobile]
  );

  const handleSettingsButtonClick = React.useCallback(() => {
    routerHistory.push('/settings');
  }, [routerHistory]);

  const handleNotificationCenterToggle = React.useCallback(() => {
    notificationsContext.setDrawerState(!isNotificationDrawerExpanded);
  }, [isNotificationDrawerExpanded, notificationsContext]);

  const handleCloseNotificationCenter = React.useCallback(() => {
    notificationsContext.setDrawerState(false);
  }, [notificationsContext]);

  const handleOpenNotificationCenter = React.useCallback(() => {
    notificationsContext.setDrawerState(true);
  }, [notificationsContext]);

  React.useEffect(() => {
    addSubscription(
      serviceContext.login.getSessionState().subscribe((sessionState) => {
        setShowUserIcon(sessionState === SessionState.USER_SESSION);
      })
    );
  }, [serviceContext.login, serviceContext.login.getSessionState, setShowUserIcon, addSubscription]);

  const handleLogout = React.useCallback(() => {
    addSubscription(serviceContext.login.setLoggedOut().subscribe());
  }, [serviceContext.login, addSubscription]);

  const handleUserInfoToggle = React.useCallback(() => setShowUserInfoDropdown((v) => !v), [setShowUserInfoDropdown]);

  React.useEffect(() => {
    addSubscription(serviceContext.login.getUsername().subscribe(setUsername));
  }, [serviceContext, serviceContext.login, addSubscription, setUsername]);

  const userInfoItems = React.useMemo(
    () => [
      <DropdownGroup key={'log-out'}>
        <DropdownItem onClick={handleLogout}>Log out</DropdownItem>
      </DropdownGroup>,
    ],
    [handleLogout]
  );

  const UserInfoToggle = React.useMemo(
    () => (
      <DropdownToggle onToggle={handleUserInfoToggle} toggleIndicator={CaretDownIcon}>
        {username || <UserIcon color="white" size="sm" />}
      </DropdownToggle>
    ),
    [username, handleUserInfoToggle]
  );

  const handleHelpToggle = React.useCallback(() => setShowHelpDropdown((v) => !v), [setShowHelpDropdown]);

  const handleOpenAboutModal = React.useCallback(() => {
    setAboutModalOpen(true);
  }, [setAboutModalOpen]);

  const handleCloseAboutModal = React.useCallback(() => {
    setAboutModalOpen(false);
  }, [setAboutModalOpen]);

  const handleOpenDocumentation = React.useCallback(() => {
    openTabForUrl(build.homePageUrl);
  }, []);

  const handleOpenDiscussion = React.useCallback(() => {
    openTabForUrl(build.discussionUrl);
  }, []);

  const helpItems = React.useMemo(
    () => [
      <DropdownItem key={'documentation'} onClick={handleOpenDocumentation}>
        <span>Documentation</span>
        <ExternalLinkAltIcon color="grey" className="xsm-icon" style={{ marginLeft: '2ch' }} />
      </DropdownItem>,
      <DropdownItem key={'Help'} onClick={handleOpenDiscussion}>
        <span>Help</span>
        <ExternalLinkAltIcon color="grey" className="xsm-icon" style={{ marginLeft: '2ch' }} />
      </DropdownItem>,
      <DropdownItem key={'About'} onClick={handleOpenAboutModal}>
        About
      </DropdownItem>,
    ],
    [handleOpenDocumentation, handleOpenDiscussion, handleOpenAboutModal]
  );

  const HelpToggle = React.useMemo(
    () => (
      <DropdownToggle onToggle={handleHelpToggle} toggleIndicator={null}>
        <QuestionCircleIcon />
      </DropdownToggle>
    ),
    [handleHelpToggle]
  );

  const levelBadge = React.useCallback((level: FeatureLevel) => {
    return (
      <Label
        isCompact
        style={{ marginLeft: '2ch', textTransform: 'capitalize', paddingTop: '0.125ch', paddingBottom: '0.125ch' }}
        color={level === FeatureLevel.BETA ? 'green' : 'red'}
      >
        {FeatureLevel[level].toLowerCase()}
      </Label>
    );
  }, []);

  const HeaderToolbar = React.useMemo(
    () => (
      <>
        <Toolbar isFullHeight isStatic>
          <ToolbarContent>
            <ToolbarGroup variant="icon-button-group" alignment={{ default: 'alignRight' }}>
              <FeatureFlag strict level={FeatureLevel.DEVELOPMENT}>
                <ToolbarItem>
                  <Button
                    variant="link"
                    onClick={() => notificationsContext.info(`test ${+Date.now()}`)}
                    icon={<PlusCircleIcon color="white" size="sm" />}
                  />
                </ToolbarItem>
              </FeatureFlag>
              <ToolbarGroup variant="icon-button-group">
                <ToolbarItem>
                  <NotificationBadge
                    count={unreadNotificationsCount}
                    variant={
                      errorNotificationsCount > 0 ? 'attention' : unreadNotificationsCount === 0 ? 'read' : 'unread'
                    }
                    onClick={handleNotificationCenterToggle}
                    aria-label="Notifications"
                  >
                    <BellIcon />
                  </NotificationBadge>
                </ToolbarItem>
                <ToolbarItem>
                  <Button
                    onClick={handleSettingsButtonClick}
                    variant="link"
                    icon={<CogIcon color="white " size="sm" />}
                  />
                </ToolbarItem>
                <ToolbarItem>
                  <Dropdown
                    isPlain
                    onSelect={() => setShowHelpDropdown(false)}
                    position="right"
                    isOpen={showHelpDropdown}
                    toggle={HelpToggle}
                    dropdownItems={helpItems}
                  />
                </ToolbarItem>
              </ToolbarGroup>
              <ToolbarItem visibility={{ default: showUserIcon ? 'visible' : 'hidden' }}>
                <Dropdown
                  isPlain
                  onSelect={() => setShowUserInfoDropdown(false)}
                  isOpen={showUserInfoDropdown}
                  toggle={UserInfoToggle}
                  dropdownItems={userInfoItems}
                />
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      </>
    ),
    [
      notificationsContext,
      isNotificationDrawerExpanded,
      unreadNotificationsCount,
      errorNotificationsCount,
      handleNotificationCenterToggle,
      handleSettingsButtonClick,
      setShowHelpDropdown,
      setShowUserInfoDropdown,
      showUserIcon,
      showUserInfoDropdown,
      showHelpDropdown,
      UserInfoToggle,
      userInfoItems,
      HelpToggle,
      helpItems
    ]
  );

  const Header = React.useMemo(
    () => (
      <>
        <Masthead>
          <MastheadToggle>
            <PageToggleButton
              variant="plain"
              aria-label="Navigation"
              isNavOpen={isNavOpen}
              onNavToggle={isMobileView ? onNavToggleMobile : onNavToggle}
            >
              <BarsIcon />
            </PageToggleButton>
          </MastheadToggle>
          <MastheadMain>
            <MastheadBrand>
              <Link to="/">
                <Brand alt="Cryostat" src={cryostatLogo} className="cryostat-logo" />
              </Link>
            </MastheadBrand>
            <DynamicFeatureFlag levels={[FeatureLevel.DEVELOPMENT, FeatureLevel.BETA]} component={levelBadge} />
          </MastheadMain>
          <MastheadContent>{HeaderToolbar}</MastheadContent>
        </Masthead>
        <AboutCryostatModal isOpen={aboutModalOpen} onClose={handleCloseAboutModal} />
      </>
    ),
    [
      isNavOpen,
      isMobileView,
      aboutModalOpen,
      HeaderToolbar,
      onNavToggleMobile,
      handleCloseAboutModal,
      onNavToggle,
      levelBadge,
    ]
  );

  const isActiveRoute = React.useCallback(
    (route: IAppRoute): boolean => {
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
    },
    [location]
  );

  const Navigation = React.useMemo(
    () => (
      <Nav id="nav-primary-simple" theme="dark" variant="default" onSelect={mobileOnSelect}>
        <NavList id="nav-list-simple">
          {navGroups.map((title) => {
            return (
              <NavGroup title={title} key={title}>
                {routes
                  .filter((route) => route.navGroup === title)
                  .map((route, idx) => {
                    return (
                      route.label && (
                        <NavItem
                          key={`${route.label}-${idx}`}
                          id={`${route.label}-${idx}`}
                          isActive={isActiveRoute(route)}
                        >
                          <NavLink exact to={route.path} activeClassName="pf-m-current">
                            {route.label}
                          </NavLink>
                        </NavItem>
                      )
                    );
                  })}
              </NavGroup>
            );
          })}
        </NavList>
      </Nav>
    ),
    [mobileOnSelect, isActiveRoute]
  );

  const Sidebar = React.useMemo(
    () => <PageSidebar theme="dark" nav={Navigation} isNavOpen={isMobileView ? isNavOpenMobile : isNavOpen} />,
    [Navigation, isMobileView, isNavOpenMobile, isNavOpen]
  );

  const PageSkipToContent = React.useMemo(
    () => <SkipToContent href="#primary-app-container">Skip to Content</SkipToContent>,
    []
  );

  const NotificationDrawer = React.useMemo(
    () => <NotificationCenter onClose={handleCloseNotificationCenter} />,
    [handleCloseNotificationCenter]
  );

  return (
    <>
      <AlertGroup isToast isLiveRegion overflowMessage={overflowMessage} onOverflowClick={handleOpenNotificationCenter}>
        {notificationsToDisplay.slice(0, visibleNotificationsCount).map(({ key, title, message, variant }) => (
          <Alert
            isLiveRegion
            variant={variant}
            key={title}
            title={title}
            actionClose={<AlertActionCloseButton onClose={handleMarkNotificationRead(key)} />}
            timeout={true}
            onTimeout={handleTimeout(key)}
          >
            {message?.toString()}
          </Alert>
        ))}
      </AlertGroup>
      <Page
        mainContainerId="primary-app-container"
        header={Header}
        sidebar={Sidebar}
        notificationDrawer={NotificationDrawer}
        isNotificationDrawerExpanded={isNotificationDrawerExpanded}
        onPageResize={onPageResize}
        skipToContent={PageSkipToContent}
      >
        {children}
      </Page>
      <AuthModal visible={showAuthModal} onDismiss={dismissAuthModal} onSave={authModalOnSave} />
      <SslErrorModal visible={showSslErrorModal} onDismiss={dismissSslErrorModal} />
    </>
  );
};

export { AppLayout };
