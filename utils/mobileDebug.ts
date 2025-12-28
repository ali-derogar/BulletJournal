/**
 * Mobile Debug Utility
 * Shows JavaScript errors on mobile devices
 */

if (typeof window !== 'undefined') {
  // Capture console errors and display them on screen for mobile debugging
  const originalError = console.error;
  const originalWarn = console.warn;

  let errorLog: string[] = [];
  let errorDisplay: HTMLDivElement | null = null;

  const showErrorOnScreen = (message: string, type: 'error' | 'warn') => {
    errorLog.push(`[${type.toUpperCase()}] ${message}`);

    // Create error display if it doesn't exist
    if (!errorDisplay) {
      errorDisplay = document.createElement('div');
      errorDisplay.id = 'mobile-debug-console';
      errorDisplay.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        max-height: 200px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.95);
        color: #fff;
        font-family: monospace;
        font-size: 10px;
        padding: 10px;
        z-index: 99999;
        border-top: 2px solid ${type === 'error' ? '#ef4444' : '#f59e0b'};
        display: none;
      `;
      document.body.appendChild(errorDisplay);

      // Add close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ Close';
      closeBtn.style.cssText = `
        position: sticky;
        top: 0;
        right: 0;
        background: #ef4444;
        color: white;
        border: none;
        padding: 5px 10px;
        margin-bottom: 5px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        float: right;
      `;
      closeBtn.onclick = () => {
        if (errorDisplay) {
          errorDisplay.style.display = 'none';
        }
      };
      errorDisplay.appendChild(closeBtn);
    }

    errorDisplay.style.display = 'block';
    const logEntry = document.createElement('div');
    logEntry.style.cssText = `
      padding: 4px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: ${type === 'error' ? '#ef4444' : '#f59e0b'};
    `;
    logEntry.textContent = message;
    errorDisplay.appendChild(logEntry);

    // Scroll to bottom
    errorDisplay.scrollTop = errorDisplay.scrollHeight;
  };

  console.error = function(...args) {
    originalError.apply(console, args);
    const message = args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack}`;
      }
      return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    }).join(' ');
    showErrorOnScreen(message, 'error');
  };

  console.warn = function(...args) {
    originalWarn.apply(console, args);
    const message = args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack}`;
      }
      return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    }).join(' ');
    showErrorOnScreen(message, 'warn');
  };

  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    showErrorOnScreen(
      `Unhandled Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
      'error'
    );
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    showErrorOnScreen(
      `Unhandled Promise Rejection: ${event.reason}`,
      'error'
    );
  });

  // Add debug info button
  const addDebugButton = () => {
    const debugBtn = document.createElement('button');
    debugBtn.textContent = '🐛';
    debugBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      font-size: 24px;
      cursor: pointer;
      z-index: 99998;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    debugBtn.onclick = () => {
      if (errorDisplay) {
        errorDisplay.style.display = errorDisplay.style.display === 'none' ? 'block' : 'none';
      }
    };

    // Only show on mobile
    if (window.innerWidth < 768) {
      document.body.appendChild(debugBtn);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDebugButton);
  } else {
    addDebugButton();
  }

  console.log('🐛 Mobile Debug Mode Enabled');
  console.log('📱 Device:', navigator.userAgent);
  console.log('🌐 Window size:', window.innerWidth, 'x', window.innerHeight);
}

export {};
