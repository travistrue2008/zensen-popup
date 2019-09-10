import sinon from 'sinon'
import store from './utils/store'

import { fixture, html, expect } from '@open-wc/testing'

import { openPopup, popPopup } from '../src'
import { register, unregister, freeze } from '../src/redux'
import { POPUP_MESSAGE, RENDERER_POPUPS } from './utils/popup'
import { ID_BLOCKER } from '../src/popup-stack'

const KEY_MAIN = 'main'
const KEY_NOTIFICATIONS = 'notifications'

describe('popup-stack', () => {
  let sandbox
  let instance
  let dispatchSpy

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    dispatchSpy = sandbox.spy(store, 'dispatch')

    instance = await fixture(html`<zen-popup-stack></zen-popup-stack>`)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('renders', () => expect(instance).to.exist)

  it('does not have popups',
    () => expect(instance.getAttribute('haspopup')).to.not.exist)

  it('registers a reducer', () =>
    expect(dispatchSpy.calledWith(register(KEY_MAIN))).to.be.true)

  it('unregisters the reducer', () =>
    expect(dispatchSpy.calledWith(unregister(KEY_MAIN))).to.be.false)

  it('is unable to open a popup', () =>
    expect(openPopup('asdf')).to.be.rejected)

  context('when the key is changed', () => {
    beforeEach(async () => {
      instance.key = KEY_NOTIFICATIONS
      await instance.updateComplete
    })

    it('unregisters', () =>
      expect(dispatchSpy.calledWith(unregister(KEY_NOTIFICATIONS))))
  })

  context('when opening a popup without backdrop', () => {
    let blocker

    beforeEach(async () => {
      instance.renderers = RENDERER_POPUPS
      await instance.updateComplete

      openPopup({ key: POPUP_MESSAGE, useBlocker: false })
      await instance.updateComplete
      await instance.updateComplete

      blocker = instance.shadowRoot.getElementById(ID_BLOCKER)
    })

    it('does not render the backdrop', () =>
      expect(blocker).to.not.exist)
  })

  context('when opening a popup', () => {
    let popupElem

    const STATE = { message: 'state pushed' }

    beforeEach(async () => {
      instance.renderers = RENDERER_POPUPS
      await instance.updateComplete

      openPopup({ key: POPUP_MESSAGE, model: STATE })
      await instance.updateComplete
      await instance.updateComplete

      const blocker = instance.shadowRoot.getElementById(ID_BLOCKER)
      popupElem = blocker.firstElementChild
    })

    it('has popups', () => expect(instance.getAttribute('haspopup')).to.exist)

    it('passes model data to the popup', () =>
      expect(popupElem.model).to.eql(STATE))

    context('when dismissing the popup', () => {
      let dismissStub

      beforeEach(async () => {
        dismissStub = sandbox.stub(instance.__stack[0], 'dismiss')
        popupElem.__handlers.close()
        await instance.updateComplete
      })

      it('does not have popups',
        () => expect(instance.getAttribute('haspopup')).to.not.exist)

      it('dismisses the popup', () =>
        expect(dismissStub.calledOnce).to.be.true)
    })

    context('when another popup is pushed onto the stack', () => {
      beforeEach(async () => {
        openPopup(POPUP_MESSAGE)
        await instance.updateComplete
      })

      it('previous popup state is frozen', () =>
        expect(dispatchSpy.calledWithMatch(freeze)).to.be.true)

      context('when popup is popped from the stack', () => {
        beforeEach(async () => {
          popPopup()
          await instance.updateComplete
          await instance.updateComplete
          const blocker = instance.shadowRoot.getElementById(ID_BLOCKER)
          popupElem = blocker.firstElementChild
        })

        it('restores state to the previous popup', () =>
          expect(popupElem.restore.calledWith(STATE)).to.be.true)
      })
    })
  })
})
