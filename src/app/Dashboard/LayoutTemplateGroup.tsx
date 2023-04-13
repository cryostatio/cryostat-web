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
import { FeatureFlag } from '@app/Shared/FeatureFlag/FeatureFlag';
import { dashboardConfigTemplateHistoryClearIntent } from '@app/Shared/Redux/ReduxStore';
import { ServiceContext } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { portalRoot } from '@app/utils/utils';
import { CatalogTile } from '@patternfly/react-catalog-view-extension';
import {
  Button,
  Dropdown,
  DropdownItem,
  Gallery,
  KebabToggle,
  Label,
  Split,
  SplitItem,
  Title,
} from '@patternfly/react-core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { getConfigByName } from './Dashboard';
import {
  CardConfig,
  iconify,
  LayoutTemplate,
  LayoutTemplateContext,
  LayoutTemplateVendor,
  SerialCardConfig,
} from './dashboard-utils';

export interface LayoutTemplateGroupProps {
  title: string;
  templates: LayoutTemplate[];
  onTemplateSelect: (templateName: LayoutTemplate) => void;
  onTemplateDelete: (templateName: string) => void;
}

export const smallestFeatureLevel = (cards: SerialCardConfig[]): FeatureLevel => {
  return cards.reduce((minFeatureLevel: FeatureLevel, card: CardConfig) => {
    const featureLevel = getConfigByName(card.name).featureLevel;
    return featureLevel < minFeatureLevel ? featureLevel : minFeatureLevel;
  }, FeatureLevel.PRODUCTION);
};

export const LayoutTemplateGroup: React.FC<LayoutTemplateGroupProps> = ({
  onTemplateSelect,
  onTemplateDelete,
  ...props
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { selectedTemplate, setSelectedTemplate } = React.useContext(LayoutTemplateContext);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleTemplateSelect = React.useCallback(
    (template: LayoutTemplate) => {
      setSelectedTemplate(template);
      onTemplateSelect(template);
    },
    [setSelectedTemplate, onTemplateSelect]
  );

  const handleClearRecent = React.useCallback(() => {
    dispatch(dashboardConfigTemplateHistoryClearIntent());
  }, [dispatch]);

  return (
    <>
      <Split>
        <SplitItem>
          <Title headingLevel="h2" size="lg" style={{ padding: '1em' }}>
            {props.title} ({props.templates.length})
          </Title>
        </SplitItem>
        {props.title === t('SUGGESTED', { ns: 'common' }) && props.templates.length !== 1 && (
          <>
            <SplitItem isFilled></SplitItem>
            <SplitItem>
              <Button variant="link" onClick={handleClearRecent}>
                {t('CLEAR_RECENT', { ns: 'common' })}
              </Button>
            </SplitItem>
          </>
        )}
      </Split>
      <Gallery hasGutter className="layout-template-picker">
        {props.templates.map((template) => {
          const level = smallestFeatureLevel(template.cards);
          return (
            <FeatureFlag key={template.name} level={level}>
              <div
                ref={scrollRef}
                className={
                  selectedTemplate?.name === template.name && selectedTemplate.vendor == template.vendor
                    ? 'layout-template-card__featured'
                    : undefined
                }
              >
                <CatalogTile
                  featured={selectedTemplate?.name === template.name && selectedTemplate.vendor == template.vendor}
                  id={template.name}
                  key={template.name}
                  icon={iconify(template.vendor)}
                  title={template.name}
                  vendor={template.vendor}
                  onClick={() => handleTemplateSelect(template)}
                  badges={[
                    level !== FeatureLevel.PRODUCTION && (
                      <FeatureFlag key={template.name + '-feature-flag'} level={level}>
                        <Label
                          isCompact
                          style={{
                            marginLeft: '2ch',
                            textTransform: 'capitalize',
                            paddingTop: '0.125ch',
                            paddingBottom: '0.125ch',
                          }}
                          color={level === FeatureLevel.BETA ? 'green' : 'red'}
                        >
                          {FeatureLevel[level].toLowerCase()}
                        </Label>
                      </FeatureFlag>
                    ),
                    <KebabCatalogTileBadge
                      template={template}
                      onTemplateDelete={onTemplateDelete}
                      key={template.name + '-kebab'}
                    />,
                  ]}
                >
                  {template.description}
                </CatalogTile>
              </div>
            </FeatureFlag>
          );
        })}
      </Gallery>
    </>
  );
};

export interface KebabCatalogTileBadgeProps {
  template: LayoutTemplate;
  onTemplateDelete: (templateName: string) => void;
}

export const KebabCatalogTileBadge: React.FC<KebabCatalogTileBadgeProps> = ({ template, onTemplateDelete }) => {
  const serviceContext = React.useContext(ServiceContext);
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  const onSelect = React.useCallback(
    (_ev) => {
      setIsOpen(false);
    },
    [setIsOpen]
  );

  const openKebab = React.useCallback(
    (value, e) => {
      e.stopPropagation();
      setIsOpen(value);
    },
    [setIsOpen]
  );

  const handleTemplateDownload = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      serviceContext.api.downloadLayoutTemplate(template);
    },
    [serviceContext.api, template]
  );

  const handleTemplateDelete = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onTemplateDelete(template.name);
    },
    [onTemplateDelete, template.name]
  );

  const dropdownItems = React.useMemo(() => {
    return [
      <DropdownItem key={'download'} onClick={handleTemplateDownload}>
        {t('DOWNLOAD', { ns: 'common' })}
      </DropdownItem>,
      <DropdownItem key={'delete'} onClick={handleTemplateDelete}>
        {t('DELETE', { ns: 'common' })}
      </DropdownItem>,
    ];
  }, [t, handleTemplateDownload, handleTemplateDelete]);

  return (
    <Dropdown
      menuAppendTo={portalRoot}
      onSelect={onSelect}
      toggle={<KebabToggle isDisabled={template.vendor !== LayoutTemplateVendor.USER} onToggle={openKebab} />}
      isOpen={isOpen}
      isPlain
      dropdownItems={dropdownItems}
    />
  );
};
