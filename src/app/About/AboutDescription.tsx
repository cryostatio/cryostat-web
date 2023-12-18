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

import build from '@app/build.json';
import { NotificationsContext } from '@app/Shared/Services/Notifications.service';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Text, TextContent, TextList, TextListItem, TextVariants } from '@patternfly/react-core';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

export const AboutDescription: React.FC = () => {
  const serviceContext = React.useContext(ServiceContext);
  const notificationsContext = React.useContext(NotificationsContext);
  const [cryostatVersion, setCryostatVersion] = React.useState(undefined as string | undefined);
  const { t } = useTranslation();

  React.useEffect(() => {
    const sub = serviceContext.api.cryostatVersion().subscribe(setCryostatVersion);
    return () => sub.unsubscribe();
  }, [serviceContext]);

  const cryostatCommitHash = React.useMemo(() => {
    if (!cryostatVersion) {
      return;
    }
    const expr = /^(?<tag>v[0-9]+\.[0-9]+\.[0-9]+)(?:-snapshot)?$/;
    const result = cryostatVersion.match(expr);
    if (!result) {
      notificationsContext.warning(
        'Cryostat Version Parse Failure',
        `Could not parse Cryostat version string '${cryostatVersion}'.`,
      );
      return;
    }
    return result.groups?.tag;
  }, [cryostatVersion, notificationsContext]);

  const versionComponent = React.useMemo(() => {
    if (build.releaseTagUrl) {
      return (
        <Text
          component={TextVariants.a}
          target="_blank"
          href={
            cryostatCommitHash
              ? build.releaseTagUrl.replace('__REPLACE_HASH__', cryostatCommitHash)
              : build.developmentUrl
          }
        >
          {cryostatVersion}
        </Text>
      );
    } else {
      return <Text component={TextVariants.p}>{cryostatVersion}</Text>;
    }
  }, [cryostatVersion, cryostatCommitHash]);

  return (
    <>
      <TextContent>
        <TextList component="dl">
          <TextListItem component="dt">{t('AboutDescription.VERSION')}</TextListItem>
          <TextListItem component="dd">{versionComponent}</TextListItem>
          <TextListItem component="dt">{t('AboutDescription.HOMEPAGE')}</TextListItem>
          <TextListItem component="dd">
            <Text component={TextVariants.a} target="_blank" href={build.homePageUrl}>
              cryostat.io
            </Text>
          </TextListItem>
          <TextListItem component="dt">{t('AboutDescription.BUGS')}</TextListItem>
          <TextListItem component="dd">
            <Text>
              <Text component={TextVariants.a} target="_blank" href={build.knownIssuesUrl}>
                {t('AboutDescription.KNOWN_ISSUES')}
              </Text>
              &nbsp;|&nbsp;
              <Text
                component={TextVariants.a}
                target="_blank"
                href={build.fileIssueUrl.replace('__REPLACE_VERSION__', cryostatVersion || 'unknown')}
              >
                {t('AboutDescription.FILE_A_REPORT')}
              </Text>
            </Text>
          </TextListItem>
          <TextListItem component="dt">{t('AboutDescription.MAILING_LIST')}</TextListItem>
          <TextListItem component="dd">
            <Text component={TextVariants.a} target="_blank" href={build.mailingListUrl}>
              {build.mailingListName}
            </Text>
          </TextListItem>
          <TextListItem component="dt">{t('AboutDescription.OPEN_SOURCE_LICENSE')}</TextListItem>
          <TextListItem component="dd">
            <Text component={TextVariants.a} target="_blank" href={build.licenseUrl}>
              {t('AboutDescription.LICENSE')}
            </Text>
          </TextListItem>
        </TextList>
      </TextContent>
    </>
  );
};
