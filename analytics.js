(function(){
  class Analytics {
    constructor(config){
      this.config = config || {};
      this.queue = [];
      this.sessionId = this._generateId();
      this.userAgent = navigator.userAgent;
      this.page = location.pathname;
      this.enabled = !!this.config.LOG_ENDPOINT;
      this.flushTimer = null;
      this.start();
    }

    start(){
      if(this.enabled){
        this.flushTimer = setInterval(()=>this.flush(), this.config.SEND_INTERVAL_MS || 5000);
      }
    }

    stop(){
      if(this.flushTimer){
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }
    }

    pageView(){
      this.track('page_view', { referrer: document.referrer || null });
      this.flush();
    }

    track(eventName, payload){
      const evt = {
        appId: this.config.APP_ID || 'app',
        sessionId: this.sessionId,
        event: eventName,
        payload: payload || {},
        ts: Date.now(),
        page: this.page,
        ua: this.userAgent,
      };
      if(this.enabled){
        this.queue.push(evt);
      } else {
        // Fallback a consola si no hay endpoint
        console.info('[Analytics]', evt);
      }
    }

    flush(){
      if(!this.enabled || this.queue.length === 0) return;
      const batch = this.queue.splice(0, this.queue.length);
      const body = JSON.stringify({ events: batch });

      // Intentar enviar con sendBeacon
      if(navigator.sendBeacon){
        const sent = navigator.sendBeacon(this.config.LOG_ENDPOINT, new Blob([body], { type: 'application/json' }));
        if(!sent){
          // Fallback a fetch si beacon falla
          this._postFetch(body);
        }
      } else {
        this._postFetch(body);
      }
    }

    async _postFetch(body){
      try{
        await fetch(this.config.LOG_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        });
      } catch(e){
        // No romper la app por errores de red
        console.warn('[Analytics] envío fallido:', e);
      }
    }

    _generateId(){
      return 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  }

  // Exponer en window
  window.Analytics = Analytics;
  window.analytics = new Analytics(window.APP_CONFIG || {});
})();