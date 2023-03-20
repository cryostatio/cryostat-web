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
import { CardConfig } from '@app/Shared/Redux/Configurations/DashboardConfigSlice';
import { dashboardConfigAddCardIntent, StateDispatch } from '@app/Shared/Redux/ReduxStore';
import { ServiceContext } from '@app/Shared/Services/Services';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import {
  Bullseye,
  Button,
  Card,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  Form,
  FormGroup,
  NumberInput,
  Select,
  SelectOption,
  SelectOptionObject,
  Switch,
  Text,
  TextArea,
  TextInput,
  Title,
} from '@patternfly/react-core';
import {
  CustomWizardNavFunction,
  Wizard,
  WizardControlStep,
  WizardNav,
  WizardNavItem,
  WizardStep,
} from '@patternfly/react-core/dist/js/next';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { nanoid } from 'nanoid';
import * as React from 'react';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Observable, of } from 'rxjs';
import { getConfigByTitle, getDashboardCards, PropControl } from './Dashboard';

interface AddCardProps {}

export const AddCard: React.FC<AddCardProps> = (_) => {
  const addSubscription = useSubscriptions();
  const settingsContext = useContext(ServiceContext);
  const dispatch = useDispatch<StateDispatch>();
  const { t } = useTranslation();

  const [showWizard, setShowWizard] = React.useState(false);
  const [selection, setSelection] = React.useState('');
  const [propsConfig, setPropsConfig] = React.useState({});
  const [selectOpen, setSelectOpen] = React.useState(false);
  const [featureLevel, setFeatureLevel] = React.useState(FeatureLevel.PRODUCTION);

  React.useEffect(() => {
    addSubscription(settingsContext.settings.featureLevel().subscribe(setFeatureLevel));
  }, [addSubscription, settingsContext.settings, setFeatureLevel]);

  const options = React.useMemo(() => {
    return [
      <SelectOption key={0} value={t('NONE', { ns: 'common' })} isPlaceholder />,
      ...getDashboardCards(featureLevel).map((choice, idx) => (
        <SelectOption key={idx + 1} value={t(choice.title)} description={t(choice.description)} />
      )),
    ];
  }, [t, featureLevel]);

  const handleSelect = React.useCallback(
    (_, selection, isPlaceholder) => {
      setSelection(isPlaceholder ? '' : selection);
      setSelectOpen(false);

      const c = {};
      if (selection) {
        for (const ctrl of getConfigByTitle(selection, t).propControls) {
          c[ctrl.key] = ctrl.defaultValue;
        }
      }
      setPropsConfig(c);
    },
    [t, setSelection, setSelectOpen, setPropsConfig]
  );

  const handleAdd = React.useCallback(() => {
    setShowWizard(false);
    const config = getConfigByTitle(selection, t);
    const cardConfig: CardConfig = {
      id: `${config.component.name}-${nanoid()}`,
      name: config.component.name,
      span: config.cardSizes.span.default,
      props: propsConfig,
    };
    dispatch(dashboardConfigAddCardIntent(cardConfig.id, cardConfig.name, cardConfig.span, cardConfig.props));
  }, [dispatch, t, setShowWizard, selection, propsConfig]);

  const handleStart = React.useCallback(() => {
    setShowWizard(true);
  }, [setShowWizard]);

  const handleStop = React.useCallback(() => {
    setShowWizard(false);
    setSelection('');
    setPropsConfig({});
  }, [setSelection, setShowWizard, setPropsConfig]);

  // custom nav for disabling subsequent steps (ex. configuration) if a card type hasn't been selected first
  const customNav: CustomWizardNavFunction = React.useCallback(
    (
      isExpanded: boolean,
      steps: WizardControlStep[],
      activeStep: WizardControlStep,
      goToStepByIndex: (index: number) => void
    ) => {
      return (
        <WizardNav isExpanded={isExpanded}>
          {steps
            .filter((step) => !step.isHidden)
            .map((step, idx) => (
              <WizardNavItem
                key={step.id}
                id={step.id}
                content={step.name}
                isCurrent={activeStep.id === step.id}
                isDisabled={step.isDisabled || (idx > 0 && !selection)}
                stepIndex={step.index}
                onNavItemClick={goToStepByIndex}
              />
            ))}
        </WizardNav>
      );
    },
    [selection]
  );

  const getFullDescription = React.useCallback(
    (selection: string) => {
      const config = getConfigByTitle(selection, t).descriptionFull;
      if (typeof config === 'string') {
        return t(config);
      } else {
        return config;
      }
    },
    [t]
  );

  return (
    <>
      <Card isRounded isLarge>
        {showWizard ? (
          <Wizard onClose={handleStop} onSave={handleAdd} height={'30rem'} nav={customNav}>
            <WizardStep
              id="card-type-select"
              name={t('CARD_TYPE', { ns: 'common' })}
              footer={{
                isNextDisabled: !selection,
                nextButtonText:
                  selection &&
                  !getConfigByTitle(selection, t).propControls.length &&
                  !getConfigByTitle(selection, t).advancedConfig
                    ? 'Finish'
                    : 'Next',
              }}
            >
              <Form>
                <FormGroup label="Select a card type" isRequired isStack>
                  <Select onToggle={setSelectOpen} isOpen={selectOpen} onSelect={handleSelect} selections={selection}>
                    {options}
                  </Select>
                  <Text>
                    {selection
                      ? getFullDescription(selection)
                      : 'Choose a card type to add to your dashboard. Some cards require additional configuration.'}
                  </Text>
                </FormGroup>
              </Form>
            </WizardStep>
            <WizardStep
              id="card-props-config"
              name="Configuration"
              footer={{
                nextButtonText: selection && !getConfigByTitle(selection, t).advancedConfig ? 'Finish' : 'Next',
              }}
              isHidden={!selection || !getConfigByTitle(selection, t).propControls.length}
            >
              {selection && (
                <PropsConfigForm
                  cardTitle={selection}
                  config={propsConfig}
                  controls={getConfigByTitle(selection, t).propControls}
                  onChange={setPropsConfig}
                />
              )}
            </WizardStep>
            <WizardStep
              id="card-adv-config"
              name="Advanced Configuration"
              footer={{ nextButtonText: 'Finish' }}
              isHidden={!selection || !getConfigByTitle(selection, t).advancedConfig}
            >
              <Title headingLevel="h5">Provide advanced configuration for the {selection} card</Title>
              {selection && getConfigByTitle(selection, t).advancedConfig}
            </WizardStep>
          </Wizard>
        ) : (
          <Bullseye>
            <EmptyState variant={EmptyStateVariant.large}>
              <EmptyStateIcon icon={PlusCircleIcon} />
              <Title headingLevel="h2" size="md">
                Add a new card
              </Title>
              <EmptyStateBody>
                Cards added to this Dashboard layout present information at a glance about the selected target. The
                layout is preserved for all targets viewed on this client.
              </EmptyStateBody>
              <Button variant="primary" onClick={handleStart}>
                Add
              </Button>
            </EmptyState>
          </Bullseye>
        )}
      </Card>
    </>
  );
};

