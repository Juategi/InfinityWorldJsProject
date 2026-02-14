export type NotificationType = 'success' | 'error' | 'info' | 'warning'

interface Notification {
  id: number
  type: NotificationType
  message: string
  timestamp: Date
}

const ICONS: Record<NotificationType, string> = {
  success: '&#10003;',  // checkmark
  error: '&#10007;',    // X
  info: '&#9432;',      // info circle
  warning: '&#9888;',   // warning triangle
}

const TYPE_CLASSES: Record<NotificationType, string> = {
  success: 'notif-success',
  error: 'notif-error',
  info: 'notif-info',
  warning: 'notif-warning',
}

const MAX_HISTORY = 50
const TOAST_DURATION = 3000
const TOAST_ANIMATION_MS = 300

export class NotificationManager {
  private history: Notification[] = []
  private nextId = 1
  private container: HTMLElement
  private historyPanel: HTMLElement
  private historyList: HTMLElement
  private badge: HTMLElement
  private unreadCount = 0

  constructor() {
    // Create toast container (stacks multiple toasts)
    this.container = document.createElement('div')
    this.container.id = 'notif-container'
    this.container.className = 'notif-container'
    document.body.appendChild(this.container)

    // Create history panel (hidden by default)
    this.historyPanel = document.createElement('div')
    this.historyPanel.id = 'notif-history-panel'
    this.historyPanel.className = 'notif-history-panel'
    this.historyPanel.innerHTML = `
      <div class="notif-history-header">
        <span>Notificaciones</span>
        <button class="notif-history-close">&times;</button>
      </div>
      <div class="notif-history-list" id="notif-history-list"></div>
    `
    this.historyPanel.style.display = 'none'
    document.body.appendChild(this.historyPanel)
    this.historyList = this.historyPanel.querySelector('#notif-history-list')!

    // Close button
    this.historyPanel.querySelector('.notif-history-close')!.addEventListener('click', () => {
      this.hideHistory()
    })

    // Create bell button in HUD (will be inserted by caller)
    this.badge = document.createElement('span')
    this.badge.className = 'notif-badge'
    this.badge.style.display = 'none'
  }

  /** Get the badge element to attach to a button */
  getBadge(): HTMLElement {
    return this.badge
  }

  /** Show a notification toast and add to history */
  notify(message: string, type: NotificationType = 'info'): void {
    const notif: Notification = {
      id: this.nextId++,
      type,
      message,
      timestamp: new Date(),
    }

    // Add to history
    this.history.unshift(notif)
    if (this.history.length > MAX_HISTORY) {
      this.history.pop()
    }

    // Update unread badge
    this.unreadCount++
    this.updateBadge()

    // Show toast
    this.showToast(notif)

    // Update history panel if visible
    if (this.historyPanel.style.display !== 'none') {
      this.renderHistory()
    }
  }

  private showToast(notif: Notification): void {
    const el = document.createElement('div')
    el.className = `notif-toast ${TYPE_CLASSES[notif.type]}`
    el.innerHTML = `
      <span class="notif-icon">${ICONS[notif.type]}</span>
      <span class="notif-message">${this.escapeHtml(notif.message)}</span>
    `

    this.container.appendChild(el)

    // Trigger animation
    requestAnimationFrame(() => {
      el.classList.add('visible')
    })

    // Auto-remove
    setTimeout(() => {
      el.classList.remove('visible')
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el)
      }, TOAST_ANIMATION_MS)
    }, TOAST_DURATION)
  }

  /** Toggle history panel */
  toggleHistory(): void {
    if (this.historyPanel.style.display === 'none') {
      this.showHistory()
    } else {
      this.hideHistory()
    }
  }

  showHistory(): void {
    this.renderHistory()
    this.historyPanel.style.display = 'flex'
    this.unreadCount = 0
    this.updateBadge()
  }

  hideHistory(): void {
    this.historyPanel.style.display = 'none'
  }

  private renderHistory(): void {
    if (this.history.length === 0) {
      this.historyList.innerHTML = '<div class="notif-empty">Sin notificaciones</div>'
      return
    }

    this.historyList.innerHTML = this.history.map(n => {
      const time = n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return `
        <div class="notif-history-item ${TYPE_CLASSES[n.type]}">
          <span class="notif-icon">${ICONS[n.type]}</span>
          <span class="notif-history-msg">${this.escapeHtml(n.message)}</span>
          <span class="notif-history-time">${time}</span>
        </div>
      `
    }).join('')
  }

  private updateBadge(): void {
    if (this.unreadCount > 0) {
      this.badge.textContent = this.unreadCount > 9 ? '9+' : String(this.unreadCount)
      this.badge.style.display = 'flex'
    } else {
      this.badge.style.display = 'none'
    }
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  getHistory(): readonly Notification[] {
    return this.history
  }
}

/** Global singleton */
export const notifications = new NotificationManager()
