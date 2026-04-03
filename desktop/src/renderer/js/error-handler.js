// ============================================================
// ASRP Desktop Global Error Handler — T-089
// Catches uncaught JS errors and unhandled promise rejections.
// Shows a friendly toast and logs to workspace/logs/error.log.
// ============================================================

(function () {
  'use strict';

  var MAX_TOAST_MSG_LEN = 120;

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
  }

  function showErrorToast(message) {
    // Use global showToast if available (defined in index.html)
    if (typeof window.showToast === 'function') {
      window.showToast(truncate(message, MAX_TOAST_MSG_LEN), 'error', 5000);
    } else if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show(truncate(message, MAX_TOAST_MSG_LEN), 'error', 5000);
    }
  }

  function logError(info) {
    // Send to main process for disk logging
    if (window.asrp && window.asrp.system && typeof window.asrp.system.logError === 'function') {
      window.asrp.system.logError(info).catch(function () { /* ignore */ });
    }
    // Also log to console
    console.error('[ASRP Error]', info);
  }

  // ---- window.onerror — catches synchronous JS errors ----
  var _prevOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    // Ignore cross-origin script errors (no useful info)
    if (message === 'Script error.' || !message) return false;

    var info = {
      type: 'uncaught-error',
      message: String(message),
      source: source || '',
      line: lineno || 0,
      col: colno || 0,
      stack: error && error.stack ? error.stack : '',
    };

    showErrorToast('JS Error: ' + info.message);
    logError(info);

    // Chain to prior handler if any
    if (typeof _prevOnError === 'function') {
      return _prevOnError.apply(this, arguments);
    }
    return false; // do not suppress default logging
  };

  // ---- unhandledrejection — catches async errors ----
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    var message = reason instanceof Error
      ? reason.message
      : (reason ? String(reason) : 'Unhandled promise rejection');

    var info = {
      type: 'unhandled-rejection',
      message: message,
      stack: reason instanceof Error && reason.stack ? reason.stack : '',
    };

    showErrorToast('Async Error: ' + info.message);
    logError(info);
  });

  // ---- Loading timeout helper (10 seconds) ----
  // Pages call window.startLoadTimeout(retryFn) and window.clearLoadTimeout()
  var _loadTimer = null;

  window.startLoadTimeout = function (onTimeout, ms) {
    clearTimeout(_loadTimer);
    _loadTimer = setTimeout(function () {
      onTimeout();
    }, ms || 10000);
  };

  window.clearLoadTimeout = function () {
    clearTimeout(_loadTimer);
    _loadTimer = null;
  };

  // ---- Retry banner helper ----
  // Usage: window.showRetryBanner(containerId, message, retryFn)
  window.showRetryBanner = function (containerId, message, retryFn) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = [
      '<div style="text-align:center;padding:40px 20px;color:var(--text-tertiary)">',
      '  <div style="font-size:32px;margin-bottom:12px">⚠️</div>',
      '  <div style="font-size:14px;margin-bottom:16px">' + (message || 'Unable to load data.') + '</div>',
      '  <button class="btn btn-outline btn-sm" id="retry-btn-' + containerId + '">Retry</button>',
      '</div>',
    ].join('');
    var btn = document.getElementById('retry-btn-' + containerId);
    if (btn && typeof retryFn === 'function') {
      btn.addEventListener('click', function () { retryFn(); });
    }
  };

  // ---- Empty state helper ----
  // Usage: window.showEmptyState(containerId, icon, title, message, actionLabel, actionFn)
  window.showEmptyState = function (containerId, icon, title, message, actionLabel, actionFn) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var actionHtml = (actionLabel && typeof actionFn === 'function')
      ? '<button class="btn btn-primary btn-sm" id="empty-action-' + containerId + '">' + actionLabel + '</button>'
      : '';
    el.innerHTML = [
      '<div class="empty-state">',
      '  <span class="icon">' + (icon || '📭') + '</span>',
      '  <h3>' + (title || 'Nothing here yet') + '</h3>',
      '  <p>' + (message || '') + '</p>',
      '  ' + actionHtml,
      '</div>',
    ].join('');
    if (actionLabel && typeof actionFn === 'function') {
      var btn = document.getElementById('empty-action-' + containerId);
      if (btn) btn.addEventListener('click', function () { actionFn(); });
    }
  };

})();
