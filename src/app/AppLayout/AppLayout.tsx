import * as React from 'react';
import { NavLink, useRouteMatch } from 'react-router-dom';
import {
  Nav,
  NavList,
  NavItem,
  NavVariants,
  Page,
  PageHeader,
  PageSidebar,
  SkipToContent
} from '@patternfly/react-core';
import { IAppRoute, staticRoutes, getAvailableRoutes } from '@app/routes';
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationCenter } from '@app/Notifications/NotificationCenter';

interface IAppLayout {
  children: React.ReactNode;
}

const AppLayout: React.FunctionComponent<IAppLayout> = ({children}) => {
  const context = React.useContext(ServiceContext);
  const logoProps = {
    href: '/',
    target: '_blank'
  };
  const [isNavOpen, setIsNavOpen] = React.useState(true);
  const [isMobileView, setIsMobileView] = React.useState(true);
  const [isNavOpenMobile, setIsNavOpenMobile] = React.useState(false);
  const [availableRoutes, setAvailableRoutes] = React.useState(staticRoutes);

  React.useEffect(() => {
    const sub = context.commandChannel.isConnected().subscribe(isConnected => setAvailableRoutes(getAvailableRoutes(isConnected)));
    return () => sub.unsubscribe();
  }, []);

  const onNavToggleMobile = () => {
    setIsNavOpenMobile(!isNavOpenMobile);
  };
  const onNavToggle = () => {
    setIsNavOpen(!isNavOpen);
  }
  const onPageResize = (props: { mobileView: boolean; windowSize: number }) => {
    setIsMobileView(props.mobileView);
  };
  const Header = (
    <PageHeader
      logo="ContainerJFR"
      logoProps={logoProps}
      showNavToggle
      isNavOpen={isNavOpen}
      onNavToggle={isMobileView ? onNavToggleMobile : onNavToggle}
    />
  );

  const isActiveRoute = (route: IAppRoute): boolean => {
    const match = useRouteMatch(route);
    if (!!match && match.isExact) {
      return true;
    } else if (!!route.children) {
      let childMatch = false;
      for (const r of route.children) {
        childMatch = childMatch || isActiveRoute(r);
      }
      return childMatch;
    }
    return false;
  };

  const Navigation = (
    <Nav id="nav-primary-simple" theme="dark">
      <NavList id="nav-list-simple" variant={NavVariants.default}>
        {availableRoutes.map((route, idx) => route.label && (
            <NavItem key={`${route.label}-${idx}`} id={`${route.label}-${idx}`} isActive={isActiveRoute(route)}>
              <NavLink exact to={route.path} activeClassName="pf-m-current">{route.label}</NavLink>
            </NavItem>
          ))}
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
  return (<>
    <Page
      mainContainerId="primary-app-container"
      header={Header}
      sidebar={Sidebar}
      onPageResize={onPageResize}
      skipToContent={PageSkipToContent}>
      {children}
    </Page>
    <NotificationCenter />
  </>);
}

export { AppLayout };
