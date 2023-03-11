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
import { NotificationsContext } from '@app/Notifications/Notifications';
import { CreateJmxCredentialModal } from '@app/SecurityPanel/Credentials/CreateJmxCredentialModal';
import { ServiceContext } from '@app/Shared/Services/Services';
import { useSubscriptions } from '@app/utils/useSubscriptions';
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
  onClick?: (targetNode: TargetNode, actionUtils: ActionUtils, track: ReturnType<typeof useSubscriptions>) => void;
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
  const addSubscription = useSubscriptions();

  const handleClick = React.useCallback(() => {
    onClick && onClick(targetNode, { history, services, notifications }, addSubscription);
  }, [onClick, targetNode, history, services, notifications, addSubscription]);

  return (
    <Button {...props} onClick={handleClick}>
      {children}
    </Button>
  );
};

export type ModalComponent = typeof CreateJmxCredentialModal;

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
      <CreateJmxCredentialModal
        visible={showAuthModal}
        onDismiss={handleAuthModalClose}
        onPropsSave={handleAuthModalClose}
        {...props}
      />
      <div onClick={handleAuthModalOpen}>{children}</div>
    </>
  );
};
