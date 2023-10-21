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
import { AboutCryostatModal } from '@app/About/AboutCryostatModal';
import { AuthModal } from '@app/AppLayout/AuthModal';
import { NotificationCenter } from '@app/AppLayout/NotificationCenter';
import { SslErrorModal } from '@app/AppLayout/SslErrorModal';
import cryostatLogo from '@app/assets/cryostat_logo_hori_rgb_reverse.svg';
import build from '@app/build.json';
import CryostatJoyride from '@app/Joyride/CryostatJoyride';
import { useJoyride } from '@app/Joyride/JoyrideProvider';
import { GlobalQuickStartDrawer } from '@app/QuickStarts/QuickStartDrawer';
import { IAppRoute, navGroups, routes } from '@app/routes';
import { ThemeSetting, SettingTab } from '@app/Settings/types';
import { selectTab, tabAsParam } from '@app/Settings/utils';
import { DynamicFeatureFlag, FeatureFlag } from '@app/Shared/Components/FeatureFlag';
import { NotificationCategory, Notification } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useLogin } from '@app/utils/hooks/useLogin';
import { useSubscriptions } from '@app/utils/hooks/useSubscriptions';
import { useTheme } from '@app/utils/hooks/useTheme';
import { saveToLocalStorage } from '@app/utils/LocalStorage';
import { cleanDataId, isAssetNew, openTabForUrl, portalRoot } from '@app/utils/utils';
import {
  Alert,
  AlertActionCloseButton,
  AlertGroup,
  AlertVariant,
  ApplicationLauncher,
  ApplicationLauncherItem,
  Brand,
  Button,
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownToggle,
  Icon,
  Label,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  Nav,
  NavGroup,
  NavItem,
  NotificationBadge,
  Page,
  PageSidebar,
  PageToggleButton,
  SkipToContent,
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
import { useTranslation } from 'react-i18next';
import { Link, matchPath, NavLink, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom-v5-compat';
import { map } from 'rxjs/operators';

export interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const serviceContext = React.useContext(ServiceContext);
  const notificationsContext = React.useContext(NotificationsContext);
  const addSubscription = useSubscriptions();
  const { t } = useTranslation();
  const {
    setState: setJoyState,
    state: joyState,
    isNavBarOpen: joyNavOpen,
    setIsNavBarOpen: setJoyNavOpen,
  } = useJoyride();

  const [isNavOpen, setIsNavOpen] = [joyNavOpen, setJoyNavOpen];
  const [isMobileView, setIsMobileView] = React.useState(true);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showSslErrorModal, setShowSslErrorModal] = React.useState(false);
  const [aboutModalOpen, setAboutModalOpen] = React.useState(false);
  const [isNotificationDrawerExpanded, setNotificationDrawerExpanded] = React.useState(false);
  const showUserIcon = useLogin();
  const [showUserInfoDropdown, setShowUserInfoDropdown] = React.useState(false);
  const [showHelpDropdown, setShowHelpDropdown] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [notifications, setNotifications] = React.useState([] as Notification[]);
  const [visibleNotificationsCount, setVisibleNotificationsCount] = React.useState(5);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [errorNotificationsCount, setErrorNotificationsCount] = React.useState(0);
  const [activeLevel, setActiveLevel] = React.useState(FeatureLevel.PRODUCTION);
  const location = useLocation();
  const navigate = useNavigate();
  const [theme] = useTheme();

  React.useEffect(() => {
    if (theme === ThemeSetting.DARK) {
      document.documentElement.classList.add('pf-theme-dark');
    } else {
      document.documentElement.classList.remove('pf-theme-dark');
    }
  }, [theme]);

  React.useEffect(() => {
    addSubscription(
      serviceContext.target.authFailure().subscribe(() => {
        setShowAuthModal(true);
      }),
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

  React.useLayoutEffect(() => {
    addSubscription(serviceContext.settings.featureLevel().subscribe((featureLevel) => setActiveLevel(featureLevel)));
  }, [addSubscription, serviceContext.settings, setActiveLevel]);

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
            _.filter(notifications, (n) => n.variant === AlertVariant.danger || n.variant === AlertVariant.warning),
          ),
        )
        .subscribe((s) => setErrorNotificationsCount(s.length)),
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
    [notificationsContext],
  );

  const handleTimeout = React.useCallback((key) => () => notificationsContext.setHidden(key), [notificationsContext]);

  React.useEffect(() => {
    addSubscription(
      serviceContext.target.sslFailure().subscribe(() => {
        setShowSslErrorModal(true);
      }),
    );
  }, [serviceContext.target, serviceContext.target.sslFailure, setShowSslErrorModal, addSubscription]);

  const dismissSslErrorModal = React.useCallback(() => setShowSslErrorModal(false), [setShowSslErrorModal]);

  const onNavToggle = React.useCallback(() => {
    setIsNavOpen((isNavOpen) => {
      if (joyState.run === true && joyState.stepIndex === 1 && !isNavOpen) {
        setJoyState({ stepIndex: 2 });
      }
      return !isNavOpen;
    });
  }, [setIsNavOpen, joyState, setJoyState]);

  // prevent page resize to close nav during tour
  const onPageResize = React.useCallback(
    (props: { mobileView: boolean; windowSize: number }) => {
      if (joyState.run === false) {
        setIsMobileView(props.mobileView);
        setIsNavOpen(!props.mobileView);
      }
    },
    [joyState, setIsMobileView, setIsNavOpen],
  );

  const mobileOnSelect = React.useCallback(
    (_) => {
      if (isMobileView) {
        setIsNavOpen(false);
      }
    },
    [isMobileView, setIsNavOpen],
  );

  const handleNotificationCenterToggle = React.useCallback(() => {
    notificationsContext.setDrawerState(!isNotificationDrawerExpanded);
  }, [isNotificationDrawerExpanded, notificationsContext]);

  const handleCloseNotificationCenter = React.useCallback(() => {
    notificationsContext.setDrawerState(false);
  }, [notificationsContext]);

  const handleOpenNotificationCenter = React.useCallback(() => {
    notificationsContext.setDrawerState(true);
  }, [notificationsContext]);

  const handleLogout = React.useCallback(() => {
    addSubscription(serviceContext.login.setLoggedOut().subscribe());
  }, [serviceContext.login, addSubscription]);

  const handleLanguagePref = React.useCallback(() => {
    if (location.pathname === '/settings') {
      selectTab(SettingTab.GENERAL);
    } else {
      navigate(`/settings?${new URLSearchParams({ tab: tabAsParam(SettingTab.GENERAL) })}`);
    }
  }, [location, navigate]);

  const handleUserInfoToggle = React.useCallback(() => setShowUserInfoDropdown((v) => !v), [setShowUserInfoDropdown]);

  React.useEffect(() => {
    addSubscription(serviceContext.login.getUsername().subscribe(setUsername));
  }, [serviceContext, serviceContext.login, addSubscription, setUsername]);

  const userInfoItems = React.useMemo(
    () => [
      <FeatureFlag level={FeatureLevel.BETA} key={'language-preferences-feature-flag'}>
        <DropdownGroup key={'language-preferences'}>
          <DropdownItem onClick={handleLanguagePref}>Language preference</DropdownItem>
        </DropdownGroup>
      </FeatureFlag>,
      <DropdownGroup key={'log-out'}>
        <DropdownItem onClick={handleLogout}>Log out</DropdownItem>
      </DropdownGroup>,
    ],
    [handleLogout, handleLanguagePref],
  );

  const UserInfoToggle = React.useMemo(
    () => (
      <DropdownToggle onToggle={handleUserInfoToggle} toggleIndicator={CaretDownIcon}>
        {username || <UserIcon color="white" size="sm" />}
      </DropdownToggle>
    ),
    [username, handleUserInfoToggle],
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

  const handleOpenGuidedTour = React.useCallback(() => {
    setJoyState({ run: true });
  }, [setJoyState]);

  const helpItems = React.useMemo(() => {
    return [
      <ApplicationLauncherItem
        key={'Quickstarts'}
        component={<NavLink to="/quickstarts">{t('AppLayout.APP_LAUNCHER.QUICKSTARTS')}</NavLink>}
      />,
      <ApplicationLauncherItem key={'Documentation'} onClick={handleOpenDocumentation}>
        <span>{t('AppLayout.APP_LAUNCHER.DOCUMENTATION')}</span>
        <Icon isInline size="lg" iconSize="sm" style={{ marginLeft: 'auto', paddingLeft: '1ch' }}>
          <ExternalLinkAltIcon color="grey" />
        </Icon>
      </ApplicationLauncherItem>,
      <ApplicationLauncherItem key={'Guided tour'} onClick={handleOpenGuidedTour}>
        {t('AppLayout.APP_LAUNCHER.GUIDED_TOUR')}
      </ApplicationLauncherItem>,
      <ApplicationLauncherItem key={'Help'} onClick={handleOpenDiscussion}>
        {t('AppLayout.APP_LAUNCHER.HELP')}
        <Icon isInline size="lg" iconSize="sm" style={{ marginLeft: 'auto', paddingLeft: '1ch' }}>
          <ExternalLinkAltIcon color="grey" />
        </Icon>
      </ApplicationLauncherItem>,
      <ApplicationLauncherItem key={'About'} onClick={handleOpenAboutModal}>
        {t('AppLayout.APP_LAUNCHER.ABOUT')}
      </ApplicationLauncherItem>,
    ];
  }, [t, handleOpenDocumentation, handleOpenGuidedTour, handleOpenDiscussion, handleOpenAboutModal]);

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
                    variant="plain"
                    onClick={() => notificationsContext.info(`test ${+Date.now()}`)}
                    icon={<PlusCircleIcon size="sm" />}
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
                    variant="plain"
                    aria-label="Settings"
                    data-tour-id="settings-link"
                    data-quickstart-id="settings-link"
                    component={(props) => <Link {...props} to="/settings" />}
                  >
                    <CogIcon size="sm" />
                  </Button>
                </ToolbarItem>
                <ToolbarItem>
                  <ApplicationLauncher
                    onSelect={handleHelpToggle}
                    onToggle={handleHelpToggle}
                    isOpen={showHelpDropdown}
                    items={helpItems}
                    position="right"
                    toggleIcon={<QuestionCircleIcon />}
                    data-tour-id="application-launcher"
                    data-quickstart-id="application-launcher"
                  />
                </ToolbarItem>
              </ToolbarGroup>
              <ToolbarItem visibility={{ default: showUserIcon ? 'visible' : 'hidden' }}>
                <Dropdown
                  isPlain
                  onSelect={() => setShowUserInfoDropdown(false)}
                  isOpen={showUserInfoDropdown}
                  toggle={UserInfoToggle}
                  position="right"
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
      unreadNotificationsCount,
      errorNotificationsCount,
      handleNotificationCenterToggle,
      handleHelpToggle,
      setShowUserInfoDropdown,
      showUserIcon,
      showUserInfoDropdown,
      showHelpDropdown,
      UserInfoToggle,
      userInfoItems,
      helpItems,
    ],
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
              onNavToggle={onNavToggle}
              data-quickstart-id="nav-toggle-btn"
              data-tour-id="nav-toggle-btn"
            >
              <BarsIcon />
            </PageToggleButton>
          </MastheadToggle>
          <MastheadMain>
            <MastheadBrand component={'div'}>
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
    [isNavOpen, aboutModalOpen, HeaderToolbar, handleCloseAboutModal, onNavToggle, levelBadge],
  );

  const isActiveRoute = React.useCallback(
    (route: IAppRoute): boolean => {
      const match = matchPath(location.pathname, route.path);
      if (match) {
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
    [location],
  );

  const Navigation = React.useMemo(
    () => (
      <Nav id="nav-primary-simple" theme="dark" variant="default" onSelect={mobileOnSelect} aria-label="Global nav">
        {navGroups.map((title) => {
          return (
            <NavGroup title={title} key={title}>
              {routes
                .filter((route) => route.navGroup === title)
                .filter((r) => r.featureLevel === undefined || r.featureLevel >= activeLevel)
                .map((route, idx) => {
                  return (
                    route.label && (
                      <NavItem
                        key={`${route.label}-${idx}`}
                        id={`${route.label}-${idx}`}
                        isActive={isActiveRoute(route)}
                      >
                        <NavLink
                          exact
                          to={route.path}
                          activeClassName="pf-m-current"
                          data-quickstart-id={`nav-${cleanDataId(route.label)}-tab`}
                          data-tour-id={`${cleanDataId(route.label)}`}
                        >
                          {route.label}
                          {route.featureLevel !== undefined && levelBadge(route.featureLevel)}
                        </NavLink>
                      </NavItem>
                    )
                  );
                })}
            </NavGroup>
          );
        })}
      </Nav>
    ),
    [mobileOnSelect, isActiveRoute, levelBadge, activeLevel],
  );

  const Sidebar = React.useMemo(
    () => <PageSidebar theme="dark" nav={Navigation} isNavOpen={isNavOpen} />,
    [Navigation, isNavOpen],
  );

  const PageSkipToContent = React.useMemo(
    () => <SkipToContent href="#primary-app-container">Skip to Content</SkipToContent>,
    [],
  );

  const NotificationDrawer = React.useMemo(
    () => <NotificationCenter onClose={handleCloseNotificationCenter} />,
    [handleCloseNotificationCenter],
  );

  React.useEffect(() => {
    if (showUserIcon && isAssetNew(build.version)) {
      handleOpenGuidedTour();
      saveToLocalStorage('ASSET_VERSION', build.version);
    }
  }, [handleOpenGuidedTour, showUserIcon]);

  return (
    <GlobalQuickStartDrawer>
      <CryostatJoyride>
        <AlertGroup
          appendTo={portalRoot}
          isToast
          isLiveRegion
          overflowMessage={overflowMessage}
          onOverflowClick={handleOpenNotificationCenter}
        >
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
        <AuthModal
          visible={showAuthModal}
          onDismiss={dismissAuthModal}
          onSave={authModalOnSave}
          targetObs={serviceContext.target.target()}
        />
        <SslErrorModal visible={showSslErrorModal} onDismiss={dismissSslErrorModal} />
      </CryostatJoyride>
    </GlobalQuickStartDrawer>
  );
};
