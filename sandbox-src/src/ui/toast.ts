// ==============================================================================
// JACKAL SANDBOX — SISTEMA DE NOTIFICAÇÕES TOAST
// Notificações elegantes integradas à UI escura tática (sem alerts padrão do browser)
// ==============================================================================

export type ToastType = 'success' | 'info' | 'warning' | 'error';

class ToastNotificationManager {
  private container: HTMLElement | null = null;

  private ensureContainer(): HTMLElement {
    if (!this.container || !document.body.contains(this.container)) {
      this.container = document.createElement('div');
      this.container.id = 'jackal-toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
        max-width: 380px;
        width: calc(100vw - 40px);
      `;
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  public show(message: string, type: ToastType = 'info', durationMs = 4000): void {
    const container = this.ensureContainer();

    const toast = document.createElement('div');
    toast.className = 'glass-panel';
    toast.style.cssText = `
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      font-size: 12px;
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      border: 1px solid var(--border-color);
      color: #f1f5f9;
      animation: jk-toast-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transition: opacity 0.25s ease, transform 0.25s ease;
    `;

    let icon = 'ℹ️';
    let borderColor = 'var(--border-color)';
    let titleColor = '#38bdf8';

    if (type === 'success') {
      icon = '✓';
      borderColor = 'rgba(52, 211, 153, 0.5)';
      titleColor = '#34d399';
    } else if (type === 'error') {
      icon = '✕';
      borderColor = 'rgba(239, 68, 68, 0.5)';
      titleColor = '#ef4444';
    } else if (type === 'warning') {
      icon = '⚠';
      borderColor = 'rgba(245, 158, 11, 0.5)';
      titleColor = '#f59e0b';
    }

    toast.style.borderColor = borderColor;

    // Converte quebras de linha em <br>
    const formattedMsg = message.replace(/\n/g, '<br>');

    toast.innerHTML = `
      <div style="font-weight:900; font-size:14px; color:${titleColor}; line-height:1.2;">${icon}</div>
      <div style="flex:1; line-height:1.45; word-break:break-word; font-family:var(--font-sans);">${formattedMsg}</div>
      <button style="background:none; border:none; color:var(--text-dim); cursor:pointer; font-size:14px; padding:0 2px;" title="Fechar">✕</button>
    `;

    const btnClose = toast.querySelector('button');
    const dismiss = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px) scale(0.96)';
      setTimeout(() => toast.remove(), 250);
    };

    if (btnClose) btnClose.addEventListener('click', dismiss);

    container.appendChild(toast);

    if (durationMs > 0) {
      setTimeout(dismiss, durationMs);
    }
  }

  public success(message: string, durationMs?: number): void {
    this.show(message, 'success', durationMs);
  }

  public error(message: string, durationMs?: number): void {
    this.show(message, 'error', durationMs || 5000);
  }

  public info(message: string, durationMs?: number): void {
    this.show(message, 'info', durationMs);
  }

  public warning(message: string, durationMs?: number): void {
    this.show(message, 'warning', durationMs);
  }
}

export const toast = new ToastNotificationManager();