interface PropsConfigFormProps {
  cardTitle: string;
  controls: PropControl[];
  config: object;
  onChange: (config: object) => void;
}

const PropsConfigForm = ({ onChange, ...props }: PropsConfigFormProps) => {
  const { t } = useTranslation();
  const handleChange = React.useCallback(
    (k) => (e) => {
      const copy = { ...props.config };
      copy[k] = e;
      onChange(copy);
    },
    [onChange, props.config]
  );

  const handleNumeric = React.useCallback(
    (k) => (e) => {
      const value = (e.target as HTMLInputElement).value;
      const copy = { ...props.config };
      copy[k] = value;
      onChange(copy);
    },
    [onChange, props.config]
  );

  const handleNumericStep = React.useCallback(
    (k, v) => (_) => {
      const copy = { ...props.config };
      copy[k] = props.config[k] + v;
      onChange(copy);
    },
    [onChange, props.config]
  );

  const createControl = React.useCallback(
    (ctrl: PropControl): JSX.Element => {
      let input: JSX.Element;
      switch (ctrl.kind) {
        case 'boolean':
          input = (
            <Switch label="On" labelOff="Off" isChecked={props.config[ctrl.key]} onChange={handleChange(ctrl.key)} />
          );
          break;
        case 'number':
          input = (
            <NumberInput
              inputName={t(ctrl.name)}
              inputAriaLabel={`${t(ctrl.name)} input`}
              value={props.config[ctrl.key]}
              onChange={handleNumeric(ctrl.key)}
              onPlus={handleNumericStep(ctrl.key, 1)}
              onMinus={handleNumericStep(ctrl.key, -1)}
              min={ctrl.extras?.min}
              max={ctrl.extras?.max}
            />
          );
          break;
        case 'string':
          input = (
            <TextInput
              type="text"
              aria-label={`${ctrl.key} input`}
              value={props.config[ctrl.key]}
              onChange={handleChange(ctrl.key)}
            />
          );
          break;
        case 'text':
          input = (
            <TextArea
              type="text"
              aria-label={`${ctrl.key} input`}
              value={props.config[ctrl.key]}
              onChange={handleChange(ctrl.key)}
            />
          );
          break;
        case 'select':
          input = (
            <SelectControl
              handleChange={handleChange(ctrl.key)}
              selectedConfig={props.config[ctrl.key]}
              control={ctrl}
            />
          );
          break;
        default:
          input = <Text>Bad config</Text>;
          break;
      }
      return (
        <FormGroup key={`${ctrl.key}}`} label={t(ctrl.name)} helperText={t(ctrl.description)} isInline isStack>
          {input}
        </FormGroup>
      );
    },
    [t, props.config, handleChange, handleNumeric, handleNumericStep]
  );

  return (
    <>
      {props.controls.length > 0 ? (
        <Form>
          <Title headingLevel={'h5'}>Configure the {props.cardTitle} card</Title>
          {props.controls.map((ctrl) => createControl(ctrl))}
        </Form>
      ) : (
        <Text>No configuration required.</Text>
      )}
    </>
  );
};

