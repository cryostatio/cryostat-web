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
import { ServiceContext } from '@app/Shared/Services/Services';
import { NotificationCenter } from '@app/Notifications/NotificationCenter';
import { IAppRoute, routes } from '@app/routes';
import { AboutModal, Button, Nav, NavItem, NavList, Page, PageHeader,
  PageHeaderTools, PageHeaderToolsGroup, PageHeaderToolsItem, PageSidebar,
  SkipToContent, Text, TextContent, TextList, TextListItem } from '@patternfly/react-core';
import { CogIcon, HelpIcon } from '@patternfly/react-icons';
import { NavLink, matchPath, useHistory, useLocation } from 'react-router-dom';
import { AuthModal } from './AuthModal';
import { SslErrorModal} from './SslErrorModal';

interface IAppLayout {
  children: React.ReactNode;
}

const AppLayout: React.FunctionComponent<IAppLayout> = ({children}) => {
  const context = React.useContext(ServiceContext);
  const routerHistory = useHistory();
  const logoProps = {
    href: '/',
    target: '_blank'
  };
  const [isNavOpen, setIsNavOpen] = React.useState(true);
  const [isMobileView, setIsMobileView] = React.useState(true);
  const [isNavOpenMobile, setIsNavOpenMobile] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showSslErrorModal, setShowSslErrorModal] = React.useState(false);
  const [aboutModalOpen, setAboutModalOpen] = React.useState(false);
  const [cryostatVersion, setCryostatVersion] = React.useState('unknown');
  const location = useLocation();

  React.useEffect(() => {
    const sub = context.target.authFailure().subscribe(() => {
      setShowAuthModal(true);
    });
    return () => sub.unsubscribe();
  }, [context.target]);

  React.useEffect(() => {
    const sub = context.api.cryostatVersion().subscribe(setCryostatVersion);
    return () => sub.unsubscribe();
  })

  const dismissAuthModal = () => {
    setShowAuthModal(false);
  };

  React.useEffect(() => {
    const sub = context.target.sslFailure().subscribe(() => {
      setShowSslErrorModal(true);
    });
    return () => sub.unsubscribe();
  }, [context.target]);

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
  const handleAboutModalToggle = () => {
    setAboutModalOpen(!aboutModalOpen);
  };
  const HeaderTools = (<>
    <PageHeaderTools>
      <PageHeaderToolsGroup>
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
      </PageHeaderToolsGroup>
    </PageHeaderTools>
  </>);
  const Header = (<>
    <PageHeader
      logo="Cryostat"
      logoProps={logoProps}
      showNavToggle
      isNavOpen={isNavOpen}
      onNavToggle={isMobileView ? onNavToggleMobile : onNavToggle}
      headerTools={HeaderTools}
    />
    <AboutModal
      isOpen={aboutModalOpen}
      onClose={handleAboutModalToggle}
      trademark='Copyright The Cryostat Authors, The Universal Permissive License (UPL), Version 1.0'
      brandImageSrc='' // TODO
      brandImageAlt='Cryostat Logo'
      productName='Cryostat'
    >
      <TextContent>
        <TextList component="dl">
          <TextListItem component="dt">
            Version
          </TextListItem>
          <TextListItem component="dd">
            <Text>{cryostatVersion}</Text>
          </TextListItem>
          <TextListItem component="dt">
            Homepage
          </TextListItem>
          <TextListItem component="dd">
            <a href='https://cryostat.io'>cryostat.io</a>
          </TextListItem>
          <TextListItem component="dt">
            Bug Reports
          </TextListItem>
          <TextListItem component="dd">
            <a href='https://github.com/cryostatio/cryostat/issues'>GitHub</a>
          </TextListItem>
          <TextListItem component="dt">
            Mailing List
          </TextListItem>
          <TextListItem component="dd">
            <a href='https://groups.google.com/g/cryostat-development'>Google Groups</a>
          </TextListItem>
          <TextListItem component="dt">
            Open Source License
          </TextListItem>
          <TextListItem component="dd">
            <a href='https://github.com/cryostatio/cryostat/blob/main/LICENSE'>License</a>
          </TextListItem>
        </TextList>
      </TextContent>
    </AboutModal>
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
        {routes.map((route, idx) => route.label && (
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
    <AuthModal visible={showAuthModal} onDismiss={dismissAuthModal} onSave={dismissAuthModal}/>
    <SslErrorModal visible={showSslErrorModal} onDismiss={dismissSslErrorModal}/>
    <NotificationCenter />
  </>);
}

export { AppLayout };

