import { notifications } from './NotificationManager'
import { t } from '../i18n'

const STORAGE_KEY = 'iw_tutorial_done'

interface TutorialStep {
  id: string
  titleKey: string
  messageKey: string
  /** CSS selector of element to highlight (optional) */
  target?: string
  /** Position of tooltip relative to target */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** Wait for this event before auto-advancing */
  waitForEvent?: string
  /** Auto-advance after this many ms (if no waitForEvent) */
  autoAdvanceMs?: number
}

const STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    titleKey: 'tutorial.welcome.title',
    messageKey: 'tutorial.welcome.msg',
    autoAdvanceMs: 4000,
  },
  {
    id: 'buy_parcel',
    titleKey: 'tutorial.buyParcel.title',
    messageKey: 'tutorial.buyParcel.msg',
    waitForEvent: 'parcelBought',
  },
  {
    id: 'edit_mode',
    titleKey: 'tutorial.editMode.title',
    messageKey: 'tutorial.editMode.msg',
    waitForEvent: 'gameModeChange',
  },
  {
    id: 'place_building',
    titleKey: 'tutorial.placeBuilding.title',
    messageKey: 'tutorial.placeBuilding.msg',
    target: '#build-panel',
    position: 'top',
    waitForEvent: 'buildingPlaced',
    autoAdvanceMs: 15000,
  },
  {
    id: 'done',
    titleKey: 'tutorial.done.title',
    messageKey: 'tutorial.done.msg',
    autoAdvanceMs: 4000,
  },
]

export class TutorialManager {
  private currentStep = 0
  private overlay: HTMLElement | null = null
  private tooltip: HTMLElement | null = null
  private active = false
  private eventListeners: Array<{ event: string; handler: EventListener }> = []

  /** Check if tutorial should start (first-time player) */
  shouldStart(): boolean {
    return !localStorage.getItem(STORAGE_KEY)
  }

  /** Start the tutorial sequence */
  start(): void {
    if (!this.shouldStart()) return
    this.active = true
    this.currentStep = 0
    this.createOverlay()
    this.showStep()
  }

  /** Skip / end the tutorial */
  skip(): void {
    this.active = false
    this.cleanup()
    localStorage.setItem(STORAGE_KEY, '1')
  }

  private createOverlay(): void {
    // Semi-transparent overlay
    this.overlay = document.createElement('div')
    this.overlay.className = 'tutorial-overlay'
    this.overlay.innerHTML = `
      <div class="tutorial-tooltip" id="tutorial-tooltip">
        <div class="tutorial-title"></div>
        <div class="tutorial-message"></div>
        <div class="tutorial-actions">
          <button class="tutorial-btn tutorial-skip">${t('tutorial.skip')}</button>
          <button class="tutorial-btn tutorial-next">${t('tutorial.next')}</button>
        </div>
        <div class="tutorial-progress"></div>
      </div>
    `
    document.body.appendChild(this.overlay)
    this.tooltip = this.overlay.querySelector('#tutorial-tooltip')!

    // Skip button
    this.overlay.querySelector('.tutorial-skip')!.addEventListener('click', () => {
      this.skip()
    })

    // Next button
    this.overlay.querySelector('.tutorial-next')!.addEventListener('click', () => {
      this.advance()
    })
  }

  private showStep(): void {
    if (!this.active || this.currentStep >= STEPS.length) {
      this.complete()
      return
    }

    const step = STEPS[this.currentStep]
    const title = this.tooltip!.querySelector('.tutorial-title')!
    const message = this.tooltip!.querySelector('.tutorial-message')!
    const progress = this.tooltip!.querySelector('.tutorial-progress')!
    const nextBtn = this.tooltip!.querySelector('.tutorial-next') as HTMLButtonElement

    title.textContent = t(step.titleKey)
    message.textContent = t(step.messageKey)
    progress.textContent = `${this.currentStep + 1} / ${STEPS.length}`

    // Show/hide next button based on whether we wait for an event
    if (step.waitForEvent) {
      nextBtn.style.display = 'none'
      this.waitForEvent(step.waitForEvent)
    } else {
      nextBtn.style.display = 'inline-block'
    }

    // Auto-advance
    if (step.autoAdvanceMs && !step.waitForEvent) {
      setTimeout(() => {
        if (this.active && this.currentStep === STEPS.indexOf(step)) {
          this.advance()
        }
      }, step.autoAdvanceMs)
    }

    // Fallback auto-advance for event-based steps
    if (step.autoAdvanceMs && step.waitForEvent) {
      setTimeout(() => {
        if (this.active && this.currentStep === STEPS.indexOf(step)) {
          this.advance()
        }
      }, step.autoAdvanceMs)
    }

    // Position tooltip near target if specified
    if (step.target) {
      const targetEl = document.querySelector(step.target) as HTMLElement
      if (targetEl) {
        this.positionTooltip(targetEl, step.position || 'top')
      }
    } else {
      // Center on screen
      this.tooltip!.style.position = 'fixed'
      this.tooltip!.style.top = '50%'
      this.tooltip!.style.left = '50%'
      this.tooltip!.style.transform = 'translate(-50%, -50%)'
    }

    // Notify
    notifications.notify(t(step.messageKey), 'info')
  }

  private positionTooltip(target: HTMLElement, position: string): void {
    const rect = target.getBoundingClientRect()
    const tt = this.tooltip!
    tt.style.position = 'fixed'
    tt.style.transform = 'none'

    switch (position) {
      case 'top':
        tt.style.bottom = `${window.innerHeight - rect.top + 12}px`
        tt.style.left = `${rect.left + rect.width / 2 - 150}px`
        tt.style.top = 'auto'
        break
      case 'bottom':
        tt.style.top = `${rect.bottom + 12}px`
        tt.style.left = `${rect.left + rect.width / 2 - 150}px`
        break
      case 'left':
        tt.style.top = `${rect.top}px`
        tt.style.left = `${rect.left - 320}px`
        break
      case 'right':
        tt.style.top = `${rect.top}px`
        tt.style.left = `${rect.right + 12}px`
        break
    }
  }

  private waitForEvent(eventName: string): void {
    const handler = (() => {
      // Small delay so the user sees the result
      setTimeout(() => {
        if (this.active) this.advance()
      }, 800)
    }) as EventListener
    document.addEventListener(eventName, handler, { once: true })
    this.eventListeners.push({ event: eventName, handler })
  }

  private advance(): void {
    this.currentStep++
    if (this.currentStep >= STEPS.length) {
      this.complete()
    } else {
      this.showStep()
    }
  }

  private complete(): void {
    this.active = false
    localStorage.setItem(STORAGE_KEY, '1')
    this.cleanup()
  }

  private cleanup(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }
    this.overlay = null
    this.tooltip = null

    // Remove any lingering event listeners
    for (const { event, handler } of this.eventListeners) {
      document.removeEventListener(event, handler)
    }
    this.eventListeners = []
  }
}

export const tutorial = new TutorialManager()
