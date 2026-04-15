import CSS from "$/v-scroll.js";

const MIN_BAR_HEIGHT = 16,
      BAR_MARGIN = 3,
      DISCONNECT_MAP = new WeakMap(),
      injectStyles = () => {
        if (document.head.querySelector('#v-scroll-style')) return;
        const style = document.createElement('style');
        style.id = 'v-scroll-style';
        style.textContent = CSS;
        document.head.appendChild(style);
      },
      createTemplate = () => {
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
      },
      initVScroll = (host) => {
        host.attachShadow({ mode: 'open' });
        host.shadowRoot.appendChild(createTemplate().content.cloneNode(true));
        
        const viewport = host.shadowRoot.querySelector('[part="viewport"]'),
              track = host.shadowRoot.querySelector('[part="track"]'),
              bar = host.shadowRoot.querySelector('[part="bar"]'),
              slot = host.shadowRoot.querySelector('slot');
              
        let is_dragging = false,
            start_y = 0,
            start_scroll_top = 0,
            max_bar_top = 0,
            max_scroll_top = 0,
            scroll_timeout = null;

        const handleTrackEnter = () => host.setAttribute('data-track-hover', ''),
              handleTrackLeave = () => host.removeAttribute('data-track-hover'),
              updateScrollbar = () => {
                if (!host.isConnected || is_dragging) return;
                
                requestAnimationFrame(() => {
                  if (!host.isConnected || is_dragging) return;
                  
                  const { clientHeight: client_height, scrollHeight: scroll_height, scrollTop: scroll_top } = viewport,
                        track_height = client_height;
                        
                  if (scroll_height <= client_height) {
                    track.style.display = 'none';
                    return;
                  }
                  
                  track.style.display = 'block';
                  
                  const max_scroll_top_calc = scroll_height - client_height,
                        available_track_height = track_height - (BAR_MARGIN * 2),
                        bar_height = Math.max((client_height / scroll_height) * available_track_height, MIN_BAR_HEIGHT),
                        max_bar_top_calc = available_track_height - bar_height,
                        scroll_ratio = scroll_top / max_scroll_top_calc,
                        bar_top = BAR_MARGIN + (scroll_ratio * max_bar_top_calc);
                        
                  bar.style.height = `${bar_height}px`;
                  bar.style.transform = `translateY(${bar_top}px)`;
                });
              },
              handleScroll = () => {
                updateScrollbar();
                host.setAttribute('data-scrolling', '');
                
                if (scroll_timeout) clearTimeout(scroll_timeout);
                scroll_timeout = setTimeout(() => {
                  host.removeAttribute('data-scrolling');
                }, 1000);
              },
              handlePointerMove = (e) => {
                if (!is_dragging) return;
                
                const delta_y = e.clientY - start_y,
                      scroll_delta = delta_y * (max_scroll_top / max_bar_top),
                      new_scroll_top = Math.max(0, Math.min(max_scroll_top, start_scroll_top + scroll_delta));
                      
                viewport.scrollTop = new_scroll_top;
                
                const scroll_ratio = new_scroll_top / max_scroll_top,
                      bar_top = BAR_MARGIN + (scroll_ratio * max_bar_top);
                      
                bar.style.transform = `translateY(${bar_top}px)`;
              },
              handlePointerUp = (e) => {
                if (!is_dragging) return;
                
                is_dragging = false;
                host.removeAttribute('data-dragging');
                
                bar.releasePointerCapture(e.pointerId);
                bar.removeEventListener('pointermove', handlePointerMove);
                bar.removeEventListener('pointerup', handlePointerUp);
                bar.removeEventListener('pointercancel', handlePointerUp);
                
                updateScrollbar();
              },
              handlePointerDown = (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                
                is_dragging = true;
                start_y = e.clientY;
                start_scroll_top = viewport.scrollTop;
                
                host.setAttribute('data-dragging', '');
                
                const { clientHeight: client_height, scrollHeight: scroll_height } = viewport,
                      available_track_height = client_height - (BAR_MARGIN * 2),
                      bar_height = Math.max((client_height / scroll_height) * available_track_height, MIN_BAR_HEIGHT);
                      
                max_bar_top = available_track_height - bar_height;
                max_scroll_top = scroll_height - client_height;
                
                bar.setPointerCapture(e.pointerId);
                bar.addEventListener('pointermove', handlePointerMove);
                bar.addEventListener('pointerup', handlePointerUp);
                bar.addEventListener('pointercancel', handlePointerUp);
              },
              resize_observer = new ResizeObserver(updateScrollbar),
              mutation_observer = new MutationObserver(updateScrollbar),
              observeAssignedNodes = () => {
                updateScrollbar();
                slot.assignedElements().forEach(el => resize_observer.observe(el));
              };

        injectStyles();
        
        viewport.addEventListener('scroll', handleScroll, { passive: true });
        bar.addEventListener('pointerdown', handlePointerDown);
        track.addEventListener('pointerenter', handleTrackEnter);
        track.addEventListener('pointerleave', handleTrackLeave);
        
        resize_observer.observe(viewport);
        slot.addEventListener('slotchange', observeAssignedNodes);
        mutation_observer.observe(host, { childList: true, subtree: true, characterData: true });
        
        requestAnimationFrame(observeAssignedNodes);

        return () => {
          viewport.removeEventListener('scroll', handleScroll);
          bar.removeEventListener('pointerdown', handlePointerDown);
          track.removeEventListener('pointerenter', handleTrackEnter);
          track.removeEventListener('pointerleave', handleTrackLeave);
          
          slot.removeEventListener('slotchange', observeAssignedNodes);
          
          if (scroll_timeout) clearTimeout(scroll_timeout);
          resize_observer.disconnect();
          mutation_observer.disconnect();
        };
      },
      processNodes = (nodes, action) => {
        nodes.forEach(node => {
          if (node.tagName === 'V-SCROLL') {
            action(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll('v-scroll').forEach(action);
          }
        });
      },
      initNodes = (nodes) => {
        processNodes(nodes, (node) => {
          if (!DISCONNECT_MAP.has(node)) {
            DISCONNECT_MAP.set(node, initVScroll(node));
          }
        });
      },
      destroyNodes = (nodes) => {
        processNodes(nodes, (node) => {
          const disconnect = DISCONNECT_MAP.get(node);
          if (disconnect) {
            disconnect();
            DISCONNECT_MAP.delete(node);
          }
        });
      },
      OBSERVER = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length) initNodes(Array.from(mutation.addedNodes));
          if (mutation.removedNodes.length) destroyNodes(Array.from(mutation.removedNodes));
        });
      }),
      startObserver = () => {
        OBSERVER.observe(document.body || document.documentElement, { childList: true, subtree: true });
        if (document.body) {
          initNodes([document.body]);
        } else {
          document.addEventListener('DOMContentLoaded', () => initNodes([document.body]));
        }
      };

startObserver();
