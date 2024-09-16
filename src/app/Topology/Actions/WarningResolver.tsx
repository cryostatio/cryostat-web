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
import { CreateCredentialModal } from '@app/SecurityPanel/Credentials/CreateCredentialModal';
import { TargetNode } from '@app/Shared/Services/api.types';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Button, ButtonProps } from '@patternfly/react-core';
import * as React from 'react';
import { Link, LinkProps, useNavigate } from 'react-router-dom';
import { ActionUtils } from './types';

export interface WarningResolverAsLinkProps extends LinkProps {}

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
  const navigate = useNavigate();
  const services = React.useContext(ServiceContext);
  const notifications = React.useContext(NotificationsContext);

  const handleClick = React.useCallback(() => {
    onClick && onClick(targetNode, { navigate, services, notifications });
  }, [onClick, targetNode, navigate, services, notifications]);

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
      <span onClick={handleAuthModalOpen}>{children}</span>
    </>
  );
};
