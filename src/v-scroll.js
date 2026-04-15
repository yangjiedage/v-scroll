import CSS from "$/v-scroll.js";

const MIN_BAR_HEIGHT = 16, BAR_MARGIN = 3;

const injectStyles = () => {
  if (document.head.querySelector('#v-scroll-style')) return;
  const style = document.createElement('style');
  style.id = 'v-scroll-style';
  style.textContent = CSS;
  document.head.appendChild(style);
};

const createTemplate = () => {
  const template = document.createElement('template');
  template.innerHTML = `
    <div part="viewport">
      <slot></slot>
    </div>
    <div part="track">
      <b part="bar"></b>
    </div>
  `;
  return template;
};

class VScroll extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(createTemplate().content.cloneNode(true));
    
    this._viewport = this.shadowRoot.querySelector('[part="viewport"]');
    this._track = this.shadowRoot.querySelector('[part="track"]');
    this._bar = this.shadowRoot.querySelector('[part="bar"]');
    
    this._isDragging = false;
    this._startY = 0;
    this._startScrollTop = 0;
    
    this._resizeObserver = null;
    this._mutationObserver = null;
    
    this._scrollTimeout = null;
    
    this.handleScroll = this.handleScroll.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.updateScrollbar = this.updateScrollbar.bind(this);
    this.handleTrackEnter = this.handleTrackEnter.bind(this);
    this.handleTrackLeave = this.handleTrackLeave.bind(this);
  }

  handleTrackEnter() {
    this.setAttribute('data-track-hover', '');
  }

  handleTrackLeave() {
    this.removeAttribute('data-track-hover');
  }

  connectedCallback() {
    injectStyles();
    
    this._viewport.addEventListener('scroll', this.handleScroll, { passive: true });
    this._bar.addEventListener('pointerdown', this.handlePointerDown);
    this._track.addEventListener('pointerenter', this.handleTrackEnter);
    this._track.addEventListener('pointerleave', this.handleTrackLeave);
    
    this._resizeObserver = new ResizeObserver(this.updateScrollbar);
    this._resizeObserver.observe(this._viewport);
    
    const slot = this.shadowRoot.querySelector('slot');
    
    this._observeAssignedNodes = () => {
      this.updateScrollbar();
      slot.assignedElements().forEach(el => this._resizeObserver.observe(el));
    };
    
    slot.addEventListener('slotchange', this._observeAssignedNodes);
    
    this._mutationObserver = new MutationObserver(this.updateScrollbar);
    this._mutationObserver.observe(this, { childList: true, subtree: true, characterData: true });
    
    // Initial update
    requestAnimationFrame(this._observeAssignedNodes);
  }

  disconnectedCallback() {
    this._viewport.removeEventListener('scroll', this.handleScroll);
    this._bar.removeEventListener('pointerdown', this.handlePointerDown);
    this._track.removeEventListener('pointerenter', this.handleTrackEnter);
    this._track.removeEventListener('pointerleave', this.handleTrackLeave);
    this._bar.removeEventListener('pointermove', this.handlePointerMove);
    this._bar.removeEventListener('pointerup', this.handlePointerUp);
    this._bar.removeEventListener('pointercancel', this.handlePointerUp);
    
    const slot = this.shadowRoot.querySelector('slot');
    slot.removeEventListener('slotchange', this._observeAssignedNodes);
    
    if (this._scrollTimeout) {
      clearTimeout(this._scrollTimeout);
      this._scrollTimeout = null;
    }
    
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    
    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
      this._mutationObserver = null;
    }
  }

  updateScrollbar() {
    if (!this.isConnected) return;
    
    // 如果正在拖拽，滚动条的位置更新由 handlePointerMove 直接接管，
    // 防止 requestAnimationFrame 中的延迟更新导致抖动
    if (this._isDragging) return;
    
    // Use requestAnimationFrame to ensure DOM is updated before calculating sizes
    requestAnimationFrame(() => {
      if (!this.isConnected || this._isDragging) return;
      
      const { clientHeight, scrollHeight, scrollTop } = this._viewport;
      const trackHeight = clientHeight;
      
      if (scrollHeight <= clientHeight) {
        this._track.style.display = 'none';
        return;
      }
      
      this._track.style.display = 'block';
      
      const maxScrollTop = scrollHeight - clientHeight;
      const availableTrackHeight = trackHeight - (BAR_MARGIN * 2);
      
      let barHeight = Math.max((clientHeight / scrollHeight) * availableTrackHeight, MIN_BAR_HEIGHT);
      
      const maxBarTop = availableTrackHeight - barHeight;
      const scrollRatio = scrollTop / maxScrollTop;
      const barTop = BAR_MARGIN + (scrollRatio * maxBarTop);
      
      this._bar.style.height = `${barHeight}px`;
      this._bar.style.transform = `translateY(${barTop}px)`;
    });
  }

  handleScroll() {
    this.updateScrollbar();
    
    // Add scrolling attribute to show bar
    this.setAttribute('data-scrolling', '');
    
    if (this._scrollTimeout) {
      clearTimeout(this._scrollTimeout);
    }
    
    // Hide bar after scrolling stops
    this._scrollTimeout = setTimeout(() => {
      this.removeAttribute('data-scrolling');
    }, 1000);
  }

  handlePointerDown(e) {
    if (e.button !== 0) return; // Only left click
    
    // Prevent default to stop text selection and other side effects during drag
    e.preventDefault();
    
    this._isDragging = true;
    this._startY = e.clientY;
    this._startScrollTop = this._viewport.scrollTop;
    
    this.setAttribute('data-dragging', '');
    
    console.log('handlePointerDown', this._startY, this._startScrollTop);
    
    // Cache calculations for smoother move events
    const { clientHeight, scrollHeight } = this._viewport;
    const availableTrackHeight = clientHeight - (BAR_MARGIN * 2);
    let barHeight = Math.max((clientHeight / scrollHeight) * availableTrackHeight, MIN_BAR_HEIGHT);
    
    this._maxBarTop = availableTrackHeight - barHeight;
    this._maxScrollTop = scrollHeight - clientHeight;
    
    this._bar.setPointerCapture(e.pointerId);
    this._bar.addEventListener('pointermove', this.handlePointerMove);
    this._bar.addEventListener('pointerup', this.handlePointerUp);
    this._bar.addEventListener('pointercancel', this.handlePointerUp);
  }

  handlePointerMove(e) {
    if (!this._isDragging) return;
    
    const deltaY = e.clientY - this._startY;
    
    // Calculate new scroll top with bounds using cached values
    const scrollDelta = deltaY * (this._maxScrollTop / this._maxBarTop);
    const newScrollTop = Math.max(0, Math.min(this._maxScrollTop, this._startScrollTop + scrollDelta));
    
    // Update viewport scroll synchronously for immediate visual feedback of content
    this._viewport.scrollTop = newScrollTop;
    
    // Update bar position synchronously for immediate visual feedback of the scrollbar
    const scrollRatio = newScrollTop / this._maxScrollTop;
    const barTop = BAR_MARGIN + (scrollRatio * this._maxBarTop);
    this._bar.style.transform = `translateY(${barTop}px)`;
  }

  handlePointerUp(e) {
    if (!this._isDragging) return;
    
    this._isDragging = false;
    this.removeAttribute('data-dragging');
    
    this._bar.releasePointerCapture(e.pointerId);
    this._bar.removeEventListener('pointermove', this.handlePointerMove);
    this._bar.removeEventListener('pointerup', this.handlePointerUp);
    this._bar.removeEventListener('pointercancel', this.handlePointerUp);
    
    // 清除缓存变量
    this._maxBarTop = null;
    this._maxScrollTop = null;
    
    // Ensure final state is perfectly synchronized
    this.updateScrollbar();
  }
}

customElements.define('v-scroll', VScroll);
