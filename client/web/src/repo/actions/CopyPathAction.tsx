import classNames from 'classnames'
import copy from 'copy-to-clipboard'
import ContentCopyIcon from 'mdi-react/ContentCopyIcon'
import React, { useState, useLayoutEffect } from 'react'
import { useLocation } from 'react-router'

import { Tooltip } from '@sourcegraph/branded/src/components/tooltip/Tooltip'
import { useRedesignToggle } from '@sourcegraph/shared/src/util/useRedesignToggle'

import { eventLogger } from '../../tracking/eventLogger'

import styles from './CopyPathAction.module.scss'

/**
 * A repository header action that copies the current page's URL to the clipboard.
 */
export const CopyPathAction: React.FunctionComponent = () => {
    const [isRedesignEnabled] = useRedesignToggle()
    const location = useLocation()
    const [copied, setCopied] = useState(false)

    useLayoutEffect(() => {
        Tooltip.forceUpdate()
    }, [copied])

    const onClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault()
        eventLogger.log('CopyFilePath')
        console.log(`Input: ${location.pathname}`)
        // strip prefixes for URL paths matching `/-/blob/` (filepaths), `/-/tree/` (directory paths), and leading `/` (repository paths).
        const path = location.pathname.replace(/(^.*?\/-\/(blob|tree)\/)|(^\/)/, '')
        copy(path)

        setCopied(true)

        setTimeout(() => {
            setCopied(false)
        }, 1000)
    }

    return (
        <button
            type="button"
            className={classNames('btn btn-icon', isRedesignEnabled && 'btn-sm p-2', !isRedesignEnabled && 'my-2')}
            data-tooltip={copied ? 'Copied!' : 'Copy path to clipboard'}
            aria-label="Copy path"
            onClick={onClick}
        >
            <ContentCopyIcon className={classNames('icon-inline', styles.copyIcon)} />
        </button>
    )
}
