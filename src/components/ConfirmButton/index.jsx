import { useTranslation } from '../../_locales/react-i18next-shim.mjs'
import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'

ConfirmButton.propTypes = {
  onConfirm: PropTypes.func.isRequired,
  text: PropTypes.string.isRequired,
}

function ConfirmButton({ onConfirm, text }) {
  const { t } = useTranslation()
  const [waitConfirm, setWaitConfirm] = useState(false)
  const confirmRef = useRef(null)

  useEffect(() => {
    if (waitConfirm && confirmRef.current) confirmRef.current.focus()
  }, [waitConfirm])

  return (
    <span>
      <button
        ref={confirmRef}
        type="button"
        className="normal-button"
        style={{
          ...(waitConfirm ? {} : { display: 'none' }),
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onBlur={() => {
          setWaitConfirm(false)
        }}
        onClick={() => {
          setWaitConfirm(false)
          onConfirm()
        }}
      >
        {t('Confirm')}
      </button>
      <button
        type="button"
        className="normal-button"
        style={{
          ...(waitConfirm ? { display: 'none' } : {}),
        }}
        onClick={() => {
          setWaitConfirm(true)
        }}
      >
        {text}
      </button>
    </span>
  )
}

export default ConfirmButton
