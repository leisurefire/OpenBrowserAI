import { useTranslation } from '../../_locales/react-i18next-shim.mjs'
import PropTypes from 'prop-types'
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs'
import { ApiModes } from './ApiModes'
import { SelectionTools } from './SelectionTools'
import { SiteAdapters } from './SiteAdapters'

ModulesPart.propTypes = {
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
}

export function ModulesPart({ config, updateConfig }) {
  const { t } = useTranslation()

  return (
    <>
      <Tabs selectedTabClassName="popup-tab--selected">
        <TabList>
          <Tab className="popup-tab">{t('API Modes')}</Tab>
          <Tab className="popup-tab">{t('Selection Tools')}</Tab>
          <Tab className="popup-tab">{t('Sites')}</Tab>
        </TabList>

        <TabPanel>
          <ApiModes config={config} updateConfig={updateConfig} />
        </TabPanel>
        <TabPanel>
          <SelectionTools config={config} updateConfig={updateConfig} />
        </TabPanel>
        <TabPanel>
          <SiteAdapters config={config} updateConfig={updateConfig} />
        </TabPanel>
      </Tabs>
    </>
  )
}