interface SelectControlProps {
  handleChange: (selection: string) => void;
  control: PropControl;
  selectedConfig: string | SelectOptionObject;
}

const SelectControl = ({ handleChange, control, selectedConfig }: SelectControlProps) => {
  const addSubscription = useSubscriptions();

  const [selectOpen, setSelectOpen] = React.useState(false);
  const [options, setOptions] = React.useState([] as string[]);
  const [errored, setErrored] = React.useState(false);

  const handleSelect = React.useCallback(
    (_, selection, isPlaceholder) => {
      if (!isPlaceholder) {
        handleChange(selection);
      }
      setSelectOpen(false);
    },
    [handleChange, setSelectOpen]
  );

  React.useEffect(() => {
    let obs;
    if (control.values instanceof Observable) {
      obs = control.values;
    } else {
      obs = of(control.values);
    }
    addSubscription(
      obs.subscribe({
        next: (v) => {
          setErrored(false);
          setOptions((old) => {
            if (Array.isArray(v)) {
              return v;
            }
            return [...old, v];
          });
        },
        error: (err) => {
          setErrored(true);
          setOptions([err]);
        },
      })
    );
  }, [addSubscription, setOptions, setErrored, control, control.values]);

  return (
    <Select onToggle={setSelectOpen} isOpen={selectOpen} onSelect={handleSelect} selections={selectedConfig}>
      {errored
        ? [<SelectOption key={0} value={`Load Error: ${options[0]}`} isPlaceholder isDisabled />]
        : [<SelectOption key={0} value={'None'} isPlaceholder />].concat(
            options.map((choice, idx) => <SelectOption key={idx + 1} value={choice} />)
          )}
    </Select>
  );
};
