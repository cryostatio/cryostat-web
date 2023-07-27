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
import { NotificationsContext } from '@app/Notifications/Notifications';
import { CreateCredentialModal } from '@app/SecurityPanel/Credentials/CreateCredentialModal';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Button, ButtonProps } from '@patternfly/react-core';
import * as React from 'react';
import { Link, useHistory } from 'react-router-dom';
import { TargetNode } from '../typings';
import { ActionUtils } from './utils';

export interface WarningResolverAsLinkProps extends React.ComponentProps<Link> {}

export const WarningResolverAsLink: React.FC<WarningResolverAsLinkProps> = ({ to, children, ...props }) => {
  return (
    <Link to={to} {...props}>
      {children}
    </Link>
  );
};

export interface WarningResolverAsActionButtonProps extends Omit<ButtonProps, 'onClick'> {
  targetNode: TargetNode;
  onClick?: (targetNode: TargetNode, actionUtils: ActionUtils) => void;
}

export const WarningResolverAsActionButton: React.FC<WarningResolverAsActionButtonProps> = ({
  targetNode,
  onClick,
  children,
  ...props
}) => {
  const history = useHistory();
  const services = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);

  const handleClick = React.useCallback(() => {
    onClick && onClick(targetNode, { history, services, notifications });
  }, [onClick, targetNode, history, services, notifications]);

  return (
    <Button {...props} onClick={handleClick}>
      {children}
    </Button>
  );
};

export interface WarningResolverAsCredModalProps {
  children?: React.ReactNode;
}

export const WarningResolverAsCredModal: React.FC<WarningResolverAsCredModalProps> = ({ children, ...props }) => {
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  const handleAuthModalClose = React.useCallback(() => {
    setShowAuthModal(false);
  }, [setShowAuthModal]);

  const handleAuthModalOpen = React.useCallback(() => {
    setShowAuthModal(true);
  }, [setShowAuthModal]);

  return (
    <>
      <CreateCredentialModal
        visible={showAuthModal}
        onDismiss={handleAuthModalClose}
        onPropsSave={handleAuthModalClose}
        {...props}
      />
      <div onClick={handleAuthModalOpen}>{children}</div>
    </>
  );
};
